"""
Entry point for the application.
Import the app from app.main for uvicorn/gunicorn to use.
"""
from app.main import app

__all__ = ["app"]

