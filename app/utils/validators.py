"""Utility validators for file operations."""
import os
from typing import Optional

from app.config import settings


def validate_file_extension(filename: Optional[str]) -> bool:
    """
    Validate if file extension is allowed.
    
    Args:
        filename: Name of the file
        
    Returns:
        True if extension is allowed, False otherwise
    """
    if not filename:
        return False
    
    _, ext = os.path.splitext(filename.lower())
    
    # Allow all extensions if list is empty or contains '*'
    allowed_extensions = settings.allowed_file_extensions_list
    if not allowed_extensions or '*' in allowed_extensions:
        return True
    
    return ext in allowed_extensions


def validate_file_size(size_bytes: int) -> bool:
    """
    Validate if file size is within allowed limit.
    
    Args:
        size_bytes: File size in bytes
        
    Returns:
        True if size is within limit, False otherwise
    """
    return size_bytes <= settings.max_file_size_bytes
