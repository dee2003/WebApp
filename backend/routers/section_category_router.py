from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, database

router = APIRouter(prefix="/api/section-categories", tags=["Section Categories"])


@router.get("/")
def get_all_section_categories(db: Session = Depends(database.get_db)):
    """
    Fetch categories for:
    - Vendors → vendor_options (option_type='category')
    - Materials → material_options (type='material_category')
    - Dumping Sites → dumping_site_options (option_type='dumping_category')
    """

    # Vendor categories
    vendor_categories = (
        db.query(models.VendorOption.value)
        .filter(models.VendorOption.option_type == "category")
        .all()
    )

    # Material categories
    material_categories = (
        db.query(models.MaterialOption.value)
        .filter(models.MaterialOption.type == "material_category")
        .all()
    )

    # Dumping Site categories
    dumping_categories = (
        db.query(models.DumpingSiteOption.value)
        .filter(models.DumpingSiteOption.option_type == "dumping_category")
        .all()
    )

    # Convert from [(value,), ...] to [value, ...]
    vendor_categories = [v[0] for v in vendor_categories]
    material_categories = [m[0] for m in material_categories]
    dumping_categories = [d[0] for d in dumping_categories]

    return {
        "vendors": vendor_categories,
        "materials": material_categories,
        "dumping_sites": dumping_categories,
    }