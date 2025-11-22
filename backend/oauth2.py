# In backend/oauth2.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from . import database, models, token # Import token to get SECRET_KEY and ALGORITHM

# This tells FastAPI to look for a bearer token in the Authorization header.
# The `tokenUrl` points to the endpoint where a user can get a token.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(data: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    """
    This dependency decodes the JWT token from the request, validates its
    signature, and fetches the user from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the token using the secret key and algorithm from your token.py file
        payload = jwt.decode(data, token.SECRET_KEY, algorithms=[token.ALGORITHM])
        
        # The username is stored in the 'sub' (subject) claim of the token
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
    except JWTError:
        # If the token is invalid (bad signature, expired, etc.), raise an error
        raise credentials_exception

    # Find the user in the database from the username that was in the token
    user = db.query(models.User).filter(models.User.username == username).first()

    if user is None:
        # This handles the case where a user was deleted, but their old token is still being used.
        raise credentials_exception
        
    return user
