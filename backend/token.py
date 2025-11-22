# In backend/token.py

from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from . import schemas
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# This tells FastAPI where to look for the token (in the "Authorization" header)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Your existing SECRET_KEY and ALGORITHM should be here
SECRET_KEY = "your-very-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  

# Your existing create_access_token function is here
def create_access_token(data: dict):
    # ... (no changes needed here)
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- ADD THIS NEW FUNCTION ---
def verify_token(token: str = Depends(oauth2_scheme)):
    """
    Decodes the JWT token to get the username.
    Raises an exception if the token is invalid.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username
