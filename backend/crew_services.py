# backend/crew_services.py

from sqlalchemy.orm import Session
from fastapi import HTTPException
from . import models

def create_crew_snapshot(db: Session, crew_id: int, user_id: int, notes: str) -> models.CrewMappingReference:
    """
    Takes a snapshot of a CrewMapping's current state and saves it to the
    CrewMappingReference table. This should be called *before* any changes are made.

    Args:
        db: The SQLAlchemy database session.
        crew_id: The ID of the CrewMapping to snapshot.
        user_id: The ID of the user performing the action.
        notes: A description of why the snapshot was taken (e.g., "Employee E101 status to Inactive").

    Returns:
        The newly created CrewMappingReference object.
    """
    # 1. Fetch the crew mapping with all its relationships loaded.
    crew_to_snapshot = db.query(models.CrewMapping).filter(models.CrewMapping.id == crew_id).first()
    if not crew_to_snapshot:
        raise HTTPException(status_code=404, detail=f"CrewMapping with ID {crew_id} not found during snapshot.")

    # 2. Create the new reference record using the IDs from the relationships.
    #    The JSONB columns can directly store the Python lists of IDs.
    reference = models.CrewMappingReference(
        crew_mapping_id=crew_id,
        employees_snapshot=[emp.id for emp in crew_to_snapshot.employees],
        equipment_snapshot=[eq.id for eq in crew_to_snapshot.equipment],
        materials_snapshot=[mat.id for mat in crew_to_snapshot.materials],
        vendors_snapshot=[ven.id for ven in crew_to_snapshot.vendors],
        dumping_sites_snapshot=[ds.id for ds in crew_to_snapshot.dumping_sites],
        created_by=user_id,
        notes=notes
    )

    db.add(reference)
    # The commit will be handled by the endpoint function to ensure transactional integrity.
    
    return reference

def restore_from_reference(db: Session, reference_id: int) -> models.CrewMapping:
    """
    Restores a CrewMapping's state from a given CrewMappingReference ID.

    Args:
        db: The SQLAlchemy database session.
        reference_id: The ID of the CrewMappingReference to restore from.

    Returns:
        The updated CrewMapping object, ready to be committed.
    """
    # 1. Fetch the reference snapshot.
    reference = db.query(models.CrewMappingReference).filter(models.CrewMappingReference.id == reference_id).first()
    if not reference:
        raise HTTPException(status_code=404, detail=f"CrewMappingReference with ID {reference_id} not found.")
        
    # 2. Fetch the target CrewMapping that will be restored.
    crew_to_restore = db.query(models.CrewMapping).filter(models.CrewMapping.id == reference.crew_mapping_id).first()
    if not crew_to_restore:
        raise HTTPException(status_code=404, detail=f"Target CrewMapping with ID {reference.crew_mapping_id} not found for restore.")

    # 3. Restore relationships by fetching the full objects from the database using the stored IDs.
    #    Ensure that the IDs are cast to the correct type (string) for models with string PKs.
    crew_to_restore.employees = db.query(models.Employee).filter(models.Employee.id.in_([str(id) for id in reference.employees_snapshot or []])).all()
    crew_to_restore.equipment = db.query(models.Equipment).filter(models.Equipment.id.in_([str(id) for id in reference.equipment_snapshot or []])).all()
    crew_to_restore.materials = db.query(models.Material).filter(models.Material.id.in_(reference.materials_snapshot or [])).all()
    crew_to_restore.vendors = db.query(models.Vendor).filter(models.Vendor.id.in_(reference.vendors_snapshot or [])).all()
    crew_to_restore.dumping_sites = db.query(models.DumpingSite).filter(models.DumpingSite.id.in_([str(id) for id in reference.dumping_sites_snapshot or []])).all()

    return crew_to_restore
