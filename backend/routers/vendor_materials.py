from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database

router = APIRouter(prefix="/api/vendor-materials", tags=["Vendor Materials"])


@router.get("/", response_model=List[schemas.VendorMaterialRead])
def get_vendor_materials(db: Session = Depends(database.get_db)):
    return db.query(models.VendorMaterial).all()


@router.post("/", response_model=schemas.VendorMaterialRead)
def add_vendor_material(material_data: schemas.VendorMaterialCreate, db: Session = Depends(database.get_db)):
    existing = db.query(models.VendorMaterial).filter_by(
        material=material_data.material,
        unit=material_data.unit
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Material already exists")

    new_material = models.VendorMaterial(material=material_data.material, unit=material_data.unit)
    db.add(new_material)
    db.commit()
    db.refresh(new_material)
    return new_material
