from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from backend import database, models, utils_comman
from backend.email_utils import send_email
import asyncio

router = APIRouter(prefix="/api/web-auth", tags=["Web Auth"])

# In-memory OTP store
web_otp_store = {}

class WebEmailRequest(BaseModel):
    email: EmailStr

@router.post("/send-reset-otp")
def send_otp_web(data: WebEmailRequest):
    email = data.email.lower()
    otp = random.randint(100000, 999999)
    web_otp_store[email] = {"otp": str(otp), "expires": datetime.utcnow() + timedelta(minutes=5)}

    # Send email asynchronously
    subject = "Your OTP Code (Web Portal)"
    message = f"Your OTP code is {otp}. It expires in 5 minutes."
    asyncio.create_task(send_email(email, subject, message))  # non-blocking

    return {"message": "OTP sent successfully"}
