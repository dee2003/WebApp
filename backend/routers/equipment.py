
# /app/routes/equipment.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..schemas import EquipmentCreate, EquipmentUpdate, EquipmentInDB
from ..models import Equipment
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import joinedload
from typing import List
from ..auditing import log_action
from .. import oauth2
from fastapi import Security
router = APIRouter(
    prefix="/api/equipment",
    tags=["Equipment"]
)
# @router.get("/")
@router.get("/", response_model=List[schemas.EquipmentInDB])
def get_equipment(db: Session = Depends(get_db)):
    equipments = (
        db.query(models.Equipment)
        .options(
            joinedload(models.Equipment.category_rel),
            joinedload(models.Equipment.department_rel)
        )
        .filter(models.Equipment.status == "Active")
        .all()
    )
    return equipments


@router.put("/{equipment_id}", response_model=EquipmentInDB)
def update_equipment(
    equipment_id: str,
    equipment: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)  # Add current user dependency
):
    db_equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if not db_equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    update_data = equipment.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_equipment, key, value)
    db.add(db_equipment)

    db.commit()
    db.refresh(db_equipment)
    
    # Add audit log entry for update
    log_action(
        db=db,
        user_id=current_user.id,
        action='UPDATE',
        target_resource='EQUIPMENT',
        target_resource_id=db_equipment.id,
        details=f"Equipment '{db_equipment.name}' updated by user '{current_user.username}'."
    )
    db.commit()
    
    return db_equipment