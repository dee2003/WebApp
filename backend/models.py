

import enum
from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, Float, Text,
    ForeignKey, Identity, func, Enum as SQLAlchemyEnum, Table, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base
from sqlalchemy.dialects.postgresql import JSON
# or
from sqlalchemy.dialects.postgresql import JSONB

# ============================================================================== #
# 1. ENUMS (FOR STATUS AND ROLE FLAGS)
# ============================================================================== #

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    APP_ADMIN = "APP_ADMIN"
    FOREMAN = "FOREMAN"
    SUPERVISOR = "SUPERVISOR"
    PROJECT_ENGINEER = "PROJECT_ENGINEER"
    ACCOUNTANT = "ACCOUNTANT"
    EXECUTIVE = "EXECUTIVE"

class ResourceStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ON_LEAVE = "on_leave"
    ON_HOLD = "on_hold"
# In models.py

class SubmissionStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DRAFT = "DRAFT"
    SENT = "Sent"
    IN_PROGRESS = "IN_PROGRESS" 
    SUBMITTED_TO_ENGINEER = "SubmittedToEngineer"  # ✅ add this
    APPROVED_BY_SUPERVISOR = "APPROVED_BY_SUPERVISOR"  # ✅ add this
    REVIEWED_BY_SUPERVISOR = "REVIEWED_BY_SUPERVISOR"
    APPROVED_BY_PE = "APPROVED_BY_PE" # <--- Ensure this is here

# ============================================================================== #
# 2. ASSOCIATION TABLES (FOR MANY-TO-MANY RELATIONSHIPS)
# ============================================================================== #

crew_employee_association = Table(
    'crew_employee_association', Base.metadata,
    Column('crew_id', Integer, ForeignKey('crew_mapping.id', ondelete="CASCADE"), primary_key=True),
    Column('employee_id', String, ForeignKey('employees.id', ondelete="CASCADE"), primary_key=True)
)

crew_equipment_association = Table(
    'crew_equipment_association', Base.metadata,
    Column('crew_id', Integer, ForeignKey('crew_mapping.id', ondelete="CASCADE"), primary_key=True),
    Column('equipment_id', String, ForeignKey('equipment.id', ondelete="CASCADE"), primary_key=True)
)



crew_dumping_site_association = Table(
    'crew_dumping_site_association', Base.metadata,
    Column('crew_id', Integer, ForeignKey('crew_mapping.id', ondelete="CASCADE"), primary_key=True),
    Column('dumping_site_id', String, ForeignKey('dumping_sites.id', ondelete="CASCADE"), primary_key=True)
)

# ============================================================================== #
# 3. SOFT DELETE MIXIN
# ============================================================================== #

class SoftDeleteMixin:
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    def soft_delete(self, session):
        """Perform a soft delete by marking the record as deleted."""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        session.commit()

# ============================================================================== #
# 4. CORE DATA MODELS
# ============================================================================== #


class Employee(Base):
    __tablename__ = "employees"
    id = Column(String, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=False)
    class_1 = Column(String)
    class_2 = Column(String, nullable=True)
    status = Column(SQLAlchemyEnum(ResourceStatus), default=ResourceStatus.ACTIVE, nullable=False)


class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # category = Column(String, nullable=False)
    # department = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey("category.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("department.id"), nullable=True)
    # category_number = Column(String, nullable=True)
    vin_number = Column(String, nullable=True)
    status = Column(SQLAlchemyEnum(ResourceStatus), default=ResourceStatus.ACTIVE, nullable=False)
    category_rel = relationship("Category", back_populates="equipments")
    department_rel = relationship("Department", back_populates="equipments")

class Department(Base):
    __tablename__ = "department"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    # one-to-many relationship
    equipments = relationship("Equipment", back_populates="department_rel")


class Category(Base):
    __tablename__ = "category"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    number = Column(String, unique=True, nullable=False)

    # one-to-many relationship
    equipments = relationship("Equipment", back_populates="category_rel")


