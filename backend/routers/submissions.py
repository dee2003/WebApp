from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from ..database import get_db
from ..models import  Ticket, User, Timesheet

router = APIRouter(prefix="/api/submissions", tags=["submissions"])







class SubmissionPayload(BaseModel):
    date: str
    foreman_id: int
    ticket_ids: List[int]



@router.post("/", status_code=status.HTTP_201_CREATED)
def create_submission(payload: SubmissionPayload, db: Session = Depends(get_db)):
    """
    Submits selected tickets (marks them as sent).
    Does NOT automatically mark the related timesheet as sent.
    """

    # 1️⃣ Validate foreman
    foreman = db.query(User).filter(User.id == payload.foreman_id).first()
    if not foreman:
        raise HTTPException(status_code=404, detail="Foreman not found")

    target_date = payload.date

    # 2️⃣ (Optional) Find the timesheet for that date — just to link tickets to it, not to mark it sent
    timesheet = (
        db.query(Timesheet)
        .filter(
            Timesheet.foreman_id == payload.foreman_id,
            Timesheet.date == target_date
        )
        .first()
    )

    # 3️⃣ Update tickets
    update_values = {"status": "SUBMITTED"}
    if timesheet:
        update_values["timesheet_id"] = timesheet.id  # Link tickets to timesheet if exists

    db.query(Ticket).filter(
        Ticket.id.in_(payload.ticket_ids),
        Ticket.foreman_id == payload.foreman_id
    ).update(
        update_values,
        synchronize_session=False
    )

    # 4️⃣ Commit
    db.commit()

    return {"message": "Tickets submitted successfully"}
