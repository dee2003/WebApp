# from fastapi import APIRouter, Depends, HTTPException, status, Query
# from sqlalchemy.orm import Session, joinedload
# from typing import List,Optional
# from .. import models, schemas
# from ..database import get_db
# import os
# from .. import models, schemas # This line already imports your schemas

# import pandas as pd
# import json
# from datetime import datetime

# router = APIRouter(
#     prefix="/api/timesheets",
#     tags=["Timesheets"]
# )
# from datetime import datetime
# from sqlalchemy import func, case
# from .. import models, schemas, database

# from sqlalchemy import String, literal

# @router.get("/counts-by-status", response_model=schemas.TimesheetCountsResponse)
# def get_timesheet_counts_by_status(db: Session = Depends(get_db)):
#     try:
#         # ✅ Ensure values match DB enum exactly
#         foreman_statuses = [
#             models.SubmissionStatus.DRAFT.value,
#             models.SubmissionStatus.PENDING.value,
#             models.SubmissionStatus.REJECTED.value,
#         ]

#         supervisor_statuses = [
#             models.SubmissionStatus.SUBMITTED.value,
#             models.SubmissionStatus.SENT.value,  # -> "Sent"
#         ]

#         engineer_status = models.SubmissionStatus.APPROVED.value

#         counts_query = db.query(
#             func.count(
#                 case((models.Timesheet.status.cast(String).in_(foreman_statuses), 1))
#             ).label("foreman_total"),

#             func.count(
#                 case((models.Timesheet.status.cast(String).in_(supervisor_statuses), 1))
#             ).label("supervisor_total"),

#             func.count(
#                 case((models.Timesheet.status.cast(String) == engineer_status, 1))
#             ).label("engineer_total")
#         ).first()

#         print("DEBUG foreman_statuses:", foreman_statuses)
#         print("DEBUG supervisor_statuses:", supervisor_statuses)

#         return {
#             "foreman": int(counts_query.foreman_total or 0),
#             "supervisor": int(counts_query.supervisor_total or 0),
#             "project_engineer": int(counts_query.engineer_total or 0),
#         }

#     except Exception as e:
#         print(f"[ERROR] Failed to calculate timesheet counts: {e}")
#         raise HTTPException(
#             status_code=500,
#             detail="An internal error occurred while calculating timesheet counts."
#         )

    
# @router.post("/", response_model=schemas.Timesheet)
# # @audit(action="CREATED", entity="Timesheet")
# def create_timesheet(timesheet: schemas.TimesheetCreate, db: Session = Depends(get_db)):
#     data_to_store = timesheet.data or {}

#     # --- Derive job name robustly (handles all frontend variants) ---
#     job_name = (
#         data_to_store.get("job_name")
#         or (data_to_store.get("job") or {}).get("job_description")
#         or (data_to_store.get("job") or {}).get("job_name")
#         or (data_to_store.get("job") or {}).get("job_code")
#         or "Untitled Timesheet"
#     )

#     # --- Create new timesheet entry ---
#     db_ts = models.Timesheet(
#         foreman_id=timesheet.foreman_id,
#         job_phase_id=timesheet.job_phase_id,
#         date=timesheet.date,
#         status="DRAFT",                 # ✅ Use uppercase (matches enum)
#         data=data_to_store,             # JSONB payload
#         timesheet_name=job_name         # Readable name in admin panel
#     )

#     db.add(db_ts)
#     db.commit()
#     db.refresh(db_ts)
#     return db_ts



# @router.get("/by-foreman/{foreman_id}", response_model=List[schemas.Timesheet])
# def get_timesheets_by_foreman(foreman_id: int, db: Session = Depends(get_db)):
#     """
#     Returns only editable timesheets (Draft or Pending) for a given foreman.
#     'Sent' or 'Approved' timesheets will no longer appear in the app list.
#     """
#     timesheets = (
#         db.query(models.Timesheet)
#         .options(joinedload(models.Timesheet.files))
#         .filter(
#             models.Timesheet.foreman_id == foreman_id,
#             models.Timesheet.status.in_([
#                 models.SubmissionStatus.DRAFT,
#                 models.SubmissionStatus.PENDING
#             ])
#         )
#         .order_by(models.Timesheet.date.desc())
#         .all()
#     )
#     return timesheets


# from datetime import date as date_type
# from sqlalchemy import cast, Date
# @router.get("/for-supervisor", response_model=List[schemas.Timesheet])
# def get_timesheets_for_supervisor(
#     db: Session = Depends(get_db),
#     foreman_id: Optional[int] = Query(None),
#     date: Optional[str] = Query(None),
# ):
#     """
#     Returns all SUBMITTED timesheets for supervisors to review.
#     Filters by foreman_id and/or work date (timesheet.date).
#     """
#     # Use "status" instead of "sent"
#     query = (
#         db.query(models.Timesheet)
#         .options(joinedload(models.Timesheet.files))
#         .filter(models.Timesheet.status == "SUBMITTED")
#     )

#     if foreman_id is not None:
#         query = query.filter(models.Timesheet.foreman_id == foreman_id)

#     if date:
#         try:
#             target_date = date_type.fromisoformat(date)
#             query = query.filter(cast(models.Timesheet.date, Date) == target_date)
#         except ValueError:
#             raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

#     # Optional: latest submitted first
#     timesheets = query.order_by(models.Timesheet.updated_at.desc()).all()

#     return timesheets


