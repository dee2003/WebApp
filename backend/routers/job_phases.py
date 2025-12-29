
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List
from .. import models, schemas, database
from ..database import get_db
from ..auditing import log_action
from .. import oauth2
from fastapi import Security
router = APIRouter(prefix="/api/job-phases", tags=["Job Phases"])


# ✅ Create Job Phase
@router.post("/", response_model=schemas.JobPhase)
# @audit(action="CREATED", entity="JobPhase")
def create_job_phase(job_phase: schemas.JobPhaseCreate, db: Session = Depends(database.get_db),                     current_user: models.User = Depends(oauth2.get_current_user)):  
    existing = db.query(models.JobPhase).filter(models.JobPhase.job_code == job_phase.job_code).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Job with code '{job_phase.job_code}' already exists.")

    new_job_phase = models.JobPhase(
        job_code=job_phase.job_code,
        contract_no=job_phase.contract_no,
        job_description=job_phase.job_description,
        project_engineer=job_phase.project_engineer,
        project_engineer_id=job_phase.project_engineer_id,
        location_id=job_phase.location_id,  # ✅ Correct replacement for jurisdiction
        status=job_phase.status
    )

    if job_phase.phase_codes:
        for phase in job_phase.phase_codes:  # PhaseCodeInput objects
            new_phase = models.PhaseCode(
                code=phase.code,
                description=phase.description or f"Phase {phase.code}",
                unit="unit"  # hardcoded default
            )
            new_job_phase.phase_codes.append(new_phase)


    db.add(new_job_phase)
    db.commit()
    db.refresh(new_job_phase)
    log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE",
        target_resource="JOB_PHASE",
        target_resource_id=str(new_job_phase.id),  # string-safe if IDs can be non-integer
        details=f"JobPhase '{new_job_phase.job_code}' created by '{current_user.username}'."
    )
    db.commit()
    return new_job_phase


# ✅ Get all job phases
@router.get("/", response_model=List[schemas.JobPhase])
def get_all_job_phases(db: Session = Depends(database.get_db)):
    return (
        db.query(models.JobPhase)
        .options(selectinload(models.JobPhase.phase_codes))
        .filter(models.JobPhase.status != models.ResourceStatus.INACTIVE)
        .all()
    )

from fastapi import Query, HTTPException

@router.get("/phase-codes")
def get_phase_codes(
    job_phase_id: int | None = Query(None),
    db: Session = Depends(get_db)
):
    if not job_phase_id:
        return []  # 👈 safest for dropdowns

    return (
        db.query(models.PhaseCode)
        .filter(models.PhaseCode.job_phase_id == job_phase_id)
        .all()
    )



# ✅ Get active job phases
@router.get("/active", response_model=List[schemas.JobPhase])
def get_active_job_phases(db: Session = Depends(database.get_db)):
    job_phases = (
        db.query(models.JobPhase)
        .options(selectinload(models.JobPhase.phase_codes))
        .filter(models.JobPhase.status == "active")
        .all()
    )

    if not job_phases:
        raise HTTPException(status_code=404, detail="No active job phases found")

    return job_phases


# ✅ Get job by job_code
@router.get("/{job_code}", response_model=schemas.JobPhase)
def get_job_by_code(job_code: str, db: Session = Depends(get_db)):
    job = (
        db.query(models.JobPhase)
        .options(selectinload(models.JobPhase.phase_codes))
        .filter(models.JobPhase.job_code == job_code)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ✅ Delete job phase
@router.delete("/{job_code}", status_code=status.HTTP_200_OK)
# @audit(action="deleted", entity="JobPhase")
def delete_job(job_code: str, db: Session = Depends(database.get_db)):
    db_job = db.query(models.JobPhase).filter(models.JobPhase.job_code == job_code).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(db_job)
    db.commit()
    return {"ok": True, "detail": f"Job '{job_code}' and all its phases deleted"}



# ✅ Update job by code
@router.put("/{job_code}", response_model=schemas.JobPhase)
def update_job_phase_by_code(
    job_code: str,
    job_update: schemas.JobPhaseUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    db_job = (
        db.query(models.JobPhase)
        .options(selectinload(models.JobPhase.phase_codes))
        .filter(models.JobPhase.job_code == job_code)
        .first()
    )

    if not db_job:
        raise HTTPException(status_code=404, detail=f"Job with code '{job_code}' not found")

    update_data = job_update.dict(exclude_unset=True)
    changed_fields = []
    phase_changes_details = ""

    # -------------------------------
    # Handle phase_codes (OBJECTS)
    # -------------------------------
    if "phase_codes" in update_data:
        new_phase_objs = update_data.pop("phase_codes")  # List[dict]

        old_codes = [pc.code for pc in db_job.phase_codes]
        new_codes = [p["code"] for p in new_phase_objs]

        added = [c for c in new_codes if c not in old_codes]
        removed = [c for c in old_codes if c not in new_codes]

        if added or removed:
            changed_fields.append("phase_codes")
            parts = []
            if added:
                parts.append(f"added: {', '.join(added)}")
            if removed:
                parts.append(f"removed: {', '.join(removed)}")
            phase_changes_details = "; ".join(parts)

        # Replace phase codes
        db_job.phase_codes.clear()
        for phase in new_phase_objs:
            db_job.phase_codes.append(
                models.PhaseCode(
                    code=phase["code"],
                    description=phase.get("description") or f"Phase {phase['code']}",
                    unit="unit"
                )
            )

    # -------------------------------
    # Handle other fields
    # -------------------------------
    for key, value in update_data.items():
        old_value = getattr(db_job, key, None)
        if old_value != value:
            changed_fields.append(key)
        setattr(db_job, key, value)

    db.commit()
    db.refresh(db_job)

    # -------------------------------
    # Audit log
    # -------------------------------
    if changed_fields:
        details_parts = [f"Fields changed: {', '.join(changed_fields)}"]
        if phase_changes_details:
            details_parts.append(f"Phase codes {phase_changes_details}")

        log_action(
            db=db,
            user_id=current_user.id,
            action="UPDATE",
            target_resource="JobPhase",
            target_resource_id=db_job.job_code,
            details=(
                f"JobPhase '{db_job.job_code}' updated by "
                f"'{current_user.username}'. " + "; ".join(details_parts)
            )
        )
        db.commit()

    return db_job


@router.get("/{job_code}/phase-codes-list", response_model=List[schemas.PhaseCode])
def get_phase_codes_by_job_code(job_code: str, db: Session = Depends(get_db)):
    """
    Fetches the list of all available PhaseCode objects associated with a specific job_code.
    This is used by the frontend to provide a list of valid phases for editing.
    """
    job_phase = (
        db.query(models.JobPhase)
        # Use selectinload to fetch the related phase codes efficiently in one query
        .options(selectinload(models.JobPhase.phase_codes))
        .filter(models.JobPhase.job_code == job_code)
        .first()
    )
    
    if not job_phase:
        # Return an empty list or raise a 404 if the job doesn't exist
        return []
        
    # models.JobPhase.phase_codes is the list of models.PhaseCode objects
    return job_phase.phase_codes


