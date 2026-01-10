"""Health check endpoints."""
import logging
from datetime import datetime
from fastapi import APIRouter, status

from app.core.s3 import s3_client
from app.models.schemas import HealthResponse, ReadinessResponse
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Basic health check",
    status_code=status.HTTP_200_OK
)
async def health_check() -> HealthResponse:
    """
    Basic health check endpoint for liveness probe.
    
    Returns basic application information.
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version=settings.app_version,
        environment=settings.environment
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    summary="Readiness check with dependency validation",
    status_code=status.HTTP_200_OK
)
async def readiness_check() -> ReadinessResponse:
    """
    Readiness check endpoint that validates S3 connection.
    
    Used by Kubernetes/Docker to determine if the service is ready to accept traffic.
    """
    s3_healthy = await s3_client.check_connection()
    
    # Check Database connection
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import text
    db_healthy = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_healthy = True
    except Exception as e:
        logger.error(f"Database readiness check failed: {e}")
    
    return ReadinessResponse(
        status="ready" if s3_healthy and db_healthy else "not_ready",
        s3_connection=s3_healthy,
        # We can add db_connection to ReadinessResponse if we update the schema, 
        # but for now, "status" reflecting both is the most critical part. 
        # Ideally, we should update the schema to report DB status too.
        timestamp=datetime.utcnow().isoformat()
    )


@router.get(
    "/health/s3-config",
    summary="S3 configuration diagnostic (debug only)",
    status_code=status.HTTP_200_OK
)
async def s3_config_diagnostic() -> dict:
    """
    Show S3 configuration for debugging (secret key is masked).
    
    WARNING: Only enable in development mode!
    """
    if not settings.debug:
        return {"error": "This endpoint is only available in debug mode"}
    
    return {
        "endpoint_url": settings.s3_endpoint_url,
        "bucket_name": settings.s3_bucket_name,
        "region": settings.s3_region,
        "access_key_id": settings.s3_storage_access_id,
        "access_key_secret": "***" + settings.s3_storage_access_key[-4:] if len(settings.s3_storage_access_key) > 4 else "***",
        "debug_mode": settings.debug
    }

