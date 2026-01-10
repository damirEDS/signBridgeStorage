"""Application configuration using pydantic-settings."""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Application Settings
    app_name: str = Field(default="signBridgeStorage", alias="APP_NAME")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")
    debug: bool = Field(default=False, alias="DEBUG")
    environment: str = Field(default="production", alias="ENVIRONMENT")
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    workers: int = Field(default=4, alias="WORKERS")
    
    # CORS Settings
    allowed_origins: str = Field(
        default="*",
        alias="ALLOWED_ORIGINS"
    )
    allowed_methods: str = Field(
        default="GET,POST,PUT,DELETE,OPTIONS",
        alias="ALLOWED_METHODS"
    )
    allowed_headers: str = Field(
        default="*",
        alias="ALLOWED_HEADERS"
    )
    
    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated origins into a list."""
        if self.allowed_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    @property
    def allowed_methods_list(self) -> list[str]:
        """Parse comma-separated methods into a list."""
        return [method.strip() for method in self.allowed_methods.split(",")]
    
    @property
    def allowed_headers_list(self) -> list[str]:
        """Parse comma-separated headers into a list."""
        if self.allowed_headers == "*":
            return ["*"]
        return [header.strip() for header in self.allowed_headers.split(",")]

    
    # S3 Storage Configuration
    s3_storage_access_id: str = Field(alias="S3_STORAGE_ACCESS_ID")
    s3_storage_access_key: str = Field(alias="S3_STORAGE_ACCESS_KEY")
    s3_endpoint_url: str = Field(
        default="https://storage.yandexcloud.kz",
        alias="S3_ENDPOINT_URL"
    )
    s3_bucket_name: str = Field(default="signbridge-storage", alias="S3_BUCKET_NAME")
    s3_region: str = Field(default="kz1", alias="S3_REGION")
    
    # File Upload Settings
    max_file_size_mb: int = Field(default=100, alias="MAX_FILE_SIZE_MB")
    allowed_file_extensions: str = Field(
        default=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.vrma,.glb,.gltf,.fbx",
        alias="ALLOWED_FILE_EXTENSIONS"
    )
    
    @property
    def allowed_file_extensions_list(self) -> list[str]:
        """Parse comma-separated file extensions into a list."""
        if not self.allowed_file_extensions or self.allowed_file_extensions == "*":
            return ["*"]
        return [ext.strip() for ext in self.allowed_file_extensions.split(",")]

    
    # Presigned URL Settings
    presigned_url_expiration_seconds: int = Field(
        default=3600,
        alias="PRESIGNED_URL_EXPIRATION_SECONDS"
    )
    
    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_format: str = Field(default="json", alias="LOG_FORMAT")

    # Database
    database_url: str = Field(alias="DATABASE_URL")

    # Authentication
    secret_key: str = Field(alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    @property
    def max_file_size_bytes(self) -> int:
        """Convert max file size from MB to bytes."""
        return self.max_file_size_mb * 1024 * 1024


# Global settings instance
settings = Settings()