# @router.get("/{timesheet_id}")
# def get_single_timesheet(timesheet_id: int, db: Session = Depends(get_db)):
#     """
#     Returns a single timesheet, safely enriching the foreman-saved JSON with static info
#     from the database for all entities (employees, equipment, materials, vendors, and dumping sites).
#     """
#     timesheet = (
#         db.query(models.Timesheet)
#         .options(joinedload(models.Timesheet.files))
#         .filter(models.Timesheet.id == timesheet_id)
#         .first()
#     )
#     if not timesheet:
#         raise HTTPException(status_code=404, detail="Timesheet not found")
#     # --- Load and validate data ---
#     saved_data = timesheet.data or {}
#     if isinstance(saved_data, str):
#         try:
#             saved_data = json.loads(saved_data)
#         except json.JSONDecodeError:
#             saved_data = {}
#     # --- Generic enrichment helper (FIXED) ---
#     def enrich_entities(entity_key: str, model, name_fields: list, source_key: str = None):
#         """
#         Enriches entities, handling two source types:
#         1. Array of objects (e.g., 'employees', 'equipment')
#         2. Array of IDs (e.g., 'selected_vendors', 'selected_materials')
#         The enrichment is always stored under a new key: entity_key (e.g., 'enriched_employees').
#         """
#         source_data = saved_data.get(source_key or entity_key, [])
#         if not source_data:
#             saved_data[f"enriched_{entity_key}"] = []
#             return
#         # Determine IDs and whether the source is already a list of objects
#         is_list_of_objects = False
#         entity_ids = []
#         if source_data and isinstance(source_data, list):
#             # Check if the first item is a dictionary with an 'id' key (e.g., employees, equipment)
#             if source_data and isinstance(source_data[0], dict) and source_data[0].get("id"):
#                 is_list_of_objects = True
#                 entity_ids = [str(e.get("id")) for e in source_data if e.get("id")]
#             # Otherwise, assume it's a list of IDs (e.g., selected_vendors)
#             else:
#                 entity_ids = [str(e) for e in source_data]
#         if not entity_ids:
#             saved_data[f"enriched_{entity_key}"] = []
#             return
#         # Fetch database records
#         db_entities = db.query(model).filter(model.id.in_(entity_ids)).all()
#         db_map = {str(db_e.id): db_e for db_e in db_entities}
#         enriched_list = []
#         if is_list_of_objects:
#             # For lists of objects (like employees/equipment), merge DB data into the saved object
#             for entity in source_data:
#                 db_record = db_map.get(str(entity.get("id")))
#                 if db_record:
#                     # Merge DB fields into the saved entity object
#                     for field in name_fields:
#                         entity[field] = getattr(db_record, field, entity.get(field))
#                     # Add full name for easy access
#                     name_parts = [getattr(db_record, field, "") for field in name_fields]
#                     entity["name"] = " ".join(filter(None, name_parts)).strip()
#                     # Add category/related info if available (e.g., for equipment)
#                     if hasattr(db_record, 'category_rel') and db_record.category_rel:
#                          entity['category_rel'] = {'name': db_record.category_rel.name}
#                 enriched_list.append(entity)
#         else:
#             # For lists of IDs (like vendors/materials), create new objects from DB data
#             for entity_id in entity_ids:
#                 db_record = db_map.get(entity_id)
#                 if db_record:
#                     new_entity = {"id": entity_id}
#                     name_parts = [getattr(db_record, field, "") for field in name_fields]
#                     new_entity["name"] = " ".join(filter(None, name_parts)).strip()
#                     # Copy other essential fields like VIN for equipment, etc.
#                     for field in name_fields:
#                         new_entity[field] = getattr(db_record, field, None)
#                     enriched_list.append(new_entity)
#         # Store the enriched list under a new, consistent key
#         saved_data[entity_key] = enriched_list # Overwrite the source key with the enriched list for consistency
#     # --- Call the enricher for all entities ---
#     try:
#         if hasattr(models, "Employee"):
#             # Employees are stored as an array of objects in data['employees']
#             enrich_entities("employees", models.Employee, ["first_name", "last_name", "status"])
#         if hasattr(models, "Equipment"):
#             # Equipment is stored as an array of objects in data['equipment']
#             enrich_entities("equipment", models.Equipment, ["name", "vin_number", "status"])
#         if hasattr(models, "Vendor"):
#             # Vendors are stored as an array of IDs in data['selected_vendors']
#             enrich_entities("vendors", models.Vendor, ["name"], source_key="selected_vendors")
#         if hasattr(models, "Material"):
#             # Materials are stored as an array of IDs in data['selected_materials']
#             enrich_entities("materials_trucking", models.MaterialTrucking, ["name"], source_key="selected_materials")
#         if hasattr(models, "DumpingSite"):
#             # Dumping Sites are stored as an array of IDs in data['selected_dumping_sites']
#             enrich_entities("dumping_sites", models.DumpingSite, ["name"], source_key="selected_dumping_sites")
#     except Exception as e:
#         print(f":warning: Critical Enrichment Error: {e}")
#         # Consider re-raising the exception or logging it more formally
#     # --- Return consistent structure for frontend ---
#     return {
#         "id": timesheet.id,
#         "foreman_id": timesheet.foreman_id,
#         "job_phase_id": timesheet.job_phase_id,
#         "date": timesheet.date,
#         "status": timesheet.status,
#         "timesheet_name": timesheet.timesheet_name,
#         "data": saved_data,
#     }

# @router.put("/{timesheet_id}", response_model=schemas.Timesheet)
# # @audit(action="UPDATED", entity="Timesheets")

# def update_timesheet(
#     timesheet_id: int,
#     timesheet_update: schemas.TimesheetUpdate,
#     db: Session = Depends(get_db)
# ):
#     # --- Fetch timesheet ---
#     ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
#     if not ts:
#         raise HTTPException(status_code=404, detail="Timesheet not found")

#     payload = timesheet_update.dict(exclude_unset=True)

#     if "data" in payload:
#         ts.data = payload["data"]
#     if "status" in payload and payload["status"] == "IN_PROGRESS":
#         ts.status = SubmissionStatus.IN_PROGRESS
#     if "status" in payload:
#         ts.status = payload["status"]

