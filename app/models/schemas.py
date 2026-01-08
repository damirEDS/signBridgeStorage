"""Pydantic schemas for API models."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


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
