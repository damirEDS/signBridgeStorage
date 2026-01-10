"""File operations endpoints."""
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status, Depends, Form
from app.models.enums import Handshape
from fastapi.responses import StreamingResponse
import io

from app.core.s3 import s3_client
from app.models import schemas
from app.api import deps
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.config import settings
from app.utils.validators import validate_file_extension, validate_file_size

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["files"])


@router.post(
    "/upload",
    response_model=schemas.FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file to S3 storage and create Asset record",
    responses={
        413: {"model": schemas.ErrorResponse, "description": "File too large"},
        415: {"model": schemas.ErrorResponse, "description": "Unsupported file type"}
    }
)
async def upload_file(
    file: UploadFile = File(..., description="File to upload"),
    transition_in: Optional[str] = Form(None), # Keep as str to allow validation or use Enum directly if FastAPI supports Form(Enum) well, but str is safer for Form
    transition_out: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(deps.get_current_user)
) -> schemas.FileUploadResponse:
    """
    Upload a file to S3 storage and create AnimationAsset record.
    Calculates MD5 hash for deduplication.
    """
    import hashlib
    
    try:
        # Validate file extension
        if not validate_file_extension(file.filename):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"File type not allowed. Allowed types: {', '.join(settings.allowed_file_extensions_list)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size
        if not validate_file_size(len(content)):
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB"
            )
            
        # Calculate MD5
        md5_hash = hashlib.md5(content).hexdigest()
        
        # Check for duplicates in DB
        from app.models.cms import AnimationAsset
        from sqlalchemy.future import select
        
        result = await db.execute(select(AnimationAsset).filter(AnimationAsset.file_hash == md5_hash))
        existing_asset = result.scalars().first()
        
        if existing_asset:
             # Extract key from URL or use placeholder (duplicate assets share the same physical file)
             # Basic extraction assuming standard URL structure
             key = existing_asset.file_url.split('/')[-1] 
             
             return schemas.FileUploadResponse(
                success=True,
                bucket=settings.s3_bucket_name,
                file_key=key, # Approximation, but sufficient for linking
                url=existing_asset.file_url,
                message="File already exists (deduplicated)"
            )
        
        # Generate file key
        file_key = f"uploads/{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid.uuid4()}_{file.filename}"
        
        # Upload to S3
        file_obj = io.BytesIO(content)
        result = await s3_client.upload_file(
            file_data=file_obj,
            file_key=file_key,
            content_type=file.content_type,
            metadata={
                "original_filename": file.filename,
                "md5_hash": md5_hash
            }
        )
        
        # Parse Metadata (if VRMA/GLB)
        file_ext = file.filename.split('.')[-1].lower()
        metadata = {}
        if file_ext in ['vrma', 'glb', 'gltf']:
             from app.utils.vrma_parser import extract_vrma_metadata
             try:
                 metadata = extract_vrma_metadata(content)
                 logger.info(f"Metadata extracted for {file.filename}: {metadata}")
             except Exception as e:
                 logger.error(f"Error extracting metadata in endpoint: {e}")

        # Validate Enums
        if transition_in:
            try:
                Handshape(transition_in)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid transition_in value. Must be one of: {[e.value for e in Handshape]}")
                
        if transition_out:
            try:
                Handshape(transition_out)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid transition_out value. Must be one of: {[e.value for e in Handshape]}")

        # Create DB Asset
        new_asset = AnimationAsset(
            file_url=result['url'],
            file_hash=md5_hash,
            duration=metadata.get('duration'),
            framerate=metadata.get('framerate'),
            frame_count=metadata.get('frame_count'),
            transition_in=transition_in,
            transition_out=transition_out,
        )
        db.add(new_asset)
        await db.commit()
        await db.refresh(new_asset)
        
        return schemas.FileUploadResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.get(
    "/download",
    summary="Download a file from S3 storage",
    responses={
        404: {"model": schemas.ErrorResponse, "description": "File not found"}
    }
)
async def download_file(file_key: str) -> StreamingResponse:
    """
    Download a file from S3 storage.
    
    - **file_key**: S3 object key (file path) - passed as query parameter
    
    Returns the file as a streaming response.
    
    Example: GET /api/v1/files/download?file_key=uploads/2024/01/08/test.txt
    """
    try:
        content = await s3_client.download_file(file_key)
        
        # Get filename from key
        filename = file_key.split('/')[-1]
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Error downloading file {file_key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_key}"
        )


