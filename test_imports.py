#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test script to verify application imports and configuration."""
from app.main import app
from app.config import settings

print("[OK] Application imports successfully")
print(f"[OK] App title: {app.title}")
print(f"[OK] App version: {app.version}")
print(f"[OK] Environment: {settings.environment}")
print(f"[OK] S3 Bucket: {settings.s3_bucket_name}")
print(f"[OK] Debug mode: {settings.debug}")
print("\n[OK] All imports successful! Ready to run.")

