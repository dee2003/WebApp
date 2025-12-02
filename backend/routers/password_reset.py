# backend/routers/password_reset.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta
import random
import smtplib
from email.mime.text import MIMEText
from sqlalchemy.orm import Session
from .. import database, models, utils_comman  # adjust imports based on your project structure

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Temporary OTP store (replace with DB/Redis in production)
otp_store = {}

# Load email credentials from env variables
import os
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email(recipient: str, subject: str, message: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        raise Exception("SMTP_USER or SMTP_PASSWORD not set in environment variables")
    
    msg = MIMEText(message)
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = recipient

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)


# ----------------- Schemas -----------------
class EmailRequest(BaseModel):
    email: str

class OtpVerify(BaseModel):
    email: str
    otp: str

class ResetRequest(BaseModel):
    email: str
    otp: str
    new_password: str


# ----------------- Endpoints -----------------
@router.post("/send-reset-otp")
def send_otp(data: EmailRequest):
    email = data.email.lower()
    otp = random.randint(100000, 999999)
    otp_store[email] = {"otp": str(otp), "expires": datetime.utcnow() + timedelta(minutes=5)}

    send_email(email, "Your OTP Code", f"Your OTP code is {otp}. It expires in 5 minutes.")
    return {"message": "OTP sent successfully"}

@router.post("/verify-otp")
def verify_otp(data: OtpVerify):
    email = data.email.lower()
    if email not in otp_store:
        raise HTTPException(status_code=400, detail="OTP not found")
    saved = otp_store[email]
    if datetime.utcnow() > saved["expires"]:
        raise HTTPException(status_code=400, detail="OTP expired")
    if saved["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP")
    return {"message": "OTP verified successfully"}

@router.post("/reset-password")
def reset_password(data: ResetRequest, db: Session = Depends(database.get_db)):
    email = data.email.lower()
    if email not in otp_store:
        raise HTTPException(status_code=400, detail="OTP missing or expired")
    if otp_store[email]["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = utils_comman.hash_password(data.new_password)
    db.commit()
    del otp_store[email]
    return {"message": "Password reset successfully"}
