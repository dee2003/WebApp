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
from sqlalchemy import func, cast, Date
from backend import models
from datetime import date as DateType
from sqlalchemy.orm import aliased
from sqlalchemy import or_
router = APIRouter(prefix="/api/review", tags=["Supervisor Review"])

# ---------------- Notifications ----------------
def get_timesheet_submission_date_column():
    """Returns the column to use for grouping/filtering the submission date."""
    # Assuming 'sent_date' is updated on submission (status change to SUBMITTED).
    # If sent_date is only set on creation, use created_at instead: 
    # return cast(models.Timesheet.created_at, Date)
    return cast(models.Timesheet.sent_date, Date)

def get_ticket_submission_date_column():
    """Returns the column to use for grouping/filtering the ticket submission date."""
    # Since Ticket model lacks a specific 'sent_date', we use 'created_at'.
    return cast(models.Ticket.created_at, Date)
# -------------------------------------------------------------------


# @router.get("/notifications", response_model=List[schemas.Notification])
# def get_notifications_for_supervisor(db: Session = Depends(get_db)):
#     """
#     Show all foremen who have submitted Timesheets or Tickets, 
#     grouped by the actual SUBMISSION DATE.
#     """
#     # Define the statuses that should remain visible on the dashboard
#     TIMESHEET_DASHBOARD_STATUSES = ["SUBMITTED", "REVIEWED_BY_SUPERVISOR"]
    
#     # Define the submission date columns based on the helper functions
#     ts_submission_date_col = get_timesheet_submission_date_column()
#     tk_submission_date_col = get_ticket_submission_date_column()


#     # 1. FIX: Get all unique foreman_id and TIMESHEET SUBMISSION DATE combinations
#     submitted_timesheet_groups = (
#         db.query(
#             models.Timesheet.foreman_id,
#             ts_submission_date_col.label("submission_date") # Extract the submission date
#         )
#         .filter(models.Timesheet.status.in_(TIMESHEET_DASHBOARD_STATUSES))
#         .distinct()
#         .all()
#     )

#     notifications = []
#     # Loop over the groups defined by Foreman ID and the Submission Date
#     for foreman_id, submission_date in submitted_timesheet_groups:
#         foreman = db.query(models.User).filter(models.User.id == foreman_id).first()
#         if not foreman:
#             continue

#         # 2. Count all timesheets submitted on this specific submission date
#         timesheet_count = (
#             db.query(func.count(models.Timesheet.id))
#             .filter(
#                 models.Timesheet.foreman_id == foreman_id,
#                 # Filter by the submission date column
#                 ts_submission_date_col == submission_date, 
#                 models.Timesheet.status.in_(TIMESHEET_DASHBOARD_STATUSES),
#             )
#             .scalar()
#             or 0
#         )

#         # 3. FIX: Count submitted Tickets on this specific submission date
#         ticket_count = (
#             db.query(func.count(models.Ticket.id))
#             .filter(
#                 models.Ticket.foreman_id == foreman_id,
#                 models.Ticket.status == SubmissionStatus.SUBMITTED.value, # Ensure status matches the enum type
#                 # Filter by the ticket's submission date column
#                 tk_submission_date_col == submission_date 
#             )
#             .scalar()
#             or 0
#         )
        
#         # Only create a notification if there are pending items for review for this date
#         if timesheet_count > 0 or ticket_count > 0:
#             notifications.append(
#                 schemas.Notification(
#                     # ID should now include the submission date
#                     # Note: You may want to generate a more robust ID if you have many foremen
#                     id=int(f"{foreman_id}{submission_date.strftime('%Y%m%d')}"),
#                     foreman_id=foreman.id,
#                     foreman_name=f"{foreman.first_name} {foreman.last_name}".strip(),
#                     foreman_email=foreman.email,
#                     # This 'date' field will now hold the submission date, as requested
#                     date=submission_date, 
#                     timesheet_count=timesheet_count,
#                     ticket_count=ticket_count,
#                     job_code=None,
#                 )
#             )

