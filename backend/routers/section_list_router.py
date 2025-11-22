from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from .. import models, database

router = APIRouter(prefix="/api/section-lists", tags=["Section Lists"])

# -------------------------------
# 1️⃣ Get Vendors by Category
# -------------------------------
@router.get("/vendors/")
def get_vendors_by_category(category: str = Query(...), db: Session = Depends(database.get_db)):
    vendors = (
        db.query(models.Vendor)
        .options(joinedload(models.Vendor.materials))  # eager load materials
        .filter(models.Vendor.vendor_category == category)
        .all()
    )

    result = []
    for v in vendors:
        result.append({
            "id": v.id,
            "name": v.name,
            "vendor_category": v.vendor_category,
            "materials": [{"id": m.id, "name": m.material, "unit": m.unit} for m in v.materials],
        })
    return result


# -------------------------------
# 2️⃣ Get Materials by Category
# -------------------------------
@router.get("/materials/")
def get_materials_by_category(category: str = Query(...), db: Session = Depends(database.get_db)):
    materials = (
        db.query(models.MaterialTrucking)
        .options(joinedload(models.MaterialTrucking.materials))
        .filter(models.MaterialTrucking.material_category == category)
        .all()
    )

    result = []
    for m in materials:
        result.append({
            "id": m.id,
            "name": m.name,
            "material_category": m.material_category,
            "materials": [{"id": mat.id, "name": mat.material, "unit": mat.unit} for mat in m.materials],
        })
    return result



# -------------------------------
# 3️⃣ Get Dumping Sites by Category
# -------------------------------
@router.get("/dumping-sites/")
def get_dumping_sites_by_category(category: str = Query(...), db: Session = Depends(database.get_db)):
    dumping_sites = (
        db.query(models.DumpingSite)
        .options(joinedload(models.DumpingSite.materials))
        .filter(models.DumpingSite.dumping_category == category)
        .all()
    )

    result = []
    for d in dumping_sites:
        result.append({
            "id": d.id,
            "name": d.name,
            "dumping_category": d.dumping_category,
            "materials": [{"id": m.id, "name": m.material, "unit": m.unit} for m in d.materials],
        })
    return result