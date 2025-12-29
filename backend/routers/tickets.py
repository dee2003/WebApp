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

from datetime import date
from sqlalchemy import func


from datetime import datetime, date as date_type

from fastapi import Request, HTTPException

@router.get("/for-supervisor", response_model=List[schemas.TicketSummary])
def get_tickets_for_supervisor(
    request: Request,  # Get ALL query params
    db: Session = Depends(database.get_db),
):
    # Extract foreman_id from ANY param name (flexible)
    foreman_id = int(request.query_params.get('foremanid') or 
                    request.query_params.get('foreman_id') or 
                    request.query_params.get('foremanId'))
    
    date = request.query_params.get('date')
    
    if not foreman_id or not date:
        raise HTTPException(status_code=400, detail="foremanid/foreman_id and date required")
    
    tickets = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.foreman_id == foreman_id,
            models.Ticket.date == date,  # ✅ Uses new date column
            models.Ticket.status == SubmissionStatus.SUBMITTED
        )
        .order_by(models.Ticket.id.asc())
        .all()
    )
    
    print(f"✅ Found {len(tickets)} tickets for foreman {foreman_id} on {date}")
    return tickets



# ==========================================================
# 🔹 3️⃣ Project Engineer View: Approved Tickets
# ==========================================================
@router.get("/for-project-engineer", response_model=List[schemas.TicketSummary])
def get_tickets_for_project_engineer(
    db: Session = Depends(database.get_db),
    supervisor_id: int = Query(...),
    foreman_id: int = Query(...),
    date: str = Query(...),
    project_engineer_id: int = Query(...),
):
    print("Hit PE tickets endpoint", foreman_id, project_engineer_id, date)

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
from typing import Optional, Dict, Any, List

class TicketUpdatePhase(BaseModel):
    phase_code_id: Optional[int] = None

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

@router.get("/{timesheet_id}/scanned-tickets")
def get_scanned_tickets(timesheet_id: int, db: Session = Depends(get_db)):
    # 🔍 Check: Is the filter looking for the correct column?
    tickets = db.query(models.Ticket).filter(models.Ticket.timesheet_id == timesheet_id).all()
    print(f"Found {len(tickets)} tickets for timesheet {timesheet_id}") # Check your server terminal
    return tickets                  

# ==========================================================
# 🔹 6️⃣ Health Check Endpoint
# ==========================================================
@router.get("/")
async def root():
    return {"message": "OCR API is running successfully!"}
