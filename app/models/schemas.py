"""Pydantic schemas for API models."""
from typing import Optional, List
import uuid
from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from app.models.enums import Handshape


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# --- CMS Schemas ---

class AnimationAssetResponse(BaseModel):
    id: uuid.UUID
    file_url: str
    file_hash: str
    duration: Optional[float] = None
    framerate: Optional[int] = None
    frame_count: Optional[int] = None
    transition_in: Optional[Handshape] = None
    transition_out: Optional[Handshape] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SignLanguageBase(BaseModel):
    code: str
    name: str

class SignLanguageCreate(SignLanguageBase):
    pass

class SignLanguageResponse(SignLanguageBase):
    class Config:
        from_attributes = True


class GlossBase(BaseModel):
    name: str
    synonyms: Optional[List[str]] = []
    description: Optional[str] = None

class GlossCreate(GlossBase):
    pass

class GlossUpdate(BaseModel):
    name: Optional[str] = None
    synonyms: Optional[List[str]] = None
    description: Optional[str] = None

class GlossResponse(GlossBase):
    id: int
    class Config:
        from_attributes = True


class SignVariantBase(BaseModel):
    gloss_id: int
    asset_id: uuid.UUID
    language_id: str
    emotion: str = "Neutral"
    type: str = "lexical"
    priority: int = 50

class SignVariantCreate(SignVariantBase):
    pass

class SignVariantResponse(SignVariantBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    # Nested responses
    gloss: Optional[GlossResponse] = None
    language: Optional[SignLanguageResponse] = None
    asset: Optional[AnimationAssetResponse] = None

    class Config:
        from_attributes = True

# --- File Schemas ---

class FileUploadResponse(BaseModel):
    """Response model for file upload."""
    success: bool
    file_key: str
    bucket: str
    url: str
    message: str = "File uploaded successfully"


class FileMetadata(BaseModel):
    """Model for file metadata."""
    key: str
    size: int
    content_type: Optional[str] = None
    last_modified: str
    url: str
    metadata: dict = Field(default_factory=dict)


class FileListResponse(BaseModel):
    """Response model for file listing."""
    files: List[FileMetadata]
    count: int
    is_truncated: bool
    next_token: Optional[str] = None


class FileDeleteResponse(BaseModel):
    """Response model for file deletion."""
    success: bool
    file_key: str
    message: str = "File deleted successfully"


class PresignedUrlRequest(BaseModel):
    """Request model for presigned URL generation."""
    file_key: str
    expiration: Optional[int] = Field(
        default=3600,
        description="URL expiration time in seconds",
        ge=60,
        le=604800  # Max 7 days
    )
    http_method: str = Field(
        default="GET",
        description="HTTP method: GET for download, PUT for upload"
    )


class PresignedUrlResponse(BaseModel):
    """Response model for presigned URL."""
    url: str
    file_key: str
    expiration: int
    http_method: str


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    timestamp: str
    version: str
    environment: str


class ReadinessResponse(BaseModel):
    """Response model for readiness check."""
    status: str
    s3_connection: bool
    timestamp: str


class ErrorResponse(BaseModel):
    """Response model for errors."""
    error: str
    detail: Optional[str] = None
    timestamp: str
