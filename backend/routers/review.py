


from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date, or_
from typing import List
from ..database import get_db
from .. import models, schemas,database
from datetime import date as date_type
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any, Dict
from ..schemas import SubmissionStatus

router = APIRouter(prefix="/api/review", tags=["Supervisor Review"])

# ---------------- Notifications ----------------
@router.get("/notifications", response_model=List[schemas.Notification])
def get_notifications_for_supervisor(db: Session = Depends(get_db)):
    """
    Show all foremen who have submitted Timesheets or Tickets.
    """
    # ✅ Get all foremen with submitted Timesheets (status = "SUBMITTED")
    submitted_timesheets = (
        db.query(models.Timesheet.foreman_id, models.Timesheet.date)
        .filter(models.Timesheet.status == "SUBMITTED")
        .distinct()
        .all()
    )

    notifications = []
    for foreman_id, ts_date in submitted_timesheets:
        foreman = db.query(models.User).filter(models.User.id == foreman_id).first()
        if not foreman:
            continue

        # ✅ Count submitted Timesheets
        timesheet_count = (
            db.query(func.count(models.Timesheet.id))
            .filter(
                models.Timesheet.foreman_id == foreman_id,
                models.Timesheet.date == ts_date,
                models.Timesheet.status == "SUBMITTED",
            )
            .scalar()
            or 0
        )

        # ✅ Count submitted Tickets (status = "SUBMITTED")
        ticket_count = (
            db.query(func.count(models.Ticket.id))
            .filter(
                models.Ticket.foreman_id == foreman_id,
                cast(models.Ticket.created_at, Date) == ts_date,
                models.Ticket.status == "SUBMITTED",
            )
            .scalar()
            or 0
        )

        notifications.append(
            schemas.Notification(
                id=int(f"{foreman_id}{ts_date.strftime('%Y%m%d')}"),
                foreman_id=foreman.id,
                foreman_name=f"{foreman.first_name} {foreman.last_name}".strip(),
                foreman_email=foreman.email,
                date=ts_date,
                timesheet_count=timesheet_count,
                ticket_count=ticket_count,
                job_code=None,  # Optional: can derive from related job phase
            )
        )

    return notifications


# ---------------- Submit all for date ----------------
class SubmitDatePayload(BaseModel):
    date: str
    supervisor_id: int
from datetime import date

class SupervisorSubmitPayload(BaseModel):
    supervisor_id: int
    date: date
@router.post("/submit-all-for-date")
def submit_all_for_date(payload: SupervisorSubmitPayload, db: Session = Depends(get_db)):
    submission = models.SupervisorSubmission(
        supervisor_id=payload.supervisor_id,
        date=payload.date,
        status="SubmittedToEngineer"
    )
    db.add(submission)
    db.commit()

    # ✅ Fetch all timesheets submitted by foremen for this date
    timesheets = (
        db.query(models.Timesheet)
        .join(models.JobPhase)
        .filter(
            models.Timesheet.date == payload.date,
            models.Timesheet.status == models.SubmissionStatus.SUBMITTED,  # only submitted ones
            models.JobPhase.project_engineer_id.isnot(None)
        )
        .all()
    )

    for ts in timesheets:
        pe_id = ts.job_phase.project_engineer_id
        if not pe_id:
            continue

        # ✅ Mark timesheet as sent
        ts.status = models.SubmissionStatus.SUBMITTED  # or simply "Submitted" if not using enum

        # ✅ Create workflow entry
        workflow = models.TimesheetWorkflow(
            timesheet_id=ts.id,
            supervisor_id=payload.supervisor_id,
            engineer_id=pe_id,
            by_role="Supervisor",
            action="sent",
            timestamp=datetime.utcnow(),
            comments=f"Timesheet forwarded to Project Engineer (User ID: {pe_id})"
        )
        db.add(workflow)

    db.commit()
    return {"message": "Timesheets sent to Project Engineers successfully."}




@router.get("/submitted-dates", response_model=List[date_type])
def get_submitted_dates(db: Session = Depends(get_db)):
    """
    Fetch all distinct dates that have been submitted to the engineer.
    """
    result = (
        db.query(models.SupervisorSubmission.date)
        .filter(models.SupervisorSubmission.status == "SubmittedToEngineer")
        .distinct()
        .order_by(models.SupervisorSubmission.date.desc())
        .all()
    )
    return [r.date for r in result]


