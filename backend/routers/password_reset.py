from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import random
import smtplib
from email.mime.text import MIMEText
from sqlalchemy.orm import Session
from .. import database, models, utils_comman
import os

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Temporary OTP + token store
otp_store = {}

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email(recipient: str, subject: str, message: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        raise Exception("SMTP_USER or SMTP_PASSWORD not set")
    msg = MIMEText(message)
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = recipient
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)

# ---------------- Schemas ----------------
class EmailRequest(BaseModel):
    email: str

class OtpVerify(BaseModel):
    email: str
    otp: str

class OtpVerifyResponse(BaseModel):
    token: str

class ResetRequestTokenOnly(BaseModel):
    token: str
    new_password: str

# ---------------- Endpoints ----------------
@router.post("/send-reset-otp")
def send_otp(data: EmailRequest):
    email = data.email.lower()
    otp = random.randint(100000, 999999)
    otp_store[email] = {
        "otp": str(otp),
        "expires": datetime.utcnow() + timedelta(minutes=5),
        "token": None
    }
    send_email(email, "Your OTP Code", f"Your OTP code is {otp}. It expires in 5 minutes.")
    print(f"[DEBUG] OTP {otp} sent to {email}")
    return {"message": "OTP sent successfully"}

@router.post("/verify-otp", response_model=OtpVerifyResponse)
def verify_otp(data: OtpVerify):
    email = data.email.lower()
    print(f"[DEBUG] Verifying OTP for {email} with {data.otp}")
    
    if email not in otp_store:
        raise HTTPException(status_code=400, detail="OTP not found")
    
    saved = otp_store[email]
    if datetime.utcnow() > saved["expires"]:
        raise HTTPException(status_code=400, detail="OTP expired")
    if saved["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP")
    
    # Generate token if not already present
    if saved["token"]:
        token = saved["token"]
    else:
        token = str(random.randint(1000000, 9999999))
        otp_store[email]["token"] = token

    print(f"[DEBUG] Generated token: {token} for {email}")
    return {"token": token}  # ✅ Only token

@router.post("/reset-passwordss")
def reset_password(data: ResetRequestTokenOnly, db: Session = Depends(database.get_db)):
    # Look up email by token
    email = next((e for e, v in otp_store.items() if v.get("token") == data.token), None)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    saved = otp_store[email]

    # Optional: check token expiry if you want stricter security
    # if datetime.utcnow() > saved["expires"]:
    #     raise HTTPException(status_code=400, detail="Token expired")

    # Find the user in DB
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password
    user.password = utils_comman.hash_password(data.new_password)
    db.commit()

    # Clear OTP + token after reset
    del otp_store[email]
