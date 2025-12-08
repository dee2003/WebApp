from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import User
from backend.utils_comman import hash_password
from backend.email_utils import send_email
from datetime import datetime, timedelta
import secrets
import asyncio

router = APIRouter(prefix="/api/auth", tags=["auth"])  # ✅ Has prefix
reset_tokens = {}  # Use Redis/DB in production

class RequestResetSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str = ""  # Allow empty temporarily for debugging

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Global validation handler - ADD TO MAIN APP FILE
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("=== 422 VALIDATION ERROR ===")
    print("Body:", await request.body())
    print("Errors:", exc.errors())
    print("============================")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

# Add this to your main.py/app.py
# app.add_exception_handler(RequestValidationError, validation_exception_handler)

@router.post("/request-reset")
async def request_password_reset(data: RequestResetSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return {"message": "If email exists, reset link sent."}

    token = secrets.token_urlsafe(32)
    reset_tokens[token] = {
        "user_id": user.id, 
        "expires": datetime.utcnow() + timedelta(minutes=15)
    }

    reset_link = f"http://localhost:3000/reset-password?token={token}"
    subject = "Password Reset"
    body = f"Reset your password: {reset_link}\n\nLink expires in 15 minutes."
    
    asyncio.create_task(send_email(user.email, subject, body))
    print(f"Reset link: {reset_link}")
    
    return {"message": "Reset link sent to your email."}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    print(f"Received: {data.dict()}")  # Debug log
    
    token_data = reset_tokens.get(data.token)
    if not token_data or token_data["expires"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user.password = hash_password(data.new_password)
    db.commit()
    del reset_tokens[data.token]

    return {"message": "Password reset successfully"}
