from fastapi import APIRouter, Depends, Query, HTTPException, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date
from datetime import date as date_type
from collections import defaultdict
from typing import List
from pydantic import BaseModel
from ..database import get_db

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
from ..models import SubmissionStatus

@router.get("/for-supervisor", response_model=List[schemas.TicketSummary])
def get_tickets_for_supervisor(
    db: Session = Depends(database.get_db),
    foreman_id: int = Query(..., description="Foreman user ID"),
    date: str = Query(..., description="Date to filter tickets (YYYY-MM-DD)")
):
    """
    Supervisors should ONLY see tickets that are already submitted.
    """
    try:
        target_date = date_type.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    tickets = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.foreman_id == foreman_id,
            cast(models.Ticket.created_at, Date) == target_date,
            models.Ticket.status == SubmissionStatus.SUBMITTED  # ✅ fixed
        )
        .all()
    )

    return [schemas.TicketSummary.from_orm(t) for t in tickets]



# ==========================================================
# 🔹 3️⃣ Project Engineer View: Approved Tickets
# ==========================================================
@router.get("/for-project-engineer", response_model=List[schemas.TicketSummary])
def get_tickets_for_project_engineer(
    db: Session = Depends(database.get_db),
    supervisor_id: int = Query(...),
    date: str = Query(...),
    project_engineer_id: int = Query(...),  # ✅ new param
):
    """
    Get all tickets for the given Project Engineer,
    limited to their assigned job codes.
    """
    target_date = date_type.fromisoformat(date)

    # ✅ Get all job codes assigned to this Project Engineer
    job_codes = (
        db.query(models.JobPhase.job_code)
        .filter(models.JobPhase.project_engineer_id == project_engineer_id)
        .all()
    )
    job_codes = [jc[0] for jc in job_codes]  # flatten list of tuples

    if not job_codes:
        raise HTTPException(status_code=404, detail="No jobs assigned to this Project Engineer")

    # ✅ Get foremen whose submissions belong to the supervisor on that date
    foremen = (
        db.query(models.DailySubmission.foreman_id)
        .filter(
            models.DailySubmission.supervisor_id == supervisor_id,
            models.DailySubmission.date == target_date,
            models.DailySubmission.status == "APPROVED",
        )
        .distinct()
        .subquery()
    )

    # ✅ Get tickets only for those job codes belonging to the engineer
    tickets = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.foreman_id.in_(foremen),
            cast(models.Ticket.created_at, Date) == target_date,
            models.Ticket.sent == True,
            models.Ticket.job_code.in_(job_codes)  # ✅ filter by assigned job codes
        )
        .all()
    )

    return [schemas.TicketSummary.from_orm(t) for t in tickets]

# ==========================================================
# 🔹 4️⃣ Ticket Update Endpoint
# ==========================================================
class TicketUpdatePhaseCode(BaseModel):
    phase_code: str

@router.patch("/{ticket_id}", response_model=schemas.Ticket)
# @audit(action="updated", entity="Ticket")

def update_ticket_phase_code(
    ticket_id: int,
    update: schemas.TicketUpdatePhase,
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
