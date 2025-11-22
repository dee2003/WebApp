# backend/crud.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Type, TypeVar, List
from fastapi.encoders import jsonable_encoder
from . import crew_services, utils_comman  # ✅ --- ADD THIS LINE ---
from fastapi import Body
# crud.py (or wherever your update function is)
from .schemas import MaterialsTruckingUpdate
from .models import MaterialTrucking, ResourceStatus
from . import models, schemas
from .database import get_db
from sqlalchemy.orm import joinedload
from jose import JWTError, jwt
from .token import SECRET_KEY, ALGORITHM # Assuming these are in token.py
from . import oauth2 
from .auditing import log_action   # ✅ import from backend/auditing.py

# =======================================================================
# 1. Generic CRUD Router Factory
# =======================================================================

# --- Generic Type Variables ---
ModelType = TypeVar("ModelType", bound=models.Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
ResponseSchemaType = TypeVar("ResponseSchemaType", bound=BaseModel)

def create_crud_router(
    *,
    model: Type[ModelType],
    create_schema: Type[CreateSchemaType],
    response_schema: Type[ResponseSchemaType],
    prefix: str,
    tags: List[str]
) -> APIRouter:
    """
    A factory that creates a set of CRUD endpoints for a given SQLAlchemy model.
    It now includes logic to snapshot crew configurations when a resource's status changes.
    """
    router = APIRouter(prefix=prefix, tags=tags)

    # --- Automatically determine the primary key name and type ---
    pk_column = model.__mapper__.primary_key[0]
    pk_name = pk_column.name
    pk_type = pk_column.type.python_type

    # --- CREATE ---
    @router.post("/", response_model=response_schema, status_code=status.HTTP_201_CREATED)
    def create_item(item: create_schema, db: Session = Depends(get_db),    current_admin: models.User = Depends(oauth2.get_current_user)
):
        item_data = item.dict()
        
        # Check for duplicate primary key
        pk_value = item_data.get(pk_name)
        if pk_value and db.query(model).filter(pk_column == pk_value).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{model.__name__} with {pk_name} '{pk_value}' already exists."
            )

        # Automatically hash passwords for the User model
        if model.__name__ == "User" and "password" in item_data:
            item_data["password"] = utils_comman.hash_password(item_data["password"])
        
        # ✅ Filter out non-column keys before model creation
        allowed_keys = {c.name for c in model.__table__.columns}
        clean_data = {k: v for k, v in item_data.items() if k in allowed_keys}

        db_item = model(**clean_data)

        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        log_action(
        db=db,
        user_id=current_admin.id,
        action="CREATE",
        target_resource=model.__name__.upper(),
        target_resource_id=getattr(db_item, "id", None),
        details=f"{model.__name__} '{getattr(db_item, 'name', '')}' created by '{current_admin.username}'."
    )
        db.commit()  # <-- ADD THIS LINE to persist the audit log

        return db_item

    # --- READ ALL ---
    # @router.get("/", response_model=List[response_schema])
    # def list_items(db: Session = Depends(get_db)):
    #     query = db.query(model)
    #     if hasattr(model, 'status'):
    #     # Filter the query to only include items where the status is not 'inactive'.
    #         query = query.filter(model.status != models.ResourceStatus.INACTIVE)
    #     return db.query(model).all()
    @router.get("/", response_model=List[response_schema])
    def list_items(db: Session = Depends(get_db)):
        query = db.query(model)
        if model.__name__ == "Equipment":
            query = query.options(
                orm.joinedload(model.category_rel),
                orm.joinedload(model.department_rel),
            )
        if hasattr(model, 'status'):
            query = query.filter(model.status != models.ResourceStatus.INACTIVE)
        return query.all()

    # --- READ ONE ---
    @router.get("/{item_id}", response_model=response_schema)
    def read_item(item_id: pk_type, db: Session = Depends(get_db)):
        db_item = db.query(model).filter(pk_column == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
        return db_item


    @router.put("/{item_id}", response_model=response_schema)
    def update_item(item_id: pk_type, item: dict = Body(...), db: Session = Depends(get_db),    current_admin: models.User = Depends(oauth2.get_current_user)  # ✅ Added current user
):
        db_item = db.query(model).filter(pk_column == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
        
        update_data = item

        resource_models = ["Employee", "Equipment", "Material", "Vendor", "DumpingSite"]
        is_resource_status_change = (
            model.__name__ in resource_models and
            "status" in update_data and
            hasattr(db_item, "status") and
            getattr(db_item.status, "value", db_item.status) != update_data["status"]
        )

        if is_resource_status_change:
            new_status = update_data["status"]
            current_user_id = 1  # placeholder for auth
            print(f"✅ Status change detected for {model.__name__} {item_id}: {db_item.status} -> {new_status}")

            relationship_attr = getattr(models.CrewMapping, model.__tablename__)
            crews_to_update = db.query(models.CrewMapping).filter(relationship_attr.any(id=item_id)).all()

            for crew in crews_to_update:
                if new_status.lower() == "inactive":
                    notes = f"{model.__name__} '{item_id}' status changed to Inactive."
                    crew_services.create_crew_snapshot(db, crew.id, user_id=current_user_id, notes=notes)
                    crew.status = "Partially Inactive"
                    member_list = getattr(crew, model.__tablename__)
                    filtered_list = [member for member in member_list if member.id != item_id]
                    setattr(crew, model.__tablename__, filtered_list)

                elif new_status.lower() == "active":
                    latest_ref = db.query(models.CrewMappingReference).filter(
                        models.CrewMappingReference.crew_mapping_id == crew.id
                    ).order_by(models.CrewMappingReference.created_at.desc()).first()
                    if latest_ref:
                        crew_services.restore_from_reference(db, latest_ref.id)
                    crew.status = "Active"

            # ✅ Persist the new status safely
            db_item.status = new_status

        # ✅ Now update the rest safely (but skip status to prevent overwrite)
        for key, value in update_data.items():
            if key != "status":
                setattr(db_item, key, value)
            if is_resource_status_change:
                print(f"✅ Status change detected for {model.__name__} {item_id}: {db_item.status} -> {update_data['status']}")

        db.commit()
        db.refresh(db_item)
        changed_fields = ", ".join(update_data.keys())
        log_action(
        db=db,
        user_id=current_admin.id,
        action="UPDATE",
        target_resource=model.__name__.upper(),
        target_resource_id=getattr(db_item, "id", None),
        details=f"{model.__name__} '{getattr(db_item, 'name', '')}' updated by '{current_admin.username}'. Fields changed: {changed_fields}."
    )
        db.commit()
        return db_item


    # --- DELETE ---
    @router.delete("/{item_id}")
    def delete_item(item_id: pk_type, db: Session = Depends(get_db)):
        db_item = db.query(model).filter(pk_column == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
        
        db.delete(db_item)
        db.commit()
        return {"ok": True, "deleted_id": item_id}

    return router

# =======================================================================
# 2. Specific CRUD Functions (For Custom Routers)
# =======================================================================

def create_timesheet(db: Session, ts: schemas.TimesheetCreate):
    """Creates a new timesheet, extracting job_name for easier querying."""
    data_to_store = jsonable_encoder(ts.data)
    job_description = ts.data.get("job_name")

    db_ts = models.Timesheet(
        foreman_id=ts.foreman_id,
        date=ts.date,
        timesheet_name=job_description,
        data=data_to_store,
        sent=False
    )
    db.add(db_ts)
    db.commit()
    db.refresh(db_ts)
    return db_ts

# In crud.py
from sqlalchemy import orm  # <--- ADD THIS LINE

# In backend/crud.py

# Make sure you have these imports at the top of the file
from sqlalchemy import orm
from . import models, schemas

def get_crew_mapping(db: Session, foreman_id: int):
    """
    Retrieves all resources for a foreman's crew mapping by directly
    accessing the SQLAlchemy relationships.
    """
    # Use eager loading to fetch all related items in a single, efficient query
    mapping = db.query(models.CrewMapping).options(
        orm.selectinload(models.CrewMapping.employees),
        orm.selectinload(models.CrewMapping.equipment),
        orm.selectinload(models.CrewMapping.materials),
        orm.selectinload(models.CrewMapping.vendors),
        orm.selectinload(models.CrewMapping.dumping_sites)
    ).filter(models.CrewMapping.foreman_id == foreman_id).first()

    if not mapping:
        return None # Or return a default empty structure if the frontend expects it

    # --- THE FIX IS HERE ---
    # The 'mapping' object already contains the lists of employees, equipment, etc.
    # We just need to ensure the returned dictionary includes the mapping's own ID and status.
    return {
        "id": mapping.id, # <--- ADD THIS LINE
        "foreman_id": foreman_id,
        "status": mapping.status, # <--- ADD THIS LINE
        "employees": mapping.employees,
        "equipment": mapping.equipment,
        "materials": mapping.materials,
        "vendors": mapping.vendors,
        "dumping_sites": mapping.dumping_sites,
    }

def get_department_by_name(db: Session, name: str):
    """Finds a department by its exact name to check for duplicates."""
    return db.query(models.Department).filter(models.Department.name == name).first()

def create_department(db: Session, department: schemas.DepartmentCreate):
    """Creates a new department in the database."""
    db_department = models.Department(name=department.name)
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department

def create_category(db: Session, category: schemas.CategoryCreate):
    """Creates a new category in the database."""
    db_category = models.Category(name=category.name, number=category.number)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# def create_equipment(db: Session, equipment: schemas.EquipmentCreate, current_admin: models.User):
#     """
#     Creates a new equipment record and logs the creation action.
#     """
#     # Get the related category row
#     category_obj = db.query(models.Category).filter(models.Category.id == equipment.category_id).first()

#     db_equipment = models.Equipment(
#         id=equipment.id,
#         name=equipment.name,
#         vin_number=equipment.vin_number,
#         status=equipment.status,
#         department_id=equipment.department_id,
#         category_id=equipment.category_id,
#         category=category_obj.name if category_obj else ""
#     )

#     db.add(db_equipment)

#     # ✅ Add audit log entry
#     log_action(
#         db=db,
#         user_id=current_admin.id,
#         action="CREATE",
#         target_resource="EQUIPMENT",
#         target_resource_id=db_equipment.id,
#         details=f"Equipment '{db_equipment.name}' (VIN: {db_equipment.vin_number}) created by '{current_admin.username}'."
#     )

#     db.commit()
#     db.refresh(db_equipment)
#     return db_equipment

from sqlalchemy.orm import Session
from . import models, schemas

# -------------------------------------------------
# MATERIALS & TRUCKING CRUD
# -------------------------------------------------
from sqlalchemy.orm import Session
from . import models, schemas

# 🔹 Create MaterialTrucking
def create_material_trucking(db: Session, material_data: schemas.MaterialTruckingCreate):
    existing = db.query(models.MaterialTrucking).filter_by(id=material_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="ID already exists")
    material_trucking = models.MaterialTrucking(
        id=material_data.id,
        name=material_data.name,
        material_type=material_data.material_type,
        material_category=material_data.material_category,
        status=material_data.status.upper() if material_data.status else "ACTIVE"
    )
    db.add(material_trucking)
    db.commit()
    db.refresh(material_trucking)

    # Handle many-to-many links
    if material_data.material_ids:
        materials = db.query(models.VendorMaterial).filter(
            models.VendorMaterial.id.in_(material_data.material_ids)
        ).all()
        material_trucking.materials.extend(materials)
        db.commit()

    db.refresh(material_trucking)
    return material_trucking


# 🔹 Get All
def get_all_material_trucking(db: Session):
    return db.query(models.MaterialTrucking).all()
# crud.py
def update_material_trucking(db: Session, material_id: int, material_data: MaterialsTruckingUpdate):
    material = db.query(models.MaterialTrucking).filter(models.MaterialTrucking.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material/Trucking not found")

    data = material_data.dict(exclude_unset=True)

    for key, value in data.items():
        if key == "status" and value:
            material.status = ResourceStatus[value.upper()]
        elif value is not None:
            setattr(material, key, value)

    db.commit()
    db.refresh(material)
    return material




# 🔹 Delete
def delete_material_trucking(db: Session, id: int):
    mt = db.query(models.MaterialTrucking).filter(models.MaterialTrucking.id == id).first()
    if mt:
        db.delete(mt)
        db.commit()
    return mt







# 🔹 Create DumpingSite
def create_dumping_site(db: Session, site_data: schemas.DumpingSiteCreate):
    existing = db.query(models.DumpingSite).filter_by(id=site_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="ID already exists")

    site = models.DumpingSite(
        id=site_data.id,
        name=site_data.name,
        dumping_type=site_data.dumping_type,
        dumping_category=site_data.dumping_category,
        status=site_data.status.upper() if site_data.status else "ACTIVE",
    )
    db.add(site)
    db.commit()
    db.refresh(site)

    # 🔹 Proper many-to-many linking
    if site_data.material_ids:
        materials = db.query(models.VendorMaterial).filter(
            models.VendorMaterial.id.in_(site_data.material_ids)
        ).all()
        if materials:
            site.materials = materials  # assign, not extend, to ensure proper linking
            db.commit()

    db.refresh(site)
    return site


# 🔹 Get all Dumping Sites
def get_all_dumping_sites(db: Session):
    return db.query(models.DumpingSite).all()


# crud.py
def update_dumping_site(db: Session, site_id: str, site_data: schemas.DumpingSiteUpdate):
    site = db.query(models.DumpingSite).filter_by(id=site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Dumping Site not found")

    data = site_data.dict(exclude_unset=True)  # only fields provided in request

    if 'name' in data:
        site.name = data['name']
    if 'dumping_type' in data:
        site.dumping_type = data['dumping_type']
    if 'dumping_category' in data:
        site.dumping_category = data['dumping_category']
    if 'status' in data:
        site.status = data['status'].upper() if data['status'] else site.status
    if 'material_ids' in data:
        site.materials.clear()
        if data['material_ids']:
            materials = db.query(models.VendorMaterial).filter(
                models.VendorMaterial.id.in_(data['material_ids'])
            ).all()
            site.materials.extend(materials)

    db.commit()
    db.refresh(site)
    return site



# 🔹 Delete Dumping Site
def delete_dumping_site(db: Session, site_id: str):
    site = db.query(models.DumpingSite).filter_by(id=site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Dumping Site not found")

    db.delete(site)
    db.commit()
    return {"message": "Dumping Site deleted successfully"}


# 🔹 Dumping Site Options (type/category)
def get_dumping_site_options(db: Session, option_type: str):
    options = db.query(models.DumpingSiteOption).filter_by(option_type=option_type).all()
    return [{"label": o.value, "value": o.value} for o in options]


def create_dumping_site_option(db: Session, option_type: str, value: str):
    existing = (
        db.query(models.DumpingSiteOption)
        .filter_by(option_type=option_type, value=value)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Option already exists")

    new_option = models.DumpingSiteOption(option_type=option_type, value=value)
    db.add(new_option)
    db.commit()
    db.refresh(new_option)
    return new_option
# 🔹 Get single MaterialTrucking by ID
def get_material_trucking_by_id(db: Session, material_id: int):
    return db.query(models.MaterialTrucking).filter(models.MaterialTrucking.id == material_id).first()
# crud.py
from sqlalchemy.orm import selectinload
def get_dumping_site_by_id(db: Session, site_id: str):
    return (
        db.query(models.DumpingSite)
        .options(selectinload(models.DumpingSite.materials))  # Load linked materials
        .filter(models.DumpingSite.id == site_id)
        .first()
    )

