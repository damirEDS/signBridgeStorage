from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.cms import Gloss, SignLanguage, SignVariant, AnimationAsset
from app.models import schemas

router = APIRouter()

# --- Glosses ---

@router.post("/glosses", response_model=schemas.GlossResponse, status_code=status.HTTP_201_CREATED)
async def create_gloss(
    gloss: schemas.GlossCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user)
):
    """Create a new gloss."""
    new_gloss = Gloss(**gloss.model_dump())
    db.add(new_gloss)
    await db.commit()
    await db.refresh(new_gloss)
    return new_gloss

@router.get("/glosses", response_model=List[schemas.GlossResponse])
async def list_glosses(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db)
):
    """List glosses with optional search."""
    query = select(Gloss)
    if search:
        query = query.filter(Gloss.name.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/glosses/{gloss_id}", response_model=schemas.GlossResponse)
async def get_gloss(
    gloss_id: int,
    db: AsyncSession = Depends(deps.get_db)
):
    """Get distinct gloss."""
    result = await db.execute(select(Gloss).filter(Gloss.id == gloss_id))
    gloss = result.scalars().first()
    if not gloss:
        raise HTTPException(status_code=404, detail="Gloss not found")
    return gloss

# --- Sign Languages ---

@router.post("/languages", response_model=schemas.SignLanguageResponse, status_code=status.HTTP_201_CREATED)
async def create_language(
    lang: schemas.SignLanguageCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user)
):
    """Create a new sign language."""
    new_lang = SignLanguage(**lang.model_dump())
    db.add(new_lang)
    await db.commit()
    await db.refresh(new_lang)
    return new_lang

@router.get("/languages", response_model=List[schemas.SignLanguageResponse])
async def list_languages(db: AsyncSession = Depends(deps.get_db)):
    """List all sign languages."""
    result = await db.execute(select(SignLanguage))
    return result.scalars().all()

# --- Sign Variants ---

@router.post("/variants", response_model=schemas.SignVariantResponse, status_code=status.HTTP_201_CREATED)
async def create_variant(
    variant: schemas.SignVariantCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user)
):
    """Link a gloss to an asset in a language."""
    # Verify existence
    gloss_exists = await db.execute(select(Gloss).filter(Gloss.id == variant.gloss_id))
    if not gloss_exists.scalars().first():
        raise HTTPException(status_code=404, detail="Gloss not found")
        
    asset_exists = await db.execute(select(AnimationAsset).filter(AnimationAsset.id == variant.asset_id))
    if not asset_exists.scalars().first():
        raise HTTPException(status_code=404, detail="Asset not found")
        
    new_variant = SignVariant(**variant.model_dump())
    db.add(new_variant)
    await db.commit()
    await db.refresh(new_variant)
    
    # Reload with relationships for response
    query = select(SignVariant).filter(SignVariant.id == new_variant.id).options(
        selectinload(SignVariant.gloss),
        selectinload(SignVariant.language),
        selectinload(SignVariant.asset)
    )
    result = await db.execute(query)
    return result.scalars().first()

@router.get("/variants", response_model=List[schemas.SignVariantResponse])
async def list_variants(
    gloss_id: Optional[int] = None,
    language_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db)
):
    """List variants with filtering."""
    query = select(SignVariant).options(
        selectinload(SignVariant.gloss),
        selectinload(SignVariant.language),
        selectinload(SignVariant.asset)
    )
    
    if gloss_id:
        query = query.filter(SignVariant.gloss_id == gloss_id)
    if language_id:
        query = query.filter(SignVariant.language_id == language_id)
        
    query = query.order_by(SignVariant.priority.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    variant_id: int,
    delete_file: bool = Query(False, description="Also delete the associated file (Asset) if unused"),
    db: AsyncSession = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user)
):
    """Delete a sign variant with optional file deletion."""
    # 1. Get Variant
    result = await db.execute(select(SignVariant).filter(SignVariant.id == variant_id))
    variant = result.scalars().first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    asset_id = variant.asset_id
    
    # 2. Delete Variant
    await db.delete(variant)
    await db.flush() # Commit change to DB session so usage check works correctly? 
    # actually flush sends to DB but transaction not committed. 
    # subsequent select might see the deletion if in same transaction.
    
    # 3. Handle File Deletion
    if delete_file:
        # Check if any other variant uses this asset
        usage_res = await db.execute(select(SignVariant).filter(SignVariant.asset_id == asset_id))
        if usage_res.scalars().first():
             # Used by others, do not delete
             # Maybe warn? But it's 204.
             pass
        else:
             # Delete Asset
             # Fetch asset to get url
             asset_res = await db.execute(select(AnimationAsset).filter(AnimationAsset.id == asset_id))
             asset = asset_res.scalars().first()
             if asset:
                 # Delete from S3
                 from app.core.s3 import s3_client
                 from urllib.parse import urlparse
                 from app.config import settings
                 
                 try:
                     parsed_url = urlparse(asset.file_url)
                     path = parsed_url.path
                     if path.startswith('/'):
                         path = path[1:]
                     if path.startswith(f"{settings.s3_bucket_name}/"):
                         path = path.replace(f"{settings.s3_bucket_name}/", "", 1)
                     await s3_client.delete_file(path)
                 except Exception as e:
                     print(f"Error deleting S3 file: {e}")

                 # Delete Asset Record
                 await db.delete(asset)

    await db.commit()
    return None