#     # --- Keep job name synced ---
#     data_to_store = ts.data or {}
#     job_name = (
#         data_to_store.get("job_name")
#         or (data_to_store.get("job") or {}).get("job_description")
#         or (data_to_store.get("job") or {}).get("job_name")
#         or (data_to_store.get("job") or {}).get("job_code")
#         or "Untitled Timesheet"
#     )
#     ts.timesheet_name = job_name
#     ts.data["job_name"] = job_name

#     db.commit()
#     db.refresh(ts)

#     # --- Excel file generation ---
#     try:
#         BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
#         storage_dir = os.path.join(BASE_DIR, "storage")
#         os.makedirs(storage_dir, exist_ok=True)

#         ts_date_str = ts.date.strftime("%Y-%m-%d") if hasattr(ts.date, "strftime") else str(ts.date)
#         date_folder = os.path.join(storage_dir, ts_date_str)
#         os.makedirs(date_folder, exist_ok=True)

#         version = len([f for f in os.listdir(date_folder) if f.startswith(f"timesheet_{ts.id}_")]) + 1
#         file_name = f"timesheet_{ts.id}_{ts_date_str}_v{version}.xlsx"
#         file_path_local = os.path.join(date_folder, file_name)

#         data = ts.data if isinstance(ts.data, dict) else json.loads(ts.data)
#         job_phases = data.get("job", {}).get("phase_codes", [])

#         def create_df(entities, name_key="name"):
#             rows = []
#             for ent in entities:
#                 name = ent.get(name_key) or ent.get("first_name", "")
#                 if "last_name" in ent:
#                     name = f"{name} {ent.get('last_name', '')}".strip()
#                 row = {"ID": ent.get("id", ""), "Name": name}
#                 for phase in job_phases:
#                     row[phase] = ent.get("hours_per_phase", {}).get(phase, 0)
#                 rows.append(row)
#             return pd.DataFrame(rows)

#         def create_dumping_site_df(entities):
#             rows = []
#             for ent in entities:
#                 row = {"ID": ent.get("id", ""), "Name": ent.get("name", "")}
#                 for phase in job_phases:
#                     row[f"{phase} (# of Loads)"] = ent.get("hours_per_phase", {}).get(phase, 0)
#                     row[f"{phase} (Qty)"] = ent.get("tickets_per_phase", {}).get(phase, 0)
#                 rows.append(row)
#             return pd.DataFrame(rows)

#         with pd.ExcelWriter(file_path_local, engine="openpyxl") as writer:
#             create_df(data.get("employees", []), name_key="first_name").to_excel(writer, index=False, sheet_name="Employees")
#             create_df(data.get("equipment", [])).to_excel(writer, index=False, sheet_name="Equipment")
#             create_df(data.get("materials", [])).to_excel(writer, index=False, sheet_name="Materials")
#             create_df(data.get("vendors", [])).to_excel(writer, index=False, sheet_name="Vendors")
#             create_dumping_site_df(data.get("dumping_sites", [])).to_excel(writer, index=False, sheet_name="DumpingSites")

#         # ✅ Replace ngrok link with your own base URL
#         NGROK_BASE_URL = "https://312688ba0191.ngrok-free.app"
#         file_url = f"{NGROK_BASE_URL}/storage/{ts_date_str}/{file_name}"

#         # ✅ Save file info in DB
#         file_record = models.TimesheetFile(
#             timesheet_id=ts.id,
#             foreman_id=ts.foreman_id,
#             file_path=file_url
#         )
#         db.add(file_record)
#         db.commit()
#         db.refresh(file_record)

#         print(f"✅ Timesheet Excel generated and saved at: {file_url}")

#     except Exception as e:
#         print(f"❌ Excel generation failed: {e}")

#     return ts
# # -------------------------------
# # SEND a timesheet
# # -------------------------------
# from datetime import datetime


# from ..models import SubmissionStatus

# @router.post("/{timesheet_id}/send", response_model=schemas.Timesheet)
# def send_timesheet(timesheet_id: int, db: Session = Depends(get_db)):
#     ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
#     if not ts:
#         raise HTTPException(status_code=404, detail="Timesheet not found")

#     if ts.status == SubmissionStatus.SUBMITTED:
#         raise HTTPException(status_code=400, detail="Timesheet already sent")

#     ts.sent = True
#     ts.sent_date = datetime.utcnow()
#     ts.status = SubmissionStatus.SUBMITTED  # ✅ fixed value

#     workflow = models.TimesheetWorkflow(
#         timesheet_id=ts.id,
#         foreman_id=ts.foreman_id,
#         action="Sent",
#         by_role="Foreman",
#         timestamp=datetime.utcnow(),
#         comments="Sent to supervisor",
#     )
#     db.add(workflow)
#     db.commit()
#     db.refresh(ts)
#     return ts
# # -------------------------------
# # DELETE a timesheet
# # -------------------------------
# @router.delete("/{timesheet_id}", status_code=status.HTTP_204_NO_CONTENT)
# # @audit(action="Deleted", entity="Timesheets")

# def delete_timesheet(timesheet_id: int, db: Session = Depends(get_db)):
#     ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
#     if not ts:
#         raise HTTPException(status_code=404, detail="Timesheet not found")
#     db.delete(ts)
#     db.commit()
#     return
# # In your routers/timesheet.py


# @router.get("/", response_model=List[schemas.TimesheetResponse])
# def list_timesheets(db: Session = Depends(get_db)):
#     """
#     Returns a list of all timesheets with foreman names and job names included.
#     This is optimized for the admin dashboard view.
#     """
#     timesheets = db.query(models.Timesheet).options(joinedload(models.Timesheet.foreman)).all()
    
#     response = []
#     for ts in timesheets:
#         foreman_name = f"{ts.foreman.first_name} {ts.foreman.last_name}" if ts.foreman else "N/A"
        
