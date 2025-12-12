from fastapi import APIRouter, Depends, Query, HTTPException, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date
from datetime import date as date_type
from collections import defaultdict
from typing import List
from pydantic import BaseModel
from ..database import get_db

from ..models import SubmissionStatus

from .. import models, schemas, database


# ==========================================================
# 🔹 SINGLE Router Declaration
# ==========================================================
router = APIRouter(
    prefix="/api/tickets",
    tags=["Tickets"]
)


# ==========================================================
# 🔹 1️⃣ Foreman View: All Tickets (optional)
# ==========================================================
# (You can keep your commented block here if needed)


# ==========================================================
# 🔹 2️⃣ Supervisor View: Only Submitted Tickets
# ==========================================================
from datetime import date
from sqlalchemy import func


from datetime import datetime, date as date_type

@router.get("/for-supervisor", response_model=List[schemas.TicketSummary])
def get_tickets_for_supervisor(
    foreman_id: int = Query(...),
    date: str = Query(...),
    db: Session = Depends(database.get_db),
):
    try:
        target_date = date_type.fromisoformat(date)
    except:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())

    tickets = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.foreman_id == foreman_id,
            models.Ticket.created_at >= start,
            models.Ticket.created_at <= end,
            models.Ticket.status == SubmissionStatus.SUBMITTED
        )
        .order_by(models.Ticket.created_at.asc())
        .all()
    )

    return tickets


# ==========================================================
# 🔹 3️⃣ Project Engineer View: Approved Tickets
# ==========================================================
@router.get("/for-project-engineer", response_model=List[schemas.TicketSummary])
def get_tickets_for_project_engineer(
    db: Session = Depends(database.get_db),
    supervisor_id: int = Query(...),
    date: str = Query(...),
    project_engineer_id: int = Query(...),
):
    target_date = date_type.fromisoformat(date)

    # Get job codes assigned to PE
    job_codes = (
        db.query(models.JobPhase.job_code)
        .filter(models.JobPhase.project_engineer_id == project_engineer_id)
        .all()
    )
    job_codes = [jc[0] for jc in job_codes]

    if not job_codes:
        raise HTTPException(status_code=404, detail="No jobs assigned to this Project Engineer")

    # 🔍 Only foremen with approved daily submission
    foremen = (
        db.query(models.DailySubmission.foreman_id)
        .filter(
            models.DailySubmission.supervisor_id == supervisor_id,
            models.DailySubmission.date == target_date,
            models.DailySubmission.status == "APPROVED_BY_SUPERVISOR",
        )
        .distinct()
        .subquery()
    )

    # -------------------------
    # 🎫 Tickets (must be APPROVED_BY_SUPERVISOR)
    # -------------------------
    tickets = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.foreman_id.in_(foremen),
            cast(models.Ticket.created_at, Date) == target_date,
            models.Ticket.status == "APPROVED_BY_SUPERVISOR",
            models.Ticket.job_code.in_(job_codes),
        )
        .all()
    )

    return [schemas.TicketSummary.from_orm(t) for t in tickets]


# ==========================================================
# 🔹 4️⃣ Ticket Update Endpoint
from pydantic import BaseModel

class TicketUpdatePhase(BaseModel):
    phase_code_id: int  # Must match the frontend payload

@router.patch("/{ticket_id}", response_model=schemas.Ticket)
def update_ticket_phase_code(
    ticket_id: int,
    update: TicketUpdatePhase,
    db: Session = Depends(get_db),
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.phase_code_id = update.phase_code_id
    db.commit()
    db.refresh(ticket)
    return ticket

# ==========================================================
# 🔹 5️⃣ Submit Tickets
# ==========================================================
@router.post("/submit", status_code=status.HTTP_200_OK)
# @audit(action="submitted", entity="Ticket")
def submit_tickets(payload: dict, db: Session = Depends(database.get_db)):
    ticket_ids = payload.get("ticket_ids", [])
    if not ticket_ids:
        raise HTTPException(status_code=400, detail="No ticket IDs provided")

    tickets = db.query(models.Ticket).filter(models.Ticket.id.in_(ticket_ids)).all()
    if not tickets:
        raise HTTPException(status_code=404, detail="Tickets not found")

    for ticket in tickets:
        ticket.status = "SUBMITTED"
        db.add(ticket)

    db.commit()
    return {"message": "Tickets submitted successfully", "count": len(tickets)}


# ==========================================================
# 🔹 6️⃣ Health Check Endpoint
# ==========================================================
@router.get("/")
async def root():
    return {"message": "OCR API is running successfully!"}
