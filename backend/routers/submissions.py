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

# @router.post("/", status_code=status.HTTP_201_CREATED)
# def create_submission(payload: SubmissionPayload, db: Session = Depends(get_db)):
#     # Validate foreman
#     foreman = db.query(User).filter(User.id == payload.foreman_id).first()
#     if not foreman:
#         raise HTTPException(status_code=404, detail="Foreman not found")

#     # Check if submission exists for this date + foreman
#     submission = db.query(DailySubmission).filter_by(
#         foreman_id=payload.foreman_id,
#         date=payload.date
#     ).first()

#     if submission is None:
#         submission = DailySubmission(
#             foreman_id=payload.foreman_id,
#             date=payload.date,
#             ticket_count=len(payload.ticket_ids),
#             status="PENDING_REVIEW"  # Foreman submission pending review
#         )
#         db.add(submission)
#     else:
#         submission.ticket_count = len(payload.ticket_ids)

#     db.commit()
#     db.refresh(submission)

#     # Mark all related timesheets as sent (foreman submitted), but NOT reviewed by supervisor
#     db.query(Timesheet).filter(
#         Timesheet.foreman_id == payload.foreman_id,
#         Timesheet.date == payload.date
#     ).update(
#         {"sent": True},  # only mark as sent
#         synchronize_session=False
#     )

#     # Mark tickets as sent, but do NOT mark as supervisor-submitted
#     db.query(Ticket).filter(
#         Ticket.id.in_(payload.ticket_ids),
#         Ticket.foreman_id == payload.foreman_id
#     ).update(
#         {"sent": True},  # only mark as sent
#         synchronize_session=False
#     )

#     db.commit()

#     return {"message": "Submission created successfully", "submission_id": submission.id}
# @router.post("/", status_code=status.HTTP_201_CREATED)
# def create_submission(payload: SubmissionPayload, db: Session = Depends(get_db)):
#     # Validate foreman
#     foreman = db.query(User).filter(User.id == payload.foreman_id).first()
#     if not foreman:
#         raise HTTPException(status_code=404, detail="Foreman not found")

#     target_date = payload.date

#     # ✅ Mark all related timesheets as submitted
#     db.query(Timesheet).filter(
#         Timesheet.foreman_id == payload.foreman_id,
#         Timesheet.date == target_date
#     ).update(
#         {"status": "Submitted"},  # change from sent=True → status="Submitted"
#         synchronize_session=False
#     )

#     # ✅ Mark tickets as submitted
# # Only mark the selected tickets as submitted
#     db.query(Ticket).filter(
#         Ticket.id.in_(payload.ticket_ids),
#         Ticket.foreman_id == payload.foreman_id
#     ).update(
#         {"sent": True},
#         synchronize_session=False
# )


#     db.commit()
#     return {"message": "Submission created successfully"}


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
