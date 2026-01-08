"""S3 client and operations for file storage."""
import logging
from typing import Optional, List, Dict, Any, BinaryIO
from datetime import datetime
import boto3
from botocore.exceptions import ClientError
from botocore.client import Config

from app.config import settings

logger = logging.getLogger(__name__)


class S3Client:
    """S3 client wrapper for file storage operations."""
    
    def __init__(self) -> None:
        """Initialize S3 client with credentials from settings."""
        self.client = boto3.client(
            's3',
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_storage_access_id,
            aws_secret_access_key=settings.s3_storage_access_key,
            region_name=settings.s3_region,
            config=Config(signature_version='s3v4')
        )
        self.bucket_name = settings.s3_bucket_name
        logger.info(f"S3 client initialized for bucket: {self.bucket_name}")
    
    async def upload_file(
        self,
        file_data: BinaryIO,
        file_key: str,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Upload a file to S3.
        
        Args:
            file_data: Binary file data
            file_key: S3 object key (path)
            content_type: MIME type of the file
            metadata: Additional metadata to store with the file
            
        Returns:
            Dict with upload information
        """
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            if metadata:
                extra_args['Metadata'] = metadata
            
            self.client.upload_fileobj(
                file_data,
                self.bucket_name,
                file_key,
                ExtraArgs=extra_args
            )
            
            logger.info(f"File uploaded successfully: {file_key}")
            return {
                "success": True,
                "file_key": file_key,
                "bucket": self.bucket_name,
                "url": self._get_object_url(file_key)
            }
        except ClientError as e:
            logger.error(f"Error uploading file {file_key}: {str(e)}")
            raise
    
    async def download_file(self, file_key: str) -> bytes:
        """
        Download a file from S3.
        
        Args:
            file_key: S3 object key
            
        Returns:
            File content as bytes
        """
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=file_key)
            content = response['Body'].read()
            logger.info(f"File downloaded successfully: {file_key}")
            return content
        except ClientError as e:
            logger.error(f"Error downloading file {file_key}: {str(e)}")
            raise
    
    async def delete_file(self, file_key: str) -> Dict[str, Any]:
        """
        Delete a file from S3.
        
        Args:
            file_key: S3 object key
            
        Returns:
            Dict with deletion information
        """
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=file_key)
            logger.info(f"File deleted successfully: {file_key}")
            return {"success": True, "file_key": file_key}
        except ClientError as e:
            logger.error(f"Error deleting file {file_key}: {str(e)}")
            raise
    
    async def list_files(
        self,
        prefix: str = "",
        max_keys: int = 100,
        continuation_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List files in S3 bucket.
        
        Args:
            prefix: Filter by prefix (folder path)
            max_keys: Maximum number of keys to return
            continuation_token: Token for pagination
            
        Returns:
            Dict with list of files and pagination info
        """
        try:
            params = {
                'Bucket': self.bucket_name,
                'Prefix': prefix,
                'MaxKeys': max_keys
            }
            
            if continuation_token:
                params['ContinuationToken'] = continuation_token
            
            response = self.client.list_objects_v2(**params)
            
            files = []
            for obj in response.get('Contents', []):
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'url': self._get_object_url(obj['Key'])
                })
            
            result = {
                'files': files,
                'count': len(files),
                'is_truncated': response.get('IsTruncated', False)
            }
            
            if response.get('NextContinuationToken'):
                result['next_token'] = response['NextContinuationToken']
            
            logger.info(f"Listed {len(files)} files with prefix: {prefix}")
            return result
            
        except ClientError as e:
            logger.error(f"Error listing files: {str(e)}")
            raise
    
    async def get_file_metadata(self, file_key: str) -> Dict[str, Any]:
        """
        Get metadata for a file.
        
        Args:
            file_key: S3 object key
            
        Returns:
            Dict with file metadata
        """
        try:
            response = self.client.head_object(Bucket=self.bucket_name, Key=file_key)
            return {
                'key': file_key,
                'size': response['ContentLength'],
                'content_type': response.get('ContentType'),
                'last_modified': response['LastModified'].isoformat(),
                'metadata': response.get('Metadata', {}),
                'url': self._get_object_url(file_key)
            }
        except ClientError as e:
            logger.error(f"Error getting metadata for {file_key}: {str(e)}")
            raise
    
    async def generate_presigned_url(
        self,
        file_key: str,
        expiration: Optional[int] = None,
        http_method: str = 'GET'
    ) -> str:
        """
        Generate a presigned URL for direct file access.
        
        Args:
            file_key: S3 object key
            expiration: URL expiration time in seconds
            http_method: HTTP method (GET for download, PUT for upload)
            
        Returns:
            Presigned URL
        """
        try:
            expiration = expiration or settings.presigned_url_expiration_seconds
            
            client_method = 'get_object' if http_method == 'GET' else 'put_object'
            url = self.client.generate_presigned_url(
                client_method,
                Params={'Bucket': self.bucket_name, 'Key': file_key},
                ExpiresIn=expiration
            )
            
            logger.info(f"Generated presigned URL for {file_key}")
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned URL for {file_key}: {str(e)}")
            raise
    
    async def check_connection(self) -> bool:
        """
        Check if S3 connection is healthy.
        
        Returns:
            True if connection is healthy
        """
        try:
            logger.info(f"Checking S3 connection to bucket: {self.bucket_name}")
            logger.info(f"Using endpoint: {settings.s3_endpoint_url}")
            response = self.client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"S3 connection successful: {response}")
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"S3 connection failed: [{error_code}] {error_message}")
            logger.error(f"Bucket: {self.bucket_name}, Endpoint: {settings.s3_endpoint_url}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error checking S3 connection: {str(e)}", exc_info=True)
            return False
    
    def _get_object_url(self, file_key: str) -> str:
        """Generate public URL for S3 object."""
        return f"{settings.s3_endpoint_url}/{self.bucket_name}/{file_key}"


# Global S3 client instance
s3_client = S3Client()