# --- Assets (CMS Helper) ---

@router.get("/assets", response_model=List[schemas.AnimationAssetResponse])
async def list_assets(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(deps.get_db)
):
    """List animation assets (for CMS linking)."""
    result = await db.execute(select(AnimationAsset).order_by(AnimationAsset.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()

@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id:  uuid.UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user)
):
    """
    Delete an animation asset and its file from S3.
    """
    # Get Asset
    result = await db.execute(select(AnimationAsset).filter(AnimationAsset.id == asset_id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Delete from S3
    # Try to extract key from URL. Assuming standard format.
    # If using local storage/minio, url might be http://host/bucket/key
    # We might need to import s3_client to handle this properly or helper
    from app.core.s3 import s3_client
    from urllib.parse import urlparse
    
    try:
        # Simple heuristic: path after bucket name or just path if relative?
        # Our upload returns full URL. 
        # But we previously implemented delete_file taking a Key.
        # Let's try to extract Key.
        parsed_url = urlparse(asset.file_url)
        path = parsed_url.path
        if path.startswith('/'):
            path = path[1:] # Remove leading slash
            
        # If path includes bucket name (e.g. minio), we might need to strip it. 
        # settings.s3_bucket_name
        # BUT, standard S3 URLs are https://bucket.s3.region.amazonaws.com/KEY
        # OR https://s3.region.amazonaws.com/bucket/KEY
        # Let's assume standard path for now or log warning.
        
        # NOTE: This implementation assumes the Key is the path. 
        # If this fails, we might leave orphan files. 
        # Ideally we should store File Key in DB.
        
        # Fix for Minio/Localstack where bucket might be in path 
        # if path starts with bucket_name/, strip it.
        from app.config import settings
        if path.startswith(f"{settings.s3_bucket_name}/"):
             path = path.replace(f"{settings.s3_bucket_name}/", "", 1)
             
        await s3_client.delete_file(path)
        
    except Exception as e:
        # Log error but proceed to delete DB record? 
        # Or fail? Better to fail if strict, but maybe warn if file missing.
        print(f"Error deleting S3 file for asset {asset_id}: {e}")

    # Delete from DB
    await db.delete(asset)
    await db.commit()
    return None

# --- Search ---

@router.get("/search", response_model=List[schemas.SignVariantResponse])
async def search_variants(
    q: Optional[str] = None,
    language_id: Optional[str] = None,
    emotion: Optional[str] = None,
    min_fps: Optional[int] = None,
    max_fps: Optional[int] = None,
    min_duration: Optional[float] = None,
    max_duration: Optional[float] = None,
    sort_by: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Advanced search for variants.
    Filters by Gloss (name/synonyms), Language, Emotion, and Asset Metadata (FPS, Duration).
    """
    from sqlalchemy import or_
    query = select(SignVariant).join(Gloss).join(AnimationAsset).options(
        selectinload(SignVariant.gloss),
        selectinload(SignVariant.language),
        selectinload(SignVariant.asset)
    )

    if q:
         # Simplified search: Gloss Name OR Synonyms (as text)
        query = query.filter(or_(
            Gloss.name.ilike(f"%{q}%"),
            func.array_to_string(Gloss.synonyms, ",").ilike(f"%{q}%")
        ))

    if language_id:
        query = query.filter(SignVariant.language_id == language_id)
    
    if emotion:
        query = query.filter(SignVariant.emotion == emotion)
        
    # Asset Metadata Filters
    if min_fps is not None:
        query = query.filter(AnimationAsset.framerate >= min_fps)
    if max_fps is not None:
        query = query.filter(AnimationAsset.framerate <= max_fps)
        
    if min_duration is not None:
        query = query.filter(AnimationAsset.duration >= min_duration)
    if max_duration is not None:
        query = query.filter(AnimationAsset.duration <= max_duration)

    # Sorting
    if sort_by:
        if sort_by == 'created_at':
            query = query.order_by(SignVariant.created_at.asc())
        elif sort_by == '-created_at':
            query = query.order_by(SignVariant.created_at.desc())
        elif sort_by == 'duration':
            query = query.order_by(AnimationAsset.duration.asc())
        elif sort_by == '-duration':
            query = query.order_by(AnimationAsset.duration.desc())
        else:
             # Default fallback
             query = query.order_by(SignVariant.priority.desc(), Gloss.name.asc())
    else:
        query = query.order_by(SignVariant.priority.desc(), Gloss.name.asc())

    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()