#     return notifications
@router.get("/notifications", response_model=List[schemas.Notification])
def get_notifications_for_supervisor(db: Session = Depends(get_db)):
    """
    Show all foremen who have submitted Timesheets or Tickets, 
    grouped by the actual SUBMISSION DATE, but including the WORK DATE.
    """
    TIMESHEET_DASHBOARD_STATUSES = ["SUBMITTED", "REVIEWED_BY_SUPERVISOR"]
    
    ts_submission_date_col = get_timesheet_submission_date_column()
    tk_submission_date_col = get_ticket_submission_date_column()

    # 1. Update query to include the WORK DATE (models.Timesheet.date)
    submitted_timesheet_groups = (
        db.query(
            models.Timesheet.foreman_id,
            ts_submission_date_col.label("submission_date"),
            models.Timesheet.date.label("actual_work_date") # <--- Added this
        )
        .filter(models.Timesheet.status.in_(TIMESHEET_DASHBOARD_STATUSES))
        .distinct()
        .all()
    )

    notifications = []
    
    # 2. Unpack the actual_work_date from the query results
    for foreman_id, submission_date, actual_work_date in submitted_timesheet_groups:
        foreman = db.query(models.User).filter(models.User.id == foreman_id).first()
        if not foreman:
            continue

        # 3. Count timesheets for this specific Foreman, Submission Date, AND Work Date
        timesheet_count = (
            db.query(func.count(models.Timesheet.id))
            .filter(
                models.Timesheet.foreman_id == foreman_id,
                ts_submission_date_col == submission_date,
                models.Timesheet.date == actual_work_date, # Filter by work date
                models.Timesheet.status.in_(TIMESHEET_DASHBOARD_STATUSES),
            )
            .scalar() or 0
        )

        # 4. Count tickets (linked by the same submission date)
        ticket_count = (
            db.query(func.count(models.Ticket.id))
            .filter(
                models.Ticket.foreman_id == foreman_id,
                models.Ticket.status == SubmissionStatus.SUBMITTED.value,
                tk_submission_date_col == submission_date 
            )
            .scalar() or 0
        )
        
        if timesheet_count > 0 or ticket_count > 0:
            notifications.append(
                schemas.Notification(
                    # Unique ID combining Foreman, Submission, and Work date
                    id=int(f"{foreman_id}{submission_date.strftime('%m%d')}{actual_work_date.strftime('%m%d')}"),
                    foreman_id=foreman.id,
                    foreman_name=f"{foreman.first_name} {foreman.last_name}".strip(),
                    foreman_email=foreman.email,
                    date=submission_date, # Used for Dashboard Grouping
                    work_date=actual_work_date, # Used for the API Filter on the next screen
                    timesheet_count=timesheet_count,
                    ticket_count=ticket_count,
                    job_code=None,
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
@router.post("/submit-all-for-date", status_code=200)
def submit_all_for_date(payload: SupervisorSubmitPayload, db: Session = Depends(get_db)):
    """
    Finalizes supervisor approval for all Timesheets & Tickets on a given date.

    Timesheets:
        REVIEWED_BY_SUPERVISOR → APPROVED_BY_SUPERVISOR
    Tickets:
        SUBMITTED → APPROVED_BY_SUPERVISOR
    """
    # Parse the date
    try:
        target_date = payload.date if isinstance(payload.date, date) \
            else datetime.strptime(payload.date, "%Y-%m-%d").date()
    except:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD.")

    FINAL_STATUS = models.SubmissionStatus.APPROVED_BY_SUPERVISOR

    # 1️⃣ Create submission record
    submission = models.SupervisorSubmission(
        supervisor_id=payload.supervisor_id,
        date=target_date,
        status="SubmittedToEngineer"
    )
    db.add(submission)

    # 2️⃣ TIMESHEETS: REVIEWED_BY_SUPERVISOR → APPROVED_BY_SUPERVISOR
    jp = aliased(models.JobPhase)
    pc = aliased(models.PhaseCode)

    timesheets_query = (
            db.query(models.Timesheet, jp)
            .outerjoin(
                jp,
                or_(
                    models.Timesheet.job_phase_id == jp.id,
                    (models.Timesheet.job_phase_id.is_(None)) & 
                    (models.Timesheet.data['job']['job_code'].astext == jp.job_code)
                )
            )
            .outerjoin(
                pc,
                (pc.job_phase_id == jp.id) &
                (pc.code == models.Timesheet.data['job']['phase_codes'][0].astext)
            )
            .filter(
                # CHANGE THIS LINE:
                cast(models.Timesheet.sent_date, Date) == target_date, 
                models.Timesheet.status == models.SubmissionStatus.REVIEWED_BY_SUPERVISOR
            )
        )



    timesheets_to_finalize = timesheets_query.all()

    tickets_to_finalize = (
            db.query(models.Ticket)
            .filter(
                cast(models.Ticket.created_at, Date) == target_date,
                models.Ticket.status == models.SubmissionStatus.SUBMITTED
            )
            .all()
        )

    if not timesheets_to_finalize and not tickets_to_finalize:
        db.rollback()
        raise HTTPException(status_code=400, detail="No timesheets or tickets found to finalize.")

    finalized_ts_count = 0
    finalized_ticket_count = 0

    # ---- Approve Timesheets ----
    for ts, job_phase in timesheets_to_finalize:
        # Determine project engineer
        pe_id = None
        if job_phase:
            pe_id = job_phase.project_engineer_id

        ts.job_phase_id = job_phase.id if job_phase and not ts.job_phase_id else ts.job_phase_id
        ts.status = FINAL_STATUS
        finalized_ts_count += 1

        workflow = models.TimesheetWorkflow(
            timesheet_id=ts.id,
            supervisor_id=payload.supervisor_id,
            engineer_id=pe_id,
            by_role="Supervisor",
            action="Approved",
            timestamp=datetime.utcnow(),
            comments=f"Timesheet approved and forwarded to Project Engineer (User ID: {pe_id})"
        )
        db.add(workflow)

    # ---- Approve Tickets ----
    for tk in tickets_to_finalize:
        tk.status = FINAL_STATUS
        tk.supervisor_id = payload.supervisor_id
        finalized_ticket_count += 1

        workflow = models.TicketWorkflow(
            ticket_id=tk.id,
            supervisor_id=payload.supervisor_id,
            action="Approved",
            by_role="Supervisor",
            timestamp=datetime.utcnow(),
            comments="Ticket approved by Supervisor and included in final submission."
        )
        db.add(workflow)

    db.commit()

    return {
        "message": (
            f"Successfully approved {finalized_ts_count} timesheet(s) "
            f"and {finalized_ticket_count} ticket(s) for submission to Project Engineers."
        )
    }

@router.get("/submitted-dates", response_model=List[date_type])
def get_submitted_dates(supervisor_id: int, db: Session = Depends(get_db)):
    """
    Fetch all distinct dates that have been submitted by this supervisor to the engineer.
    """
    result = (
        db.query(models.SupervisorSubmission.date)
        .filter(
            models.SupervisorSubmission.status == "SubmittedToEngineer",
            models.SupervisorSubmission.supervisor_id == supervisor_id  # filter by user
        )
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


from typing import Dict, List
from pydantic import BaseModel

class StatusResponse(BaseModel):
    can_submit: bool
    unreviewed_timesheets: List[Dict[str, Any]]
    incomplete_tickets: List[Dict[str, Any]]
    status: Optional[str] = None # Include status for completeness

# ---------------- Status Check for Submission (FIXED) ----------------
@router.get("/status-for-date", response_model=StatusResponse)
def get_status_for_date(date: str, supervisor_id: int, db: Session = Depends(get_db)):
    try:
        query_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    # --- 1. Check for UNREVIEWED Timesheets (Timesheets still in SUBMITTED status) ---
    # We group by foreman to show the count per foreman in the error message
    unreviewed_timesheets = (
        db.query(models.User.first_name, models.User.last_name, func.count(models.Timesheet.id).label("count"))
        .join(models.Timesheet, models.Timesheet.foreman_id == models.User.id)
        .filter(
            models.Timesheet.date == query_date,
            models.Timesheet.status == "SUBMITTED", # Assuming 'SUBMITTED' means waiting for supervisor action
        )
        .group_by(models.User.first_name, models.User.last_name)
        .all()
    )
    
    unreviewed_ts_list = [
        {"foreman_name": f"{name} {last}".strip(), "count": count} 
        for name, last, count in unreviewed_timesheets
    ]

    # --- 2. Check for INCOMPLETE Tickets (Tickets missing a job code) ---
    # Note: Ticket model is not fully provided, so we assume a 'job_phase_id' check is sufficient
    incomplete_tickets = (
        db.query(models.User.first_name, models.User.last_name, func.count(models.Ticket.id).label("count"))
        .join(models.Ticket, models.Ticket.foreman_id == models.User.id)
        .filter(
            cast(models.Ticket.created_at, Date) == query_date,
            models.Ticket.status == "SUBMITTED", # Only check submitted tickets
            models.Ticket.phase_code_id.is_(None)  # Use phase_code_id instead of job_phase_id
        )
        .group_by(models.User.first_name, models.User.last_name)
        .all()
    )

    incomplete_ticket_list = [
        {"foreman_name": f"{name} {last}".strip(), "count": count} 
        for name, last, count in incomplete_tickets
    ]

    # --- 3. Determine Final Submission Status ---
    is_blocked = bool(unreviewed_ts_list or incomplete_ticket_list)
    
    # Fetch existing submission record for status labeling (Resubmit vs Submit)
    submission_record = (
        db.query(models.SupervisorSubmission)
        .filter(models.SupervisorSubmission.supervisor_id == supervisor_id)
        .filter(models.SupervisorSubmission.date == query_date)
        .first()
    )

    return {
        "can_submit": not is_blocked,
        "unreviewed_timesheets": unreviewed_ts_list,
        "incomplete_tickets": incomplete_ticket_list,
        "status": submission_record.status if submission_record else None,
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
            models.Timesheet.date == target_date,
            models.Timesheet.status == "APPROVED_BY_SUPERVISOR"
        )
        .all()
    )

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

@router.get("/pe/tickets", response_model=List[schemas.TicketSummary])
def get_pe_tickets(foreman_id: int, date: str, db: Session = Depends(database.get_db)):
    try:
        target_date = DateType.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    tickets = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.foreman_id == foreman_id,
            models.Ticket.ticket_date == target_date,
            models.Ticket.status == models.SubmissionStatus.APPROVED_BY_SUPERVISOR
        )
        .all()
    )

    return tickets


