from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from ..database import get_db
from .. import models, crud # Import crud functions

# The router prefix should be /api
# Note: In your frontend, you are calling /api/departments/. 
# If your router is included in main.py with a prefix of /api, then the prefix here should be empty.
# Assuming this router is included directly, I will keep the /api prefix.
router = APIRouter(prefix="/api", tags=["Dropdown Data"])


# ==============================================================
# Pydantic Schemas
# ==============================================================

# --- Department Schemas ---
class DepartmentOut(BaseModel):
    id: int
    name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class DepartmentCreate(BaseModel): # Schema for creating a department
    name: str

# --- Category Schemas ---
class CategoryOut(BaseModel):
    id: int
    name: str
    number: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CategoryCreate(BaseModel): # Schema for creating a category
    name: str
    number: str

# Other existing schemas...
class LocationBase(BaseModel):
    name: str

class LocationOut(LocationBase):
    id: int
    class Config:
        orm_mode = True

class SupplierOut(BaseModel):
    id: int
    concrete_supplier: Optional[str]
    asphalt_supplier: Optional[str]
    aggregate_supplier: Optional[str]
    top_soil_supplier: Optional[str]
    model_config = ConfigDict(from_attributes=True)


# ==============================================================
# Routes
# ==============================================================

# --- Department Routes ---
@router.get("/departments/", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()

@router.post("/departments/", response_model=DepartmentOut, status_code=201)
def create_department(department: DepartmentCreate, db: Session = Depends(get_db)):
    # Check for duplicates before creating
    db_department = crud.get_department_by_name(db, name=department.name)
    if db_department:
        raise HTTPException(status_code=400, detail="Department with this name already exists.")
    return crud.create_department(db=db, department=department)


# --- Category Routes ---
@router.get("/categories/", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@router.post("/categories/", response_model=CategoryOut, status_code=201)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    # You might want to add a check for duplicate category numbers here
    return crud.create_category(db=db, category=category)


# --- Other Existing Routes ---
@router.get("/locations/", response_model=List[LocationOut])
def get_locations(db: Session = Depends(get_db)):
    return db.query(models.Location).all()

@router.get("/suppliers/", response_model=List[SupplierOut])
def get_suppliers(db: Session = Depends(get_db)):
    return db.query(models.Supplier).all()
