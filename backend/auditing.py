# In backend/auditing.py

from sqlalchemy.orm import Session
from . import models

def log_action(
    db: Session,
    user_id: int,
    action: str,
    target_resource: str,
    target_resource_id: int = None,
    details: str = None
):
    """
    Creates a new entry in the audit log.
    
    - user_id: The ID of the user who performed the action.
    - action: The action performed (e.g., 'CREATE', 'UPDATE').
    - target_resource: The type of object affected (e.g., 'USER').
    - target_resource_id: The ID of the object affected.
    - details: A description of what changed.
    """
    new_log_entry = models.AuditLog(
        user_id=user_id,
        action=action,
        target_resource=target_resource,
        target_resource_id=target_resource_id,
        details=details
    )
    db.add(new_log_entry)
    # db.commit()
