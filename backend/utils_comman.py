#  or utils.py
from collections import defaultdict
from sqlalchemy.orm import Session
from . import models
from typing import List, Dict
import bcrypt

def get_grouped_job_phases(db: Session) -> List[Dict]:
    """
    Queries all job-phase entries and returns them grouped by job_code.
    """
    job_phase_rows = db.query(models.JobPhase).all()
    
    grouped_data = defaultdict(list)
    for row in job_phase_rows:
        # We don't need the full phase object, just the code
        grouped_data[row.job_code].append(row.phase_code)
        
    # Convert the grouped data into the desired list of dictionaries format
    result = [
        {"job_code": job_code, "phases": phases}
        for job_code, phases in grouped_data.items()
    ]
    
    return result
# from passlib.context import CryptContext

# # Initialize bcrypt hasher
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# def hash_password(password: str) -> str:
#     """Hash a plain text password using bcrypt."""
#     return pwd_context.hash(password)

# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     """Verify a plain text password against its hashed version."""
#     return pwd_context.verify(plain_password, hashed_password)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