#         # Create the response object, ensuring all required fields are present
#         response.append(schemas.TimesheetResponse(
#             id=ts.id,
#             date=ts.date,
#             foreman_id=ts.foreman_id,
#             foreman_name=foreman_name,
#             job_name=ts.timesheet_name,  # <-- The FIX: Populate the required 'job_name' field
#             data=ts.data,
#             status=ts.status
#         ))
        
#     return response
# from sqlalchemy import or_
# from ..models import SubmissionStatus  # ✅ use your enum safely

# @router.get("/drafts/by-foreman/{foreman_id}", response_model=List[schemas.Timesheet])
# def get_draft_timesheets_by_foreman(foreman_id: int, db: Session = Depends(get_db)):
#     """
#     Returns all draft/pending timesheets for a given foreman.
#     This is used by the new ReviewTimesheetScreen.
#     """
#     timesheets = (
#         db.query(models.Timesheet)
#         .options(joinedload(models.Timesheet.files))
#         .filter(models.Timesheet.foreman_id == foreman_id)
#         .filter(
#             or_(
#                 models.Timesheet.status == SubmissionStatus.PENDING

#             )
#         )
#         .order_by(models.Timesheet.date.desc())
#         .all()
#     )
#     return timesheets


# # @router.post("/timesheets/save-draft/")
# # def save_draft(timesheet: schemas.TimesheetCreate, db: Session = Depends(get_db)):
# #     """
# #     Save a timesheet draft. Each save creates a new row.
# #     """
# #     new_ts = models.Timesheet(
# #         foreman_id=timesheet.foreman_id,
# #         job_name=timesheet.job_name,
# #         date=datetime.utcnow(),
# #         status=SubmissionStatus.DRAFT,  # ✅ ENUM-safe value
# #         data=json.dumps(timesheet.data)  # store JSON as string
# #     )
# #     db.add(new_ts)
# #     db.commit()
# #     db.refresh(new_ts)
# #     return {"message": "Draft saved", "timesheet_id": new_ts.id}

# @router.post("/timesheets/save-draft/")
# def save_draft(timesheet: schemas.TimesheetCreate, db: Session = Depends(get_db)):
#     """
#     Save or update a timesheet draft.
#     - If timesheet.id exists -> update existing draft.
#     - Else -> create new draft.
#     """
#     # ✅ 1. Check if it's an existing draft
#     if timesheet.id:
#         existing_ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet.id).first()
#         if existing_ts:
#             existing_ts.data = json.dumps(timesheet.data)
#             existing_ts.job_name = timesheet.job_name
#             existing_ts.status = SubmissionStatus.DRAFT  # always save as draft
#             existing_ts.date = datetime.utcnow()
#             db.commit()
#             db.refresh(existing_ts)
#             return {"message": "Draft updated", "timesheet_id": existing_ts.id}

#     # ✅ 2. Else, create a new draft
#     new_ts = models.Timesheet(
#         foreman_id=timesheet.foreman_id,
#         job_name=timesheet.job_name,
#         date=datetime.utcnow(),
#         status=SubmissionStatus.DRAFT,
#         data=json.dumps(timesheet.data)
#     )
#     db.add(new_ts)
#     db.commit()
#     db.refresh(new_ts)
#     return {"message": "Draft created", "timesheet_id": new_ts.id}

# @router.get("/timesheets/drafts/by-foreman/{foreman_id}")
# def get_drafts(foreman_id: int, db: Session = Depends(get_db)):
#     """
#     Fetch all draft timesheets for a foreman
#     """
#     drafts = (
#         db.query(models.Timesheet)
#         .filter(models.Timesheet.foreman_id == foreman_id)
#         .filter(models.Timesheet.status == SubmissionStatus.DRAFT)  # ✅ uppercase ENUM
#         .order_by(models.Timesheet.date.desc())
#         .all()
#     )

#     # Convert JSON string to dict
#     return [
#         {**{"id": t.id, "job_name": t.job_name, "date": t.date}, **json.loads(t.data)}
#         for t in drafts
#     ]








from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List,Optional
from .. import models, schemas
from ..database import get_db
import os
from .. import models, schemas # This line already imports your schemas

import pandas as pd
import json
from datetime import datetime

from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter(
    prefix="/api/timesheets",
    tags=["Timesheets"]
)
from datetime import datetime
from sqlalchemy import func, case
from .. import models, schemas, database

from sqlalchemy import String, literal


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH)

BASE_URL = os.getenv("BASE_URL")
print("🔗 [Router] BASE_URL loaded:", BASE_URL)

@router.get("/counts-by-status", response_model=schemas.TimesheetCountsResponse)
def get_timesheet_counts_by_status(db: Session = Depends(get_db)):
    try:
        # ✅ Ensure values match DB enum exactly
        foreman_statuses = [
            models.SubmissionStatus.DRAFT.value,
            models.SubmissionStatus.PENDING.value,
            models.SubmissionStatus.REJECTED.value,
        ]

        supervisor_statuses = [
            models.SubmissionStatus.SUBMITTED.value,
            models.SubmissionStatus.SENT.value,  # -> "Sent"
        ]

        engineer_status = models.SubmissionStatus.APPROVED.value

        counts_query = db.query(
            func.count(
                case((models.Timesheet.status.cast(String).in_(foreman_statuses), 1))
            ).label("foreman_total"),

            func.count(
                case((models.Timesheet.status.cast(String).in_(supervisor_statuses), 1))
            ).label("supervisor_total"),

            func.count(
                case((models.Timesheet.status.cast(String) == engineer_status, 1))
            ).label("engineer_total")
        ).first()

        print("DEBUG foreman_statuses:", foreman_statuses)
        print("DEBUG supervisor_statuses:", supervisor_statuses)

        return {
            "foreman": int(counts_query.foreman_total or 0),
            "supervisor": int(counts_query.supervisor_total or 0),
            "project_engineer": int(counts_query.engineer_total or 0),
        }

    except Exception as e:
        print(f"[ERROR] Failed to calculate timesheet counts: {e}")
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while calculating timesheet counts."
        )

    
