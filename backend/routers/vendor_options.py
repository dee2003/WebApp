
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import crud

from .. import models, schemas, database

router = APIRouter(prefix="/api/vendor-options", tags=["Vendor Options"])


@router.get("/{option_type}", response_model=List[str])
def get_vendor_options(option_type: str, db: Session = Depends(get_db)):
    options = (
        db.query(models.VendorOption)
        .filter(models.VendorOption.option_type == option_type)
        .all()
    )
    if not options:
        return []  # safe fallback
    return [opt.value for opt in options]

@router.post("/")
def add_vendor_option(
    option_type: str = Query(..., alias="type"),
    value: str = Query(...),
    db: Session = Depends(get_db)
):
    exists = db.query(models.VendorOption).filter(
        models.VendorOption.option_type == option_type,
        models.VendorOption.value == value
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Option already exists")
    db.add(models.VendorOption(option_type=option_type, value=value))
    db.commit()
    return {"message": f"{value} added to {option_type}"}


# @router.post("/", response_model=schemas.VendorRead)
# def create_vendor(vendor: schemas.VendorCreate, db: Session = Depends(get_db)):
#     return crud.create_vendor(db, vendor)

# @router.get("/{vendor_id}", response_model=schemas.VendorRead)
# def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
#     db_vendor = crud.get_vendor_with_materials(db, vendor_id)
#     if not db_vendor:
#         raise HTTPException(status_code=404, detail="Vendor not found")
#     return db_vendor

# @router.get("/", response_model=List[schemas.VendorRead])
# def get_all_vendors(db: Session = Depends(get_db)):
#     return crud.get_all_vendors(db)


