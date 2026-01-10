from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core import security
from app.config import settings
from app.models.schemas import Token

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    
    Hardcoded user for now:
    - username: admin
    - password: adminpassword
    """
    # TODO: Replace with DB lookup
    user_authenticated = False
    if form_data.username == "admin" and form_data.password == "adminpassword":
        user_authenticated = True
        
    if not user_authenticated:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    return {
        "access_token": security.create_access_token(
            subject=form_data.username, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
