# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from . import crud, schemas
# from .database import get_db
# # from .crud import get_timesheets
# # from .schemas import TimesheetResponse
# # from typing import List
# router = APIRouter(prefix="/api/timesheets", tags=["Timesheets"])
# @router.post("/", response_model=schemas.TimesheetResponse)
# def create_timesheet(db: Session, ts: schemas.TimesheetCreate):
#     """
#     Create a Timesheet and safely extract job description from nested data.
#     """

#     # Ensure data is JSON-safe
#     data_to_store = jsonable_encoder(ts.data or {})

#     # Extract job name/description safely
#     job_description = None

#     # ✅ Support nested job data structures
#     if isinstance(ts.data, dict):
#         # If frontend includes "job" object (like {"job": {...}})
#         job_info = ts.data.get("job")
#         if isinstance(job_info, dict):
#             job_description = (
#                 job_info.get("job_description")
#                 or job_info.get("job_name")
#                 or job_info.get("job_code")
#             )
#         else:
#             # Or direct job_name if not nested
#             job_description = ts.data.get("job_name")

#     if not job_description:
#         job_description = "Untitled Timesheet"

#     # Create record
#     db_ts = models.Timesheet(
#         foreman_id=ts.foreman_id,
#         date=ts.date,
#         timesheet_name=job_description,  # ✅ always filled
#         data=data_to_store,
#         sent=False,
#     )

#     db.add(db_ts)
#     db.commit()
#     db.refresh(db_ts)
#     return db_ts
# @router.get("/", response_model=list[schemas.TimesheetResponse])
# def list_timesheets(db: Session = Depends(get_db)):
#     return crud.get_timesheets(db)