@router.get("/supervisor_submissions/by-date")
def get_submission_by_date(date: str, db: Session = Depends(get_db)):
    try:
        # Convert to Python date object
        query_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    submission = (
        db.query(models.SupervisorSubmission)
        .filter(models.SupervisorSubmission.date == query_date)
        .first()
    )

    if not submission:
        raise HTTPException(status_code=404, detail="No submission found for this date")

    return submission


@router.get("/status-for-date")
def get_status_for_date(date: str, supervisor_id: int, db: Session = Depends(get_db)):
    record = (
        db.query(models.SupervisorSubmission)
        .filter(models.SupervisorSubmission.supervisor_id == supervisor_id)
        .filter(models.SupervisorSubmission.date == date)
        .first()
    )

    if not record:
        # ✅ Allow submission if not yet submitted
        return {
            "can_submit": True,
            "unreviewed_timesheets": [],
            "incomplete_tickets": []
        }

    # ✅ If already submitted, block
    return {
        "can_submit": False,
        "unreviewed_timesheets": [],
        "incomplete_tickets": [],
        "status": record.status
    }

from fastapi import Query
from sqlalchemy import func, and_
from datetime import date as date_type
@router.post("/{timesheet_id}/send-to-engineer", response_model=schemas.Timesheet)
def send_timesheet_to_engineer(timesheet_id: int, db: Session = Depends(get_db)):
    """
    Supervisor forwards a timesheet to the Project Engineer
    based on job_phase.project_engineer_id.
    """
    ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    # ✅ Ensure the timesheet has already been submitted by foreman
    if ts.status != "SUBMITTED":
        raise HTTPException(status_code=400, detail="Timesheet must be submitted before forwarding to engineer")

    # ✅ Fetch related Job Phase
    job_phase = db.query(models.JobPhase).filter(models.JobPhase.id == ts.job_phase_id).first()
    if not job_phase:
        raise HTTPException(status_code=404, detail="Job Phase not found")

    # ✅ Get Project Engineer
    project_engineer = db.query(models.User).filter(models.User.id == job_phase.project_engineer_id).first()
    if not project_engineer:
        raise HTTPException(status_code=404, detail="No Project Engineer assigned for this job")

    # ✅ Update the timesheet status
    ts.status = "SUBMITTED"
    ts.assigned_to_id = project_engineer.id  # Optional tracking

    workflow = models.TimesheetWorkflow(
        timesheet_id=ts.id,
        foreman_id=ts.foreman_id,
        action="Forwarded to Project Engineer",
        by_role="Supervisor",
        timestamp=datetime.utcnow(),
        comments=f"Forwarded to Project Engineer: {project_engineer.first_name} {project_engineer.last_name}",
    )

    db.add(workflow)
    db.commit()
    db.refresh(ts)

    print(f"✅ Timesheet {ts.id} sent to Project Engineer ID {project_engineer.id}")
    return ts
@router.get("/pe/timesheets")
def get_pe_timesheets(foreman_id: int, date: str, db: Session = Depends(database.get_db)):
    try:
        target_date = date_type.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    timesheets = (
        db.query(models.Timesheet)
        .filter(
            models.Timesheet.foreman_id == foreman_id,
            models.Timesheet.date == target_date
        )
        .all()
    )

    if not timesheets:
        raise HTTPException(status_code=404, detail="Timesheets not found for given date and foreman.")

    return [
        {
            "id": t.id,
            "job_code": t.job_phase.job_code if t.job_phase else None,
            "timesheet_name": t.timesheet_name,
            "submitted_at": t.sent_date.isoformat() if t.sent_date else None,
            "status": t.status,
        }
        for t in timesheets
    ]


# ---------------- PE Tickets ----------------

@router.get("/pe/tickets")
def get_pe_tickets(foreman_id: int, date: str, db: Session = Depends(get_db)):
    from datetime import date as date_type
    from backend.models import SubmissionStatus  # ensure this import exists

    target_date = date_type.fromisoformat(date)

    tickets = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.foreman_id == foreman_id,
            cast(models.Ticket.created_at, Date) == target_date,
            models.Ticket.status == SubmissionStatus.SUBMITTED
        )
        .all()
    )

    return [
        {
            "id": t.id,
            "job_code": t.job_phase.job_code if t.job_phase else None,
            "phase_code": t.phase_code.code if t.phase_code else None,  # ✅ show phase code
            "image_path": t.image_path,
        }
        for t in tickets
    ]
