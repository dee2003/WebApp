from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import exists, func
from datetime import date
from .. import models, database
from typing import List
from .. import models, schemas
from sqlalchemy import func, cast
from sqlalchemy.sql.sqltypes import Date

from ..database import get_db
router = APIRouter(prefix="/api/project-engineer", tags=["Project Engineer"])

@router.get("/dashboard")
def get_project_engineer_dashboard(project_engineer_id: int, db: Session = Depends(database.get_db)):
    try:
        # 1. Aggregate timesheets per date + foreman
        timesheets = (
            db.query(
                models.Timesheet.date,
                models.Timesheet.foreman_id,
                func.concat_ws(
                    " ",
                    models.User.first_name,
                    models.User.middle_name,
                    models.User.last_name
                ).label("foreman_name"),
                func.min(models.JobPhase.job_code).label("job_code"),  # pick one job code if multiple
                func.count(models.Timesheet.id).label("ts_count")      # count all timesheets
            )
            .join(models.JobPhase, models.Timesheet.job_phase_id == models.JobPhase.id)
            .join(models.User, models.Timesheet.foreman_id == models.User.id)
            .filter(
                models.JobPhase.project_engineer_id == project_engineer_id,
                models.Timesheet.status == "APPROVED_BY_SUPERVISOR",
            )
            .group_by(
                models.Timesheet.date,
                models.Timesheet.foreman_id,
                models.User.first_name,
                models.User.middle_name,
                models.User.last_name
            )
            .all()
        )

        timesheet_data = [
            {
                "date": str(ts.date),
                "foreman_id": ts.foreman_id,
                "foreman_name": ts.foreman_name.strip() if ts.foreman_name else "",
                "job_code": ts.job_code,
                "timesheet_count": ts.ts_count
            }
            for ts in timesheets
        ]

        # 2. Tickets (same grouping logic)
        tickets = (
            db.query(
                models.Ticket.foreman_id,
                func.concat_ws(
                    " ",
                    models.User.first_name,
                    models.User.middle_name,
                    models.User.last_name
                ).label("foreman_name"),
                func.min(models.JobPhase.job_code).label("job_code"),
                cast(models.Ticket.created_at, Date).label("date"),
                func.count(models.Ticket.id).label("ticket_count")
            )
            .join(models.JobPhase, models.Ticket.job_phase_id == models.JobPhase.id)
            .join(models.User, models.Ticket.foreman_id == models.User.id)
            .filter(
                models.JobPhase.project_engineer_id == project_engineer_id,
                models.Ticket.status == "APPROVED_BY_SUPERVISOR"
            )
            .group_by(
                models.Ticket.foreman_id,
                models.User.first_name,
                models.User.middle_name,
                models.User.last_name,
                cast(models.Ticket.created_at, Date)
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

        return {
            "timesheets": timesheet_data,
            "tickets": ticket_data
        }

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
