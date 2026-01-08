"""File operations endpoints."""
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status
from fastapi.responses import StreamingResponse
import io

from app.core.s3 import s3_client
from app.models.schemas import (
    FileUploadResponse,
    FileListResponse,
    FileDeleteResponse,
    FileMetadata,
    PresignedUrlRequest,
    PresignedUrlResponse,
    ErrorResponse
)
from app.config import settings
from app.utils.validators import validate_file_extension, validate_file_size

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["files"])


@router.post(
    "/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file to S3 storage",
    responses={
        413: {"model": ErrorResponse, "description": "File too large"},
        415: {"model": ErrorResponse, "description": "Unsupported file type"}
    }
)
async def upload_file(
    file: UploadFile = File(..., description="File to upload")
) -> FileUploadResponse:
    """
    Upload a file to S3 storage.
    
    - **file**: File to upload (multipart/form-data)
    
    Returns information about the uploaded file including its URL.
    """
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
        
        # Generate file key (you can customize this logic)
        file_key = f"uploads/{datetime.utcnow().strftime('%Y/%m/%d')}/{file.filename}"
        
        # Upload to S3
        file_obj = io.BytesIO(content)
        result = await s3_client.upload_file(
            file_data=file_obj,
            file_key=file_key,
            content_type=file.content_type,
            metadata={
                "original_filename": file.filename or "unknown",
                "upload_timestamp": datetime.utcnow().isoformat()
            }
        )
        
        return FileUploadResponse(**result)
        
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
        404: {"model": ErrorResponse, "description": "File not found"}
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
    response_model=FileDeleteResponse,
    summary="Delete a file from S3 storage",
    responses={
        404: {"model": ErrorResponse, "description": "File not found"}
    }
)
async def delete_file(file_key: str) -> FileDeleteResponse:
    """
    Delete a file from S3 storage.
    
    - **file_key**: S3 object key (file path) - passed as query parameter
    
    Returns confirmation of deletion.
    
    Example: DELETE /api/v1/files/delete?file_key=uploads/2024/01/08/test.txt
    """
    try:
        result = await s3_client.delete_file(file_key)
        return FileDeleteResponse(**result)
        
    except Exception as e:
        logger.error(f"Error deleting file {file_key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to delete file: {file_key}"
        )


@router.get(
    "/",
    response_model=FileListResponse,
    summary="List files in S3 storage"
)
async def list_files(
    prefix: str = Query("", description="Filter by prefix (folder path)"),
    max_keys: int = Query(100, ge=1, le=1000, description="Maximum number of files to return"),
    continuation_token: Optional[str] = Query(None, description="Token for pagination")
) -> FileListResponse:
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
        files = [FileMetadata(**file_data) for file_data in result['files']]
        
        return FileListResponse(
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
    response_model=FileMetadata,
    summary="Get file metadata",
    responses={
        404: {"model": ErrorResponse, "description": "File not found"}
    }
)
async def get_file_metadata(file_key: str) -> FileMetadata:
    """
    Get metadata for a specific file.
    
    - **file_key**: S3 object key (file path) - passed as query parameter
    
    Returns file metadata including size, content type, and last modified date.
    
    Example: GET /api/v1/files/metadata?file_key=uploads/2024/01/08/test.txt
    """
    try:
        metadata = await s3_client.get_file_metadata(file_key)
        return FileMetadata(**metadata)
        
    except Exception as e:
        logger.error(f"Error getting metadata for {file_key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_key}"
        )


@router.post(
    "/presigned-url",
    response_model=PresignedUrlResponse,
    summary="Generate presigned URL for direct file access"
)
async def generate_presigned_url(
    request: PresignedUrlRequest
) -> PresignedUrlResponse:
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
        
        return PresignedUrlResponse(
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
