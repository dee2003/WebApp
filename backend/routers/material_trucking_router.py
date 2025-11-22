from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database, models, oauth2
from ..schemas import MaterialsTruckingUpdate
from ..database import get_db
from ..auditing import log_action
from .. import oauth2
router = APIRouter(
    prefix="/api/materials-trucking",
    tags=["Materials & Trucking"]
)

# -----------------------------
# CREATE
# -----------------------------
@router.post("/", response_model=schemas.MaterialTruckingRead)
def create_material_trucking(
    material_data: schemas.MaterialTruckingCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)  # get current user for audit
):
    new_material = crud.create_material_trucking(db, material_data)

    # Audit log
    log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE",
        target_resource="MaterialsTrucking",
        target_resource_id=new_material.id,
        details=f"MaterialsTrucking '{new_material.id}' created by '{current_user.username}'."
    )
    db.commit()

    return new_material

# -----------------------------
# GET ALL
# -----------------------------
@router.get("/", response_model=list[schemas.MaterialTruckingRead])
def get_all_material_trucking(db: Session = Depends(database.get_db)):
    return crud.get_all_material_trucking(db)

# -----------------------------
# UPDATE
# -----------------------------
@router.put("/{material_id}/", response_model=schemas.MaterialTruckingRead)
def update_material(material_id: int, material: MaterialsTruckingUpdate,
                    db: Session = Depends(database.get_db),
                    current_user: models.User = Depends(oauth2.get_current_user)):

    db_material = crud.get_material_trucking_by_id(db, material_id)
    if not db_material:
        raise HTTPException(status_code=404, detail="Material/Trucking not found")

    data = material.dict(exclude_unset=True)
    changed_fields = []

    for key, value in data.items():
        if key == "status" and value:
            old_value = db_material.status
            db_material.status = value.upper()
            if old_value != db_material.status:
                changed_fields.append(key)
        elif value is not None:
            old_value = getattr(db_material, key)
            setattr(db_material, key, value)
            if old_value != value:
                changed_fields.append(key)

    db.commit()
    db.refresh(db_material)

    if changed_fields:
        # Audit log
        log_action(
            db=db,
            user_id=current_user.id,
            action="UPDATE",
            target_resource="MaterialsTrucking",
            target_resource_id=db_material.id,
            details=f"MaterialTrucking '{db_material.name}' updated by '{current_user.username}'. Fields changed: {', '.join(changed_fields)}."
        )
        db.commit()

    return db_material

# -----------------------------
# DELETE
# -----------------------------
@router.delete("/{material_id}")
def delete_material_trucking(
    material_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    db_material = crud.get_material_trucking_by_id(db, material_id)
    if not db_material:
        raise HTTPException(status_code=404, detail="Record not found")

    crud.delete_material_trucking(db, material_id)

    # Audit log
    log_action(
        db=db,
        user_id=current_user.id,
        action="DELETE",
        target_resource="MaterialsTrucking",
        target_resource_id=material_id,
        details=f"MaterialsTrucking '{material_id}' deleted by '{current_user.username}'."
    )
    db.commit()

    return {"message": "Deleted successfully"}