# 2. NEW: Endpoint to Update Ticket Data
@router.patch("/pe/tickets/{ticket_id}", response_model=schemas.Ticket)
def update_pe_ticket(
    ticket_id: int, 
    payload: schemas.TicketUpdate, 
    db: Session = Depends(database.get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Update fields if they are provided in the payload
    update_data = payload.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(ticket, key, value)

    db.commit()
    db.refresh(ticket)
    return ticket

# In your schemas.py or at the top of your router file:
class BulkApprovalPayload(BaseModel):
    foreman_id: int
    date: str  # Date string from frontend, e.g., "2025-11-20"
    supervisor_id: int
from datetime import datetime
from ..models import SubmissionStatus # Assuming you have an Enum for statuses

# ---------------- Supervisor Bulk Approval (NEW ENDPOINT) ----------------
@router.post("/mark-timesheets-reviewed-bulk", status_code=204)
def mark_timesheets_reviewed_bulk(payload: BulkApprovalPayload, db: Session = Depends(get_db)):
    """
    Supervisor marks timesheets for a foreman/date as REVIEWED, 
    changing the status from SUBMITTED to REVIEWED_BY_SUPERVISOR.
    """
    try:
        target_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD.")

    # --- Define the Intermediate Status ---
    NEW_STATUS = models.SubmissionStatus.REVIEWED_BY_SUPERVISOR
    
    # Select timesheets that are SUBMITTED and haven't been reviewed yet
    timesheets_to_review = (
        db.query(models.Timesheet)
        .filter(
            models.Timesheet.foreman_id == payload.foreman_id,
            models.Timesheet.date == target_date,
            models.Timesheet.status == models.SubmissionStatus.SUBMITTED # Target SUBMITTED
        )
        .all()
    )

    if not timesheets_to_review:
        raise HTTPException(status_code=404, detail="No pending timesheets found to mark as reviewed.")

    reviewed_count = 0
    
    for ts in timesheets_to_review:
        # Update Status
        ts.status = NEW_STATUS
        # Record who reviewed it (optional but recommended)
        ts.supervisor_id = payload.supervisor_id 
        reviewed_count += 1
        
        # Create Workflow Entry for auditing the review action
        workflow = models.TimesheetWorkflow(
            timesheet_id=ts.id,
            supervisor_id=payload.supervisor_id,
            action="Reviewed", # New action type
            by_role="Supervisor",
            timestamp=datetime.utcnow(),
            comments="Timesheet marked as reviewed in bulk by Supervisor.",
        )
        db.add(workflow)

    db.commit()

    if reviewed_count == 0:
        # This handles a potential race condition
        raise HTTPException(status_code=400, detail="No timesheets required marking as reviewed.")

    # Return 204 No Content (as used in the provided mock)
    return