@router.post("/", response_model=schemas.Timesheet)
# @audit(action="CREATED", entity="Timesheet")
def create_timesheet(timesheet: schemas.TimesheetCreate, db: Session = Depends(get_db)):
    data_to_store = timesheet.data or {}

    # --- Derive job name robustly (handles all frontend variants) ---
    job_name = (
        data_to_store.get("job_name")
        or (data_to_store.get("job") or {}).get("job_description")
        or (data_to_store.get("job") or {}).get("job_name")
        or (data_to_store.get("job") or {}).get("job_code")
        or "Untitled Timesheet"
    )

    # --- Create new timesheet entry ---
    db_ts = models.Timesheet(
        foreman_id=timesheet.foreman_id,
        job_phase_id=timesheet.job_phase_id,
        date=timesheet.date,
        status="DRAFT",                 # ✅ Use uppercase (matches enum)
        data=data_to_store,             # JSONB payload
        timesheet_name=job_name         # Readable name in admin panel
    )

    db.add(db_ts)
    db.commit()
    db.refresh(db_ts)
    return db_ts



@router.get("/by-foreman/{foreman_id}", response_model=List[schemas.Timesheet])
def get_timesheets_by_foreman(foreman_id: int, db: Session = Depends(get_db)):
    """
    Returns only editable timesheets (Draft or Pending) for a given foreman.
    'Sent' or 'Approved' timesheets will no longer appear in the app list.
    """
    timesheets = (
        db.query(models.Timesheet)
        .options(joinedload(models.Timesheet.files))
        .filter(
            models.Timesheet.foreman_id == foreman_id,
            models.Timesheet.status.in_([
                models.SubmissionStatus.DRAFT,
                models.SubmissionStatus.PENDING
            ])
        )
        .order_by(models.Timesheet.date.desc())
        .all()
    )
    return timesheets


