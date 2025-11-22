
from fastapi import APIRouter, Depends, HTTPException, status,  Body
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy.orm import selectinload

from .. import models, schemas, database
from ..schemas import VendorCreate
from .. import crud
from ..database import get_db
from sqlalchemy.orm import joinedload
from sqlalchemy import text
from ..auditing import log_action
from .. import oauth2
router = APIRouter(prefix="/api", tags=["Vendors"])

from backend.models import vendor_material_link
print("🧩 Table in metadata:", vendor_material_link.name in vendor_material_link.metadata.tables)

from fastapi import status

@router.post("/vendors/", response_model=schemas.VendorRead, status_code=status.HTTP_201_CREATED)
def create_vendor(
    vendor_data: schemas.VendorCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)  # get current user for audit
):
    """Create a new vendor and link selected materials."""

    vendor = models.Vendor(
        id=vendor_data.id,
        name=vendor_data.name,
        vendor_type=vendor_data.vendor_type,
        vendor_category=vendor_data.vendor_category,
        status=vendor_data.status.upper() if vendor_data.status else "ACTIVE",
    )

    db.add(vendor)
    db.flush()  # Ensure vendor.id exists before linking materials

    # Link materials if provided
    if vendor_data.material_ids:
        materials = db.query(models.VendorMaterial).filter(
            models.VendorMaterial.id.in_(vendor_data.material_ids)
        ).all()
        if not materials:
            raise HTTPException(status_code=404, detail="No valid materials found.")
        vendor.materials = materials

    db.commit()
    db.refresh(vendor)

    # ✅ Audit log
    log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE",
        target_resource="Vendor",
        target_resource_id=vendor.id,
        details=f"Vendor '{vendor.name}' created by '{current_user.username}'."
    )
    db.commit()

    # Re-fetch vendor with materials loaded
    vendor_with_materials = (
        db.query(models.Vendor)
        .options(selectinload(models.Vendor.materials))
        .filter(models.Vendor.id == vendor.id)
        .first()
    )

    return vendor_with_materials




from sqlalchemy.orm import selectinload

@router.get("/vendors", response_model=List[schemas.VendorRead])
def get_vendors(db: Session = Depends(database.get_db)):
    vendors = db.query(models.Vendor).options(
        selectinload(models.Vendor.materials)
    ).all()

    # ✅ Add material_ids dynamically for frontend checkbox prefill
    for vendor in vendors:
        vendor.material_ids = [m.id for m in vendor.materials] if vendor.materials else []

    return vendors


from fastapi import Path
@router.patch("/vendors/{vendor_id}/", response_model=schemas.VendorRead)
@router.put("/vendors/{vendor_id}/", response_model=schemas.VendorRead)
def update_vendor_status(
    vendor_id: int = Path(...),
    status: str = Body(..., embed=True),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)

):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    # This works because your model likely has a 'status' field
    vendor.status = status.upper()
    db.commit()
    db.refresh(vendor)
    log_action(
        db=db,
        user_id=current_user.id,
        action="UPDATE",
        target_resource="Vendor",
        target_resource_id=vendor.id,
        details=f"Vendor '{vendor.name}' status changed from '{old_status}' to '{vendor.status}' by '{current_user.username}'."
    )
    db.commit()
    return vendor
# --- GENERAL DETAILS UPDATE ENDPOINT ---
# :white_check_mark: FIX: Using a unique path to resolve the routing conflict.
@router.patch("/vendors/details/{vendor_id}/", response_model=schemas.VendorRead)
@router.put("/vendors/details/{vendor_id}/", response_model=schemas.VendorRead)
def update_vendor_details(
    vendor_id: int = Path(...),
    vendor_data: schemas.VendorUpdate = Body(..., description="Vendor data to update"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    update_data = vendor_data.model_dump(exclude_unset=True)
    changed_fields = []

    for key, value in update_data.items():
        if hasattr(vendor, key) and value is not None:
            old_value = getattr(vendor, key)
            setattr(vendor, key, value)
            if old_value != value:
                changed_fields.append(f"{key}: '{old_value}' → '{value}'")

    db.commit()
    db.refresh(vendor)

    # ✅ Audit log if something changed
    if changed_fields:
        log_action(
            db=db,
            user_id=current_user.id,
            action="UPDATE",
            target_resource="Vendor",
            target_resource_id=vendor.id,
            details=f"Vendor '{vendor.name}' updated by '{current_user.username}'. Changes: {', '.join(changed_fields)}"
        )
        db.commit()

    return vendor