vendor_material_link = Table(
    "vendor_material_link",
    Base.metadata,
    Column("vendor_id", Integer, ForeignKey("vendors.id", ondelete="CASCADE")),
    Column("material_id", Integer, ForeignKey("vendor_materials.id", ondelete="CASCADE")),
)
material_material_link = Table(
    "material_material_link",
    Base.metadata,
    Column("material_id", Integer, ForeignKey("materials_trucking.id", ondelete="CASCADE")),
    Column("vendor_material_id", Integer, ForeignKey("vendor_materials.id", ondelete="CASCADE"))
)
dumping_material_link = Table(
    "dumping_material_link",
    Base.metadata,
    Column("dumping_site_id", String, ForeignKey("dumping_sites.id", ondelete="CASCADE")),
    Column("material_id", Integer, ForeignKey("vendor_materials.id", ondelete="CASCADE")),
)
class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=False, unique=True, nullable=False)
    name = Column(String, nullable=False)
    vendor_type = Column(String, nullable=True)
    vendor_category = Column(String, nullable=True)
    status = Column(SQLAlchemyEnum(ResourceStatus), default=ResourceStatus.ACTIVE, nullable=False)

    materials = relationship(
        "VendorMaterial",
        secondary="vendor_material_link",
        back_populates="vendors",
        cascade="all, delete",
        passive_deletes=True
    )

class MaterialTrucking(Base):
    __tablename__ = "materials_trucking"

    id = Column(Integer, primary_key=True, index=True, autoincrement=False, unique=True, nullable=False)
    name = Column(String, nullable=False)
    material_type = Column(String, nullable=True)
    material_category = Column(String, nullable=True)
    status = Column(SQLAlchemyEnum(ResourceStatus), default=ResourceStatus.ACTIVE, nullable=False)

    materials = relationship(
        "VendorMaterial",
        secondary="material_material_link",
        back_populates="materials_trucking",
        cascade="all, delete",
        passive_deletes=True
    )
class DumpingSite(Base):
    __tablename__ = "dumping_sites"

    id = Column(String, primary_key=True, index=True, autoincrement=False, unique=True)
    name = Column(String, nullable=False)
    dumping_type = Column(String, nullable=True)
    dumping_category = Column(String, nullable=True)
    status = Column(SQLAlchemyEnum(ResourceStatus), default=ResourceStatus.ACTIVE, nullable=False)

    # 🔹 Many-to-many with vendor_materials
    materials = relationship(
        "VendorMaterial",
        secondary="dumping_material_link",
        back_populates="dumping_sites"
    )

class VendorMaterial(Base):
    __tablename__ = "vendor_materials"
    id = Column(Integer, primary_key=True, index=True, autoincrement= True)
    # vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"))
    material = Column(String, nullable=False)
    unit = Column(String, nullable=False)

    vendors = relationship(
        "Vendor",
        secondary="vendor_material_link",
        back_populates="materials"
    )
    materials_trucking = relationship(
        "MaterialTrucking",
        secondary="material_material_link",
        back_populates="materials"
    )
    dumping_sites = relationship(
        "DumpingSite",
        secondary="dumping_material_link",
        back_populates="materials"
    )




class VendorOption(Base):
    __tablename__ = "vendor_options"

    id = Column(Integer, primary_key=True, index=True)
    option_type = Column(String, nullable=False)   # e.g., "type", "category", "material", "unit"
    value = Column(String, nullable=False)         # e.g., "Concrete", "Hauler", etc.


class MaterialOption(Base):
    __tablename__ = "material_options"

    id = Column(Integer, Identity(start=1, increment=1), primary_key=True)
    type = Column(String, nullable=False)  # e.g., 'type', 'category'
    value = Column(String, unique=True, nullable=False)

class DumpingSiteOption(Base):
    __tablename__ = "dumping_site_options"

    id = Column(Integer, primary_key=True, index=True)
    option_type = Column(String, nullable=False)   # "type" or "category"
    value = Column(String, nullable=False, unique=True)



