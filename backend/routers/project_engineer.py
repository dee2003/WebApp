from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import exists, func
from datetime import date
from .. import models, database
from typing import List
from .. import models, schemas
from sqlalchemy import func, cast
from sqlalchemy.sql.sqltypes import Date
from ..models import Timesheet, Ticket, JobPhase, User,PhaseCode

from ..database import get_db
router = APIRouter(prefix="/api/project-engineer", tags=["Project Engineer"])

from sqlalchemy import func, case
from sqlalchemy.dialects.postgresql import JSONB

@router.get("/dashboard")
def get_project_engineer_dashboard(project_engineer_id: int, db: Session = Depends(database.get_db)):
    try:
        # Timesheets query (unchanged - uses Timesheet.date)
        safe_linked_count = func.sum(
            case(
                (func.jsonb_typeof(Timesheet.data["linked_tickets"]) == "array", 
                 func.jsonb_array_length(Timesheet.data["linked_tickets"])),
                else_=0
            )
        ).label("linked_tk_count")

        timesheets = (
            db.query(
                Timesheet.date,                    # ✅ Timesheet date
                Timesheet.foreman_id,
                func.concat_ws(" ", User.first_name, User.middle_name, User.last_name).label("foreman_name"),
                func.min(JobPhase.job_code).label("job_code"),
                func.count(Timesheet.id).label("ts_count"),
                safe_linked_count
            )
            .join(JobPhase, JobPhase.job_code == Timesheet.data["job"]["job_code"].astext)
            .join(User, Timesheet.foreman_id == User.id)
            .filter(
                JobPhase.project_engineer_id == project_engineer_id,
                Timesheet.status == "APPROVED_BY_SUPERVISOR"
            )
            .group_by(Timesheet.date, Timesheet.foreman_id, User.first_name, User.middle_name, User.last_name)
            .all()
        )

        timesheet_data = [
            {
                "date": str(ts.date),
                "foreman_id": ts.foreman_id,
                "foreman_name": ts.foreman_name.strip() if ts.foreman_name else "",
                "job_code": ts.job_code,
                "timesheet_count": ts.ts_count,
                "linked_ticket_count": int(ts.linked_tk_count or 0)
            }
            for ts in timesheets
        ]

        # ✅ FIXED: Use Ticket.date (timesheet date) for consistent grouping
        tickets = (
            db.query(
                Ticket.date.label("date"),         # ✅ Timesheet date (consistent with timesheets)
                Ticket.foreman_id,
                func.concat_ws(" ", User.first_name, User.middle_name, User.last_name).label("foreman_name"),
                JobPhase.job_code.label("job_code"),
                func.count(Ticket.id).label("ticket_count")
            )
            .outerjoin(JobPhase, Ticket.job_phase_id == JobPhase.id)  # ✅ Use job_phase_id relationship
            .join(User, Ticket.foreman_id == User.id)
            .filter(
                JobPhase.project_engineer_id == project_engineer_id,  # Works with outer join
                Ticket.status == "APPROVED_BY_SUPERVISOR"
            )
            .group_by(
                Ticket.date,                       # ✅ Group by timesheet date
                Ticket.foreman_id, 
                User.first_name, 
                User.middle_name, 
                User.last_name, 
                JobPhase.job_code
            )
            .all()
        )

        ticket_data = [
            {
                "date": str(tk.date),
                "foreman_id": tk.foreman_id,
                "foreman_name": tk.foreman_name.strip() if tk.foreman_name else "",
                "job_code": tk.job_code,
                "ticket_count": tk.ticket_count
            }
            for tk in tickets
        ]

        return {"timesheets": timesheet_data, "tickets": ticket_data}

    except Exception as e:
        print(f"🔥 ERROR in /dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pe/timesheets")
def get_timesheet_for_pe_review(
    foreman_id: int,
    date: date,
    db: Session = Depends(database.get_db),
):
    timesheet = (
        db.query(models.Timesheet)
        .filter(
            models.Timesheet.foreman_id == foreman_id,
            models.Timesheet.date == date,
            models.Timesheet.status == "APPROVED_BY_SUPERVISOR",
        )
        .first()
    )

    if not timesheet:
        raise HTTPException(
            status_code=404,
            detail="Timesheet not found or not submitted for review."
        )

    return timesheet
from ..models import User, UserRole

@router.get("/", response_model=List[schemas.User])
def get_project_engineers(db: Session = Depends(get_db)):
    """
    Returns only users with role 'project_engineer'
    """
    return db.query(User).filter(User.role == UserRole.PROJECT_ENGINEER).all()