from datetime import date as date_type
from sqlalchemy import cast, Date
@router.get("/for-supervisor", response_model=List[schemas.Timesheet])
def get_timesheets_for_supervisor(
    db: Session = Depends(get_db),
    foreman_id: Optional[int] = Query(None),
    date: Optional[str] = Query(None),
):
    """
    Returns all SUBMITTED timesheets for supervisors to review.
    Filters by foreman_id and/or work date (timesheet.date).
    """
    # Use "status" instead of "sent"
    query = (
        db.query(models.Timesheet)
        .options(joinedload(models.Timesheet.files))
        .filter(models.Timesheet.status == "SUBMITTED")
    )

    if foreman_id is not None:
        query = query.filter(models.Timesheet.foreman_id == foreman_id)

    if date:
        try:
            target_date = date_type.fromisoformat(date)
            query = query.filter(cast(models.Timesheet.date, Date) == target_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Optional: latest submitted first
    timesheets = query.order_by(models.Timesheet.updated_at.desc()).all()

    return timesheets


@router.get("/{timesheet_id}")

def get_single_timesheet(timesheet_id: int, db: Session = Depends(get_db)):
    """
    Returns a single timesheet, prioritizing saved JSON data and only enriching
    non-conflicting fields from static database models.
    """

    timesheet = (
        db.query(models.Timesheet)
        .options(joinedload(models.Timesheet.files))
        .filter(models.Timesheet.id == timesheet_id)
        .first()
    )
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    saved_data = timesheet.data or {}
    if isinstance(saved_data, str):
        try:
            saved_data = json.loads(saved_data)
        except json.JSONDecodeError:
            saved_data = {}

    # --- ENRICHMENT HELPER FUNCTION ---
    def enrich_entities(entity_key: str, model, name_fields: list, add_phase_defaults: bool = False, skip_name_enrichment: bool = False):
        source_data = saved_data.get(entity_key, [])
        if not source_data:
            return

        # 1. Collect all entity IDs to query the static database table once.
        entity_ids = {str(e.get("id")) for e in source_data if isinstance(e, dict) and e.get("id")}
        if not entity_ids:
            return

        db_entities = db.query(model).filter(model.id.in_(entity_ids)).all()
        db_map = {str(db_e.id): db_e for db_e in db_entities}
        phase_codes = saved_data.get("job", {}).get("phase_codes", [])
        enriched_list = []

        for entity in source_data:
            # 2. CRITICAL: Create a shallow copy to retain ALL saved keys
            # (including hours_per_phase, tickets_per_phase, and the saved 'name').
            enriched_entity = entity.copy() 
            eid = str(enriched_entity.get("id"))
            db_record = db_map.get(eid)

            # 3. Preserve existing phase fields or add defaults if missing
            if add_phase_defaults:
                # Merge saved hours with DB phases
                existing_hours = enriched_entity.get("hours_per_phase", {})
                merged_hours = {p: existing_hours.get(p, 0) for p in phase_codes}
                enriched_entity["hours_per_phase"] = merged_hours

            # Preserve tickets_loads if present
            if "tickets_loads" in enriched_entity:
                enriched_entity["tickets_loads"] = enriched_entity.get("tickets_loads", {})
            

            # 4. Apply Database Enrichment
            if db_record:
                if not skip_name_enrichment:
                    # Logic for Employees (FirstName/LastName) or Equipment (Name)
                    # Compose and update 'name' field from DB attributes
                    name_parts = [getattr(db_record, f, "") for f in name_fields]
                    enriched_entity["name"] = " ".join(filter(None, name_parts)).strip()
                    
                    # Update other non-name fields (like 'status' for employee)
                    for field in name_fields:
                        if field not in ("first_name", "last_name", "name"): 
                            enriched_entity[field] = getattr(db_record, field, enriched_entity.get(field))

                # If skip_name_enrichment is TRUE (for vendors/dumping sites), 
                # the original saved name and all phase data are automatically preserved
                # by the initial 'entity.copy()' in step 2.

            enriched_list.append(enriched_entity)

        saved_data[entity_key] = enriched_list
    
    # --- EXECUTE ENRICHMENT ---
    try:
        if hasattr(models, "Employee"):
            # Employee names must be rebuilt from DB fields (First Name, Last Name)
            enrich_entities("employees", models.Employee, ["first_name", "last_name", "status"])
            
        if hasattr(models, "Equipment"):
            # Equipment names are usually enriched/validated
            enrich_entities("equipment", models.Equipment, ["name"])
        
        # VENDORS: skip_name_enrichment=True ensures saved name and phase data are kept.
        if hasattr(models, "Vendor"):
            enrich_entities("vendors", models.Vendor, ["name"], add_phase_defaults=False)
            
        # MATERIALS_TRUCKING: Assuming standard enrichment (no skip).
        if hasattr(models, "MaterialTrucking"):
            enrich_entities("materials_trucking", models.MaterialTrucking, ["name"], add_phase_defaults=False)
            
        # DUMPING_SITES: skip_name_enrichment=True ensures saved name and phase data are kept.
        if hasattr(models, "DumpingSite"):
            enrich_entities("dumping_sites", models.DumpingSite, ["name"], add_phase_defaults=False)
            
    except Exception as e:
        print(f"⚠️ Critical enrichment error: {e}")
        # Depending on severity, you might want to re-raise the exception or log it.

    # --- FINAL RETURN ---

    return {
        "id": timesheet.id,
        "foreman_id": timesheet.foreman_id,
        "job_phase_id": timesheet.job_phase_id,
        "date": timesheet.date,
        "status": timesheet.status,
        "timesheet_name": timesheet.timesheet_name,
        "data": saved_data,
    }

# @router.put("/{timesheet_id}", response_model=schemas.Timesheet)
# def update_timesheet(
#     timesheet_id: int,
#     timesheet_update: schemas.TimesheetUpdate,
#     db: Session = Depends(get_db)
# ):
#     ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
#     if not ts:
#         raise HTTPException(status_code=404, detail="Timesheet not found")

#     payload = timesheet_update.dict(exclude_unset=True)

#     # --- Merge frontend data into existing ts.data ---
#     if "data" in payload:
#         existing_data = ts.data or {}
#         incoming_data = payload["data"]

#         for key, val in incoming_data.items():
#             if isinstance(val, list):
#     # Handle lists like vendors, dumping_sites, materials_trucking, etc.
#                 existing_list = existing_data.get(key, [])
#                 existing_map = {
#                     str(e.get("id")): e
#                     for e in existing_list
#                     if isinstance(e, dict) and "id" in e
#                 }


#                 for new_item in val:
#                     eid = str(new_item.get("id"))
#                     if eid in existing_map:
#                         existing_entry = existing_map[eid]

#                         # --- Deep merge nested fields ---
#                         for nk in ["hours_per_phase", "tickets_per_phase"]:
#                             if nk in new_item:
#                                 existing_entry.setdefault(nk, {}).update(new_item[nk])

#                         # --- Merge top-level fields (name, category, etc.) ---
#                         for nk, nv in new_item.items():
#                             if nk not in ["id", "hours_per_phase", "tickets_per_phase"]:
#                                 existing_entry[nk] = nv
#                     else:
#                         # For new entries, ensure empty nested dicts exist
#                         new_item.setdefault("hours_per_phase", {})
#                         new_item.setdefault("tickets_per_phase", {})
#                         existing_map[eid] = new_item

#                 existing_data[key] = list(existing_map.values())

    
#             elif isinstance(val, dict):
#                 existing_data.setdefault(key, {}).update(val)
#             else:
#                 existing_data[key] = val


#         ts.data = existing_data

#     # --- Status update ---
#     if "status" in payload and payload["status"] == "IN_PROGRESS":
#         ts.status = SubmissionStatus.IN_PROGRESS
#     if "status" in payload:
#         ts.status = payload["status"]

#     # --- Keep job name synced ---
#     data_to_store = ts.data or {}
#     job_name = (
#         data_to_store.get("job_name")
#         or (data_to_store.get("job") or {}).get("job_description")
#         or (data_to_store.get("job") or {}).get("job_name")
#         or (data_to_store.get("job") or {}).get("job_code")
#         or "Untitled Timesheet"
#     )
#     ts.timesheet_name = job_name
#     ts.data["job_name"] = job_name

#     db.commit()
#     db.refresh(ts)

#     # --- Excel generation ---
#     try:
#         BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
#         storage_dir = os.path.join(BASE_DIR, "storage")
#         os.makedirs(storage_dir, exist_ok=True)

#         ts_date_str = ts.date.strftime("%Y-%m-%d") if hasattr(ts.date, "strftime") else str(ts.date)
#         date_folder = os.path.join(storage_dir, ts_date_str)
#         os.makedirs(date_folder, exist_ok=True)

#         version = len([f for f in os.listdir(date_folder) if f.startswith(f"timesheet_{ts.id}_")]) + 1
#         file_name = f"timesheet_{ts.id}_{ts_date_str}_v{version}.xlsx"
#         file_path_local = os.path.join(date_folder, file_name)

#         data = ts.data if isinstance(ts.data, dict) else json.loads(ts.data)
#         job_phases = data.get("job", {}).get("phase_codes", [])

#         def create_df(entities, name_key="name"):
#             rows = []
#             for ent in entities:
#                 name = ent.get(name_key) or ent.get("first_name", "")
#                 if "last_name" in ent:
#                     name = f"{name} {ent.get('last_name', '')}".strip()
#                 row = {"ID": ent.get("id", ""), "Name": name}
#                 for phase in job_phases:
#                     row[phase] = ent.get("hours_per_phase", {}).get(phase, 0)
#                 rows.append(row)
#             return pd.DataFrame(rows)

#         def create_dumping_site_df(entities):
#             rows = []
#             for ent in entities:
#                 row = {"ID": ent.get("id", ""), "Name": ent.get("name", "")}
#                 for phase in job_phases:
#                     row[f"{phase} (# of Loads)"] = ent.get("hours_per_phase", {}).get(phase, 0)
#                     row[f"{phase} (Qty)"] = ent.get("tickets_per_phase", {}).get(phase, 0)
#                 rows.append(row)
#             return pd.DataFrame(rows)

#         with pd.ExcelWriter(file_path_local, engine="openpyxl") as writer:
#             create_df(data.get("employees", []), name_key="first_name").to_excel(writer, index=False, sheet_name="Employees")
#             create_df(data.get("equipment", [])).to_excel(writer, index=False, sheet_name="Equipment")
#             create_df(data.get("materials_trucking", [])).to_excel(writer, index=False, sheet_name="Materials")
#             create_df(data.get("vendors", [])).to_excel(writer, index=False, sheet_name="Vendors")
#             create_dumping_site_df(data.get("dumping_sites", [])).to_excel(writer, index=False, sheet_name="DumpingSites")

#         file_url = f"{BASE_URL}/storage/{ts_date_str}/{file_name}"

#         file_record = models.TimesheetFile(
#             timesheet_id=ts.id,
#             foreman_id=ts.foreman_id,
#             file_path=file_url
#         )
#         db.add(file_record)
#         db.commit()
#         db.refresh(file_record)

#     except Exception as e:
#         print(f"❌ Excel generation failed: {e}")

#     return ts


@router.put("/{timesheet_id}", response_model=schemas.Timesheet)
# @audit(action="UPDATED", entity="Timesheets")

def update_timesheet(
    timesheet_id: int,
    timesheet_update: schemas.TimesheetUpdate,
    db: Session = Depends(get_db)
):
    # --- Fetch timesheet ---
    ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    payload = timesheet_update.dict(exclude_unset=True)
    def clean_legacy_tickets(data):
        for entity_key in ["materials_trucking", "vendors", "dumping_sites"]:
            if entity_key in data:
                for entity in data[entity_key]:
                    entity.pop("tickets_per_phase", None)  # Remove if exists
        return data
    if "data" in payload:
        ts.data = clean_legacy_tickets(payload["data"])
    if "status" in payload and payload["status"] == "IN_PROGRESS":
        ts.status = SubmissionStatus.IN_PROGRESS
    if "status" in payload:
        ts.status = payload["status"]

    # --- Keep job name synced ---
    data_to_store = ts.data or {}
    job_name = (
        data_to_store.get("job_name")
        or (data_to_store.get("job") or {}).get("job_description")
        or (data_to_store.get("job") or {}).get("job_name")
        or (data_to_store.get("job") or {}).get("job_code")
        or "Untitled Timesheet"
    )
    ts.timesheet_name = job_name
    ts.data["job_name"] = job_name

    db.commit()
    db.refresh(ts)

    # --- Excel file generation ---
    try:
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        storage_dir = os.path.join(BASE_DIR, "storage")
        os.makedirs(storage_dir, exist_ok=True)

        ts_date_str = ts.date.strftime("%Y-%m-%d") if hasattr(ts.date, "strftime") else str(ts.date)
        date_folder = os.path.join(storage_dir, ts_date_str)
        os.makedirs(date_folder, exist_ok=True)

        version = len([f for f in os.listdir(date_folder) if f.startswith(f"timesheet_{ts.id}_")]) + 1
        file_name = f"timesheet_{ts.id}_{ts_date_str}_v{version}.xlsx"
        file_path_local = os.path.join(date_folder, file_name)

        data = ts.data if isinstance(ts.data, dict) else json.loads(ts.data)
        job_phases = data.get("job", {}).get("phase_codes", [])

        def create_df(entities, name_key="name"):
            rows = []
            for ent in entities:
                name = ent.get(name_key) or ent.get("first_name", "")
                if "last_name" in ent:
                    name = f"{name} {ent.get('last_name', '')}".strip()
                row = {"ID": ent.get("id", ""), "Name": name}
                for phase in job_phases:
                    row[phase] = ent.get("hours_per_phase", {}).get(phase, 0)
                rows.append(row)
            return pd.DataFrame(rows)

        def create_dumping_site_df(entities):
            rows = []
            for ent in entities:
                row = {"ID": ent.get("id", ""), "Name": ent.get("name", "")}
                for phase in job_phases:
                    row[f"{phase} (Qty)"] = ent.get("hours_per_phase", {}).get(phase, 0)
                    row[f"{phase} (# of Loads)"] = ent.get("tickets_loads", {}).get(ent["id"], 0)

                rows.append(row)
            return pd.DataFrame(rows)

        with pd.ExcelWriter(file_path_local, engine="openpyxl") as writer:
            create_df(data.get("employees", []), name_key="first_name").to_excel(writer, index=False, sheet_name="Employees")
            create_df(data.get("equipment", [])).to_excel(writer, index=False, sheet_name="Equipment")
            create_df(data.get("materials_trucking", [])).to_excel(writer, index=False, sheet_name="Materials")
            create_df(data.get("vendors", [])).to_excel(writer, index=False, sheet_name="Vendors")
            create_dumping_site_df(data.get("dumping_sites", [])).to_excel(writer, index=False, sheet_name="DumpingSites")

        # ✅ Replace ngrok link with your own base URL
        # NGROK_BASE_URL = "https://coated-nonattributive-babara.ngrok-free.dev"
        # file_url = f"{NGROK_BASE_URL}/storage/{ts_date_str}/{file_name}"
        # BASE_URL = os.getenv("BASE_URL")
        NGROK_BASE_URL = "https://coated-nonattributive-babara.ngrok-free.dev"
        file_url = f"{NGROK_BASE_URL}/storage/{ts_date_str}/{file_name}"

        # ✅ Save file info in DB
        file_record = models.TimesheetFile(
            timesheet_id=ts.id,
            foreman_id=ts.foreman_id,
            file_path=file_url
        )
        db.add(file_record)
        db.commit()
        db.refresh(file_record)

        print(f"✅ Timesheet Excel generated and saved at: {file_url}")

    except Exception as e:
        print(f"❌ Excel generation failed: {e}")

    return ts
# -------------------------------
# SEND a timesheet
# -------------------------------


from ..models import SubmissionStatus

from datetime import datetime
from sqlalchemy import func
@router.post("/{timesheet_id}/send", response_model=schemas.Timesheet)
def send_timesheet(timesheet_id: int, db: Session = Depends(get_db)):
    ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if ts.status == SubmissionStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Timesheet already sent")
    ts.sent = True
    ts.sent_date = datetime.utcnow()
    ts.status = SubmissionStatus.SUBMITTED  # :white_check_mark: fixed value
    workflow = models.TimesheetWorkflow(
        timesheet_id=ts.id,
        foreman_id=ts.foreman_id,
        action="Sent",
        by_role="Foreman",
        timestamp=datetime.utcnow(),
        comments="Sent to supervisor",
    )
    db.add(workflow)
    db.commit()
    db.refresh(ts)
    return ts

    
# -------------------------------
# DELETE a timesheet
# -------------------------------
@router.delete("/{timesheet_id}", status_code=status.HTTP_204_NO_CONTENT)
# @audit(action="Deleted", entity="Timesheets")

def delete_timesheet(timesheet_id: int, db: Session = Depends(get_db)):
    ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    db.delete(ts)
    db.commit()
    return
# In your routers/timesheet.py


@router.get("/", response_model=List[schemas.TimesheetResponse])
def list_timesheets(db: Session = Depends(get_db)):
    """
    Returns a list of all timesheets with foreman names and job names included.
    This is optimized for the admin dashboard view.
    """
    timesheets = db.query(models.Timesheet).options(joinedload(models.Timesheet.foreman)).all()
    
    response = []
    for ts in timesheets:
        foreman_name = f"{ts.foreman.first_name} {ts.foreman.last_name}" if ts.foreman else "N/A"
        
        # Create the response object, ensuring all required fields are present
        response.append(schemas.TimesheetResponse(
            id=ts.id,
            date=ts.date,
            foreman_id=ts.foreman_id,
            foreman_name=foreman_name,
            job_name=ts.timesheet_name,  # <-- The FIX: Populate the required 'job_name' field
            data=ts.data,
            status=ts.status
        ))
        
    return response
from sqlalchemy import or_
from ..models import SubmissionStatus  # ✅ use your enum safely

@router.get("/drafts/by-foreman/{foreman_id}", response_model=List[schemas.Timesheet])
def get_draft_timesheets_by_foreman(foreman_id: int, db: Session = Depends(get_db)):
    """
    Returns all draft/pending timesheets for a given foreman.
    This is used by the new ReviewTimesheetScreen.
    """
    timesheets = (
        db.query(models.Timesheet)
        .options(joinedload(models.Timesheet.files))
        .filter(models.Timesheet.foreman_id == foreman_id)
        .filter(
            or_(
                models.Timesheet.status == SubmissionStatus.PENDING

            )
        )
        .order_by(models.Timesheet.date.desc())
        .all()
    )
    return timesheets


# @router.post("/timesheets/save-draft/")
# def save_draft(timesheet: schemas.TimesheetCreate, db: Session = Depends(get_db)):
#     """
#     Save a timesheet draft. Each save creates a new row.
#     """
#     new_ts = models.Timesheet(
#         foreman_id=timesheet.foreman_id,
#         job_name=timesheet.job_name,
#         date=datetime.utcnow(),
#         status=SubmissionStatus.DRAFT,  # ✅ ENUM-safe value
#         data=json.dumps(timesheet.data)  # store JSON as string
#     )
#     db.add(new_ts)
#     db.commit()
#     db.refresh(new_ts)
#     return {"message": "Draft saved", "timesheet_id": new_ts.id}

@router.post("/timesheets/save-draft/")
def save_draft(timesheet: schemas.TimesheetCreate, db: Session = Depends(get_db)):
    """
    Save or update a timesheet draft.
    - If timesheet.id exists -> update existing draft.
    - Else -> create new draft.
    """
    # ✅ 1. Check if it's an existing draft
    if timesheet.id:
        existing_ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet.id).first()
        if existing_ts:
            existing_ts.data = json.dumps(timesheet.data)
            existing_ts.job_name = timesheet.job_name
            existing_ts.status = SubmissionStatus.DRAFT  # always save as draft
            existing_ts.date = datetime.utcnow()
            db.commit()
            db.refresh(existing_ts)
            return {"message": "Draft updated", "timesheet_id": existing_ts.id}

    # ✅ 2. Else, create a new draft
    new_ts = models.Timesheet(
        foreman_id=timesheet.foreman_id,
        job_name=timesheet.job_name,
        date=datetime.utcnow(),
        status=SubmissionStatus.DRAFT,
        data=json.dumps(timesheet.data)
    )
    db.add(new_ts)
    db.commit()
    db.refresh(new_ts)
    return {"message": "Draft created", "timesheet_id": new_ts.id}

@router.get("/timesheets/drafts/by-foreman/{foreman_id}")
def get_drafts(foreman_id: int, db: Session = Depends(get_db)):
    """
    Fetch all draft timesheets for a foreman
    """
    drafts = (
        db.query(models.Timesheet)
        .filter(models.Timesheet.foreman_id == foreman_id)
        .filter(models.Timesheet.status == SubmissionStatus.DRAFT)  # ✅ uppercase ENUM
        .order_by(models.Timesheet.date.desc())
        .all()
    )

    # Convert JSON string to dict
    return [
        {**{"id": t.id, "job_name": t.job_name, "date": t.date}, **json.loads(t.data)}
        for t in drafts
    ]