class JobPhase(Base):
    __tablename__ = "job_phases"

    id = Column(Integer, primary_key=True, index=True)
    job_code = Column(String, unique=True, nullable=False)
    contract_no = Column(String)
    job_description = Column(String)

    # ✅ Project Engineer info
    project_engineer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    project_engineer = Column(String, nullable=True)

    # ✅ Replace old jurisdiction field with location_id
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="SET NULL"))
    location = relationship("Location", back_populates="job_phases")

    # ✅ Status of job
    status = Column(String, default="active")

    # ✅ Phases and relationships
    phase_codes = relationship(
        "PhaseCode",
        back_populates="job_phase",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # ✅ Example if foreman jobs are linked
    assigned_foremen = relationship("ForemanJob", back_populates="job_phase")


class PhaseCode(Base):
    __tablename__ = "phase_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False)
    description = Column(String)
    unit = Column(String)

    # ✅ Foreign key linking to JobPhase
    job_phase_id = Column(Integer, ForeignKey("job_phases.id"))
    job_phase = relationship("JobPhase", back_populates="phase_codes")
    tickets = relationship("Ticket", back_populates="phase_code")  # NEW

class CrewMapping(Base, SoftDeleteMixin):
    __tablename__ = "crew_mapping"
    id = Column(Integer, primary_key=True, index=True)
    foreman_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # Many-to-many relationships
    employees = relationship("Employee", secondary=crew_employee_association)
    equipment = relationship("Equipment", secondary=crew_equipment_association)
    # materials = relationship("Material", secondary=crew_material_association)
    # vendors = relationship("Vendor", secondary=crew_vendor_association)
    dumping_sites = relationship("DumpingSite", secondary=crew_dumping_site_association)
    status = Column(String, default="Active")

    foreman = relationship("User", back_populates="crew_mappings")

    # NEW: Reference history of crew configurations
    references = relationship(
        "CrewMappingReference",
        back_populates="crew_mapping",
        cascade="all, delete-orphan",
        passive_deletes=True
    )




class CrewMappingReference(Base, SoftDeleteMixin):
    __tablename__ = "crew_mapping_references"

    id = Column(Integer, primary_key=True, index=True)
    crew_mapping_id = Column(Integer, ForeignKey("crew_mapping.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # JSON snapshots of crew composition at creation time
    employees_snapshot = Column(JSONB, nullable=True)
    equipment_snapshot = Column(JSONB, nullable=True)
    materials_snapshot = Column(JSONB, nullable=True)
    vendors_snapshot = Column(JSONB, nullable=True)
    dumping_sites_snapshot = Column(JSONB, nullable=True)

    notes = Column(Text, nullable=True)

    # Relationships
    crew_mapping = relationship("CrewMapping", back_populates="references")
    creator = relationship("User")


class Timesheet(Base):
    __tablename__ = "timesheets"
    id = Column(Integer, primary_key=True, index=True)
    foreman_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_phase_id = Column(Integer, ForeignKey("job_phases.id"), nullable=False, index=True)
    date = Column(Date, default=date.today, nullable=False)
    status = Column(
        SQLAlchemyEnum(SubmissionStatus, name="submissionstatus", create_type=False),
        nullable=False,
        default=SubmissionStatus.DRAFT
    )
    sent_date = Column(DateTime(timezone=True), server_default=func.now())  # 👈 auto set when created
    timesheet_name = Column(String, nullable=True)
    data = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    foreman = relationship("User", back_populates="timesheets")
    job_phase = relationship("JobPhase")
    files = relationship("TimesheetFile", back_populates="timesheet", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="timesheet")


    workflow_entries = relationship(
        "TimesheetWorkflow",
        back_populates="timesheet",
        cascade="all, delete-orphan"
    )
    def as_dict(self):
        return {
            "id": self.id,
            "date": str(self.date),
            "status": self.status,
            "foreman_id": self.foreman_id,
            "foreman_name": f"{self.foreman.first_name} {self.foreman.last_name}" if self.foreman else None,
            "job_phase_id": self.job_phase_id,
            "job_code": self.job_phase.job_code if self.job_phase else None,
            "phase_name": self.job_phase.job_description if self.job_phase else None
        }

class TimesheetWorkflow(Base):
    __tablename__ = "timesheet_workflows"

    id = Column(Integer, primary_key=True, index=True)
    timesheet_id = Column(Integer, ForeignKey("timesheets.id"))

    foreman_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    engineer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    by_role = Column(String, nullable=False)

    action = Column(String(50))  # sent, approved, rejected
    comments = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    timesheet = relationship("Timesheet", back_populates="workflow_entries")

    foreman = relationship(
        "User",
        foreign_keys=[foreman_id],
        back_populates="foreman_workflows",
        overlaps="foreman_workflows"
    )
    supervisor = relationship(
        "User",
        foreign_keys=[supervisor_id],
        back_populates="supervisor_workflows",
        overlaps="supervisor_workflows"
    )
    engineer = relationship(
        "User",
        foreign_keys=[engineer_id],
        back_populates="engineer_workflows",
        overlaps="engineer_workflows"
    )



class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    foreman_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_phase_id = Column(Integer, ForeignKey("job_phases.id"), nullable=False, index=True)
    timesheet_id = Column(Integer, ForeignKey("timesheets.id"))  # 👈 Add this
    phase_code_id = Column(Integer, ForeignKey("phase_codes.id"), nullable=True)  # ✅ NEW COLUMN
    category = Column(String, nullable=True)
    sub_category = Column(String, nullable=True)
    image_path = Column(String, nullable=False)
    raw_text_content = Column(String, nullable=True)
    table_data = Column(JSON, nullable=True)
    # --- Structured Data Fields (Unchanged) ---
    ticket_number = Column(String, index=True, nullable=True)
    ticket_date = Column(String, nullable=True) # Storing as string for simplicity
    haul_vendor = Column(String, nullable=True)
    truck_number = Column(String, nullable=True)
    material = Column(String, nullable=True)
    job_number = Column(String, nullable=True)
    phase_code_ = Column(String, nullable=True)
    zone = Column(String, nullable=True)
    hours = Column(Float, nullable=True)
    created_at = Column(DateTime, default=func.now())
    status = Column(SQLAlchemyEnum(SubmissionStatus), default=SubmissionStatus.PENDING, nullable=False)

    # Relationships
    foreman = relationship("User", back_populates="tickets")
    job_phase = relationship("JobPhase")
    timesheet = relationship("Timesheet", back_populates="tickets")
    phase_code = relationship("PhaseCode", back_populates="tickets")  # ✅ add this line

    def as_dict(self):
        return {
            "id": self.id,
            "date": str(self.date),
            "status": self.status,
            "foreman_name": f"{self.foreman.first_name} {self.foreman.last_name}" if self.foreman else None,
            "job_code": self.job_phase.job_code if self.job_phase else None,
            "phase_name": self.job_phase.phase_name if self.job_phase else None
        }

class TimesheetFile(Base):
    __tablename__ = "timesheet_files"
    id = Column(Integer, primary_key=True, index=True)
    timesheet_id = Column(Integer, ForeignKey("timesheets.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    foreman_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # 👈 added this line

    timesheet = relationship("Timesheet", back_populates="files")


class ForemanJob(Base):
    __tablename__ = "foreman_jobs"
    id = Column(Integer, primary_key=True, index=True)
    foreman_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_phase_id = Column(Integer, ForeignKey("job_phases.id", ondelete="CASCADE"), nullable=False, index=True)

    foreman = relationship("User", back_populates="assigned_jobs")
    job_phase = relationship("JobPhase", back_populates="assigned_foremen")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    # Backref to job phases
    job_phases = relationship("JobPhase", back_populates="location")


class Supplier(Base):
    __tablename__ = "supplier"
    id = Column(Integer, primary_key=True, index=True)
    concrete_supplier = Column(String, nullable=True)
    asphalt_supplier = Column(String, nullable=True)
    aggregate_supplier = Column(String, nullable=True)
    top_soil_supplier = Column(String, nullable=True)
class SupervisorSubmission(Base):
    __tablename__ = "supervisor_submissions"
    id = Column(Integer, primary_key=True, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String, default="SubmittedToEngineer")
    submitted_at = Column(DateTime, default=datetime.utcnow)



class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, unique=True, nullable=False)  # manually assigned
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=False)
    password = Column(String, nullable=False)  # Hashed password
    role = Column(SQLAlchemyEnum(UserRole), nullable=False)
    status = Column(SQLAlchemyEnum(ResourceStatus), nullable=False, default=ResourceStatus.ACTIVE)

    # Relationships
    tickets = relationship("Ticket", back_populates="foreman")
    timesheets = relationship(
        "Timesheet", back_populates="foreman", cascade="all, delete-orphan", passive_deletes=True
    )
    crew_mappings = relationship(
        "CrewMapping", back_populates="foreman", cascade="all, delete-orphan", passive_deletes=True
    )
    assigned_jobs = relationship("ForemanJob", back_populates="foreman", cascade="all, delete-orphan")
    foreman_workflows = relationship("TimesheetWorkflow", foreign_keys="[TimesheetWorkflow.foreman_id]")
    supervisor_workflows = relationship("TimesheetWorkflow", foreign_keys="[TimesheetWorkflow.supervisor_id]")
    engineer_workflows = relationship("TimesheetWorkflow", foreign_keys="[TimesheetWorkflow.engineer_id]")


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    
    # The user who performed the action. Can be null if the action was system-generated.
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # The type of action (e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN')
    action = Column(String, index=True, nullable=False)
    
    # The target resource being affected (e.g., 'USER', 'EQUIPMENT')
    target_resource = Column(String, index=True, nullable=False)
    
    # The ID of the specific resource that was changed
    target_resource_id = Column(String, nullable=True)
    
    # A detailed description of the change (e.g., "Changed role from 'admin' to 'foreman'")
    details = Column(Text, nullable=True)
    
    # The timestamp of when the action occurred
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class TicketWorkflow(Base):
    __tablename__ = "ticket_workflows"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    by_role = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    comments = Column(String, nullable=True)