@router.delete(
    "/delete",
    response_model=schemas.FileDeleteResponse,
    summary="Delete a file from S3 storage",
    responses={
        404: {"model": schemas.ErrorResponse, "description": "File not found"}
    }
)
async def delete_file(file_key: str) -> schemas.FileDeleteResponse:
    """
    Delete a file from S3 storage.
    
    - **file_key**: S3 object key (file path) - passed as query parameter
    
    Returns confirmation of deletion.
    
    Example: DELETE /api/v1/files/delete?file_key=uploads/2024/01/08/test.txt
    """
    try:
        result = await s3_client.delete_file(file_key)
        return schemas.FileDeleteResponse(**result)
        
    except Exception as e:
        logger.error(f"Error deleting file {file_key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to delete file: {file_key}"
        )


@router.get(
    "/",
    response_model=schemas.FileListResponse,
    summary="List files in S3 storage"
)
async def list_files(
    prefix: str = Query("", description="Filter by prefix (folder path)"),
    max_keys: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    continuation_token: Optional[str] = Query(None, description="Token for pagination")
) -> schemas.FileListResponse:
    """
    List files in S3 storage with pagination support.
    
    - **prefix**: Filter files by prefix (e.g., 'uploads/2024/')
    - **max_keys**: Maximum number of files to return (1-1000)
    - **continuation_token**: Token for fetching next page
    
    Returns list of files with metadata and pagination info.
    """
    try:
        result = await s3_client.list_files(
            prefix=prefix,
            max_keys=max_keys,
            continuation_token=continuation_token
        )
        
        # Convert to FileMetadata objects
        files = [schemas.FileMetadata(**file_data) for file_data in result['files']]
        
        return schemas.FileListResponse(
            files=files,
            count=result['count'],
            is_truncated=result['is_truncated'],
            next_token=result.get('next_token')
        )
        
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list files: {str(e)}"
        )


@router.get(
    "/metadata",
    response_model=schemas.FileMetadata,
    summary="Get file metadata",
    responses={
        404: {"model": schemas.ErrorResponse, "description": "File not found"}
    }
)
async def get_file_metadata(file_key: str) -> schemas.FileMetadata:
    """
    Get metadata for a specific file.
    
    - **file_key**: S3 object key (file path) - passed as query parameter
    
    Returns file metadata including size, content type, and last modified date.
    
    Example: GET /api/v1/files/metadata?file_key=uploads/2024/01/08/test.txt
    """
    try:
        metadata = await s3_client.get_file_metadata(file_key)
        return schemas.FileMetadata(**metadata)
        
    except Exception as e:
        logger.error(f"Error getting metadata for {file_key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_key}"
        )


@router.post(
    "/presigned-url",
    response_model=schemas.PresignedUrlResponse,
    summary="Generate presigned URL for direct file access"
)
async def generate_presigned_url(
    request: schemas.PresignedUrlRequest
) -> schemas.PresignedUrlResponse:
    """
    Generate a presigned URL for direct file upload or download.
    
    - **file_key**: S3 object key (file path)
    - **expiration**: URL expiration time in seconds (60-604800)
    - **http_method**: GET for download, PUT for upload
    
    Returns a temporary URL that can be used without authentication.
    """
    try:
        url = await s3_client.generate_presigned_url(
            file_key=request.file_key,
            expiration=request.expiration,
            http_method=request.http_method
        )
        
        return schemas.PresignedUrlResponse(
            url=url,
            file_key=request.file_key,
            expiration=request.expiration,
            http_method=request.http_method
        )
        
    except Exception as e:
        logger.error(f"Error generating presigned URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned URL: {str(e)}"
        )
