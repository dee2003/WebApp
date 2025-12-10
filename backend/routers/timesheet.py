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
from sqlalchemy.orm.attributes import flag_modified
import os
from ..models import Timesheet  # <-- import your model

load_dotenv()
load_dotenv(r"C:\TimesheetWebApp\timesheet-app-dev\backend\.env")  # Use raw string for Windows
sender_email = os.getenv("SMTP_USER")
sender_password = os.getenv("SMTP_PASSWORD")
print("SMTP_USER:", sender_email)
print("SMTP_PASSWORD:", sender_password)

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
        status="DRAFT",
        data=data_to_store,        # Passing dictionary directly to JSONB
        timesheet_name=job_name
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

from ..schemas import TimesheetWorkflowSchema
from ..models import TimesheetWorkflow
@router.get("/workflows", response_model=List[TimesheetWorkflowSchema])
def get_timesheet_workflows(timesheet_id: int, db: Session = Depends(get_db)):
    return (
        db.query(TimesheetWorkflow)
        .filter(TimesheetWorkflow.timesheet_id == timesheet_id)
        .order_by(TimesheetWorkflow.timestamp.desc())
        .all()
    )

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
        print(f":warning: Critical enrichment error: {e}")
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

@router.put("/{timesheet_id}", response_model=schemas.Timesheet)

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
        
        NGROK_BASE_URL = "https://9e0837b343bf.ngrok-free.app"
        file_url = f"{NGROK_BASE_URL}/storage/{ts_date_str}/{file_name}"
        # :white_check_mark: Save file info in DB
        file_record = models.TimesheetFile(
            timesheet_id=ts.id,
            foreman_id=ts.foreman_id,
            file_path=file_url
        )
        db.add(file_record)
        db.commit()
        db.refresh(file_record)
        print(f":white_check_mark: Timesheet Excel generated and saved at: {file_url}")
    except Exception as e:
        print(f":x: Excel generation failed: {e}")
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

@router.post("/timesheets/save-draft/")
def save_draft(timesheet: schemas.TimesheetCreate, db: Session = Depends(get_db)):
    # ... (Check for existing_ts)
    if timesheet.id:
        existing_ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet.id).first()
        if existing_ts:
            existing_ts.data = timesheet.data  # dictionary, not JSON string
            flag_modified(existing_ts, "data")  # important for JSONB change detection
            existing_ts.job_name = timesheet.job_name
            existing_ts.status = SubmissionStatus.DRAFT
            existing_ts.date = datetime.utcnow()

            db.commit()
            db.refresh(existing_ts)

            return {"message": "Draft updated", "timesheet_id": existing_ts.id}

    # Create new draft
    new_ts = models.Timesheet(
        foreman_id=timesheet.foreman_id,
        job_name=timesheet.job_name,
        date=datetime.utcnow(),
        status=SubmissionStatus.DRAFT,
        data=timesheet.data  # store dict directly
    )

    db.add(new_ts)
    db.commit()
    db.refresh(new_ts)

    return {"message": "Draft created", "timesheet_id": new_ts.id}


@router.get("/timesheets/drafts/by-foreman/{foreman_id}")
def get_drafts(foreman_id: int, db: Session = Depends(get_db)):
    drafts = (
        db.query(models.Timesheet)
        .filter(
            models.Timesheet.foreman_id == foreman_id,
            models.Timesheet.status == SubmissionStatus.DRAFT
        )
        .order_by(models.Timesheet.date.desc())
        .all()
    )

    # Convert JSONB safely (should already be dict)
    return [
        {
            "id": t.id,
            "job_name": t.job_name,
            "date": t.date,
            **(t.data if isinstance(t.data, dict) else json.loads(t.data))
        }
        for t in drafts
    ]

from typing import List, Optional, Dict, Any # <-- ENSURE Dict and Any are imported
# In routers/timesheet.py

# In routers/timesheet.py

@router.patch("/{timesheet_id}/review", response_model=schemas.Timesheet)
def update_timesheet_review(
    timesheet_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    ts = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    # 1. Get the current data dictionary
    current_data = ts.data if ts.data is not None else {}


    # Defensive check (if frontend accidentally sends string JSON)
    if isinstance(current_data, str):
        try:
            current_data = json.loads(current_data)
        except json.JSONDecodeError:
            current_data = {}

    # 2. Merge incoming payload
    current_data.update(payload)

    # Keep job name synced
    job_name = (
        current_data.get("job_name")
        or (current_data.get("job") or {}).get("job_description")
        or ts.timesheet_name
    )
    current_data["job_name"] = job_name

    # 3. Assign updated dictionary
    ts.data = current_data
    ts.timesheet_name = job_name

    # Flag as modified (required for SQLAlchemy JSONB)
    flag_modified(ts, "data")

    # 4. Commit and Refresh
    db.commit()
    db.refresh(ts)

    return ts

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os


class NotificationRequest(BaseModel):
    email: str
    subject: str
    message: str

# -------------------------------
# Send Notification Endpoint
# -------------------------------
@router.post("/send-notification")
def send_notification(request: NotificationRequest):
    if not sender_email or not sender_password:
        raise HTTPException(status_code=500, detail="SMTP credentials not set or invalid.")

    try:
        # Create email
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = request.email
        msg['Subject'] = request.subject
        msg.attach(MIMEText(request.message, 'plain'))

        # Send via Gmail SMTP
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()

        return {"status": "sent", "to": request.email}

    except smtplib.SMTPAuthenticationError as auth_err:
        raise HTTPException(
            status_code=500,
            detail=f"SMTP Authentication failed: {auth_err}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")
    



@router.post("/{timesheet_id}/resend/", response_model=dict)
def resend_timesheet(timesheet_id: int, db: Session = Depends(get_db)):
    """
    Resend a timesheet (e.g., re-process, notify stakeholders, etc.)
    """
    try:
        # Fetch the timesheet from the database
        timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
        if not timesheet:
            raise HTTPException(status_code=404, detail="Timesheet not found")

        # Convert to dict safely using as_dict
        data = timesheet.as_dict()

        # Extract safe fields
        foreman_name = data.get("foreman_name") or "Unknown Foreman"
        job_code = data.get("job_code") or "N/A"
        phase_name = data.get("phase_name") or "N/A"

        # Log the resend action
        print(f"🔄 RESENDING TIMESHEET ID {timesheet_id} - Foreman: {foreman_name}, Job: {job_code}, Phase: {phase_name}")

        # TODO: Add your actual resend logic here (email, notifications, OCR re-processing, etc.)
        # Example:
        # send_email(timesheet)
        # process_ocr_again(timesheet)
        # notify_foreman(timesheet)

        # Optionally update a "last_resent_at" timestamp
        # timesheet.last_resent_at = datetime.utcnow()
        # db.commit()

        return {
            "message": "Timesheet resent successfully",
            "timesheet_id": timesheet_id,
            "foreman": foreman_name,
            "job_code": job_code,
            "phase_name": phase_name
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Resend error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to resend timesheet")