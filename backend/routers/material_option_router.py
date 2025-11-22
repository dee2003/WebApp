from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, database

router = APIRouter(prefix="/api/material-options", tags=["Material Options"])

@router.post("/")
def add_material_option(type: str, value: str, db: Session = Depends(database.get_db)):
    existing = db.query(models.MaterialOption).filter_by(value=value).first()
    if existing:
        raise HTTPException(status_code=400, detail="Option already exists")
    option = models.MaterialOption(type=type, value=value)
    db.add(option)
    db.commit()
    db.refresh(option)
    return option

@router.get("/")
def get_material_options(type: str = None, db: Session = Depends(database.get_db)):
    query = db.query(models.MaterialOption)
    if type:
        query = query.filter(models.MaterialOption.type == type)
    return query.all()
