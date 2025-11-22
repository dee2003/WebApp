from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import schemas, models, crud, database
from typing import List
from ..auditing import log_action
from .. import oauth2
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api/dumping_sites", tags=["Dumping Sites"])


@router.post("/", response_model=schemas.DumpingSiteRead)
def create_site(
    site: schemas.DumpingSiteCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    new_site = crud.create_dumping_site(db, site)
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE",
        target_resource="DumpingSite",
        target_resource_id=new_site.id,
        details=f"Dumping Site '{new_site.name}' created by '{current_user.username}'."
    )
    db.commit()
    return new_site


# ✅ Get all Dumping Sites
@router.get("/", response_model=List[schemas.DumpingSiteRead])
def get_sites(db: Session = Depends(database.get_db)):
    return crud.get_all_dumping_sites(db)

# ✅ Update Dumping Site with full audit logging
@router.put("/{site_id}/", response_model=schemas.DumpingSiteRead)
def update_site(
    site_id: str,
    site: schemas.DumpingSiteUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    # 1️⃣ Get old site with materials loaded
    old_site = (
        db.query(models.DumpingSite)
        .options(selectinload(models.DumpingSite.materials))
        .filter(models.DumpingSite.id == site_id)
        .first()
    )
    if not old_site:
        raise HTTPException(status_code=404, detail="Dumping Site not found")

    # 2️⃣ Perform the update and get updated site
    updated_site = crud.update_dumping_site(db, site_id, site)

    # 3️⃣ Compare old vs new values for audit
    changed_fields = []

    for field in site.dict(exclude_unset=True):
        old_value = getattr(old_site, field, None)
        new_value = getattr(updated_site, field, None)
        if field == "material_ids":  # special handling for materials
            old_value = [m.id for m in old_site.materials] if old_site.materials else []
            new_value = [m.id for m in updated_site.materials] if updated_site.materials else []
        if old_value != new_value:
            changed_fields.append(f"{field}: '{old_value}' → '{new_value}'")

    # 4️⃣ Create audit log if there are changes
    if changed_fields:
        log_action(
            db=db,
            user_id=current_user.id,
            action="UPDATE",
            target_resource="DumpingSite",
            target_resource_id=updated_site.id,
            details=f"Dumping Site '{updated_site.name}' updated by '{current_user.username}'. Changes: {', '.join(changed_fields)}"
        )
        db.commit()

    return updated_site

# ✅ Delete Dumping Site
@router.delete("/{site_id}/")
def delete_site(
    site_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    site = crud.get_dumping_site_by_id(db, site_id)  # you might need to implement this helper
    deleted_site = crud.delete_dumping_site(db, site_id)

    log_action(
        db=db,
        user_id=current_user.id,
        action="DELETE",
        target_resource="DumpingSite",
        target_resource_id=site_id,
        details=f"Dumping Site '{site.name}' deleted by '{current_user.username}'."
    )
    db.commit()
    return deleted_site


# ✅ Options (type/category)
@router.get("/options/")
def get_options(option_type: str = Query(...), db: Session = Depends(database.get_db)):
    return crud.get_dumping_site_options(db, option_type)


@router.post("/options/")
def create_option(
    option_type: str = Query(...), 
    value: str = Query(...), 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    option = crud.create_dumping_site_option(db, option_type, value)

    log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE",
        target_resource="DumpingSiteOption",
        target_resource_id=option.id,
        details=f"Option '{value}' of type '{option_type}' created by '{current_user.username}'."
    )
    db.commit()
    return option