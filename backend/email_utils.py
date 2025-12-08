import os
from email.mime.text import MIMEText
import aiosmtplib
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

if not SMTP_USER or not SMTP_PASSWORD:
    raise Exception("SMTP_USER or SMTP_PASSWORD not set in environment variables")

async def send_email(
    recipient: str,
    subject: str,
    message: str
):
    """
    Sends an email asynchronously using Gmail SMTP with App Password.
    
    Args:
        recipient (str): Recipient email address
        subject (str): Email subject
        message (str): Email body (plain text)
    """
    try:
        # Create email message
        msg = MIMEText(message)
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = recipient

        # Send email
        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=465,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=True,
        )
        print(f"Email sent successfully to {recipient}")

    except aiosmtplib.errors.SMTPAuthenticationError as e:
        print(f"SMTP Authentication Error: {e}")
        raise
    except aiosmtplib.errors.SMTPException as e:
        print(f"SMTP Error: {e}")
        raise
    except Exception as e:
        print(f"Unexpected error while sending email: {e}")
        raise
