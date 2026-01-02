from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from .. import models, schemas,database
from ..database import get_db

router = APIRouter(
    prefix="/api/crew-mapping/flagger",
    tags=["Crew Mapping"]
)

@router.get(
    "/{foreman_id}",
    response_model=schemas.CrewMappingResponse
)
def get_foreman_crew_mapping(
    foreman_id: int,
    db: Session = Depends(get_db)
):
    # DEBUG LOG — remove after verification
    print(f"🔎 Fetching crew mapping for foreman_id={foreman_id}")

    crew = (
        db.query(models.CrewMapping)
        .filter(
            models.CrewMapping.foreman_id == foreman_id,
            models.CrewMapping.is_deleted.is_(False),

            # ✅ Case-insensitive + trim-safe status check
            func.lower(func.trim(models.CrewMapping.status)) == "active"
        )
        .options(
            selectinload(models.CrewMapping.employees),
            selectinload(models.CrewMapping.equipment),
            selectinload(models.CrewMapping.dumping_sites),
        )
        .first()
    )

    if not crew:
        print(f"❌ No active crew mapping found for foreman_id={foreman_id}")
        raise HTTPException(
            status_code=404,
            detail="No active crew mapping found"
        )

    print(f"✅ Crew mapping found (id={crew.id})")
    return crew
