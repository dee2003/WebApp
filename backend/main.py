# backend/main.py
from fastapi import FastAPI, Depends, APIRouter, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List
import logging
import sys
import os
from sqlalchemy import func # <--- ADD THIS IMPORT
from sqlalchemy.orm import selectinload
from .schemas import Token  # <-- You will need to create this simple schema
from fastapi.security import OAuth2PasswordRequestForm  # <--- ADD THIS LINE
from . import token  # <--- ADD THIS LINE
from . import models, schemas, database, crud
from .crud import create_crud_router
from .routers import timesheet, tickets, review, equipment, submissions, project_engineer,job_phases,vendor_options,vendor_router, vendor_materials, material_trucking_router, material_option_router, dumping_site_router,section_category_router, section_list_router  
from .ocr import ocr_main
from sqlalchemy import and_
from .routers.dropdowns import router as dropdowns_router
from .seed import seed_admin_users  # <-- 1. Import your seeding function
from jose import JWTError, jwt
from .token import SECRET_KEY, ALGORITHM # Assuming these are in token.py
from . import oauth2  # <--- REPLACE IT WITH THIS
from dotenv import load_dotenv
import os
from .routers import password_reset
from routers import auth
from routers import web_password_reset
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import FastAPI, Request, status
from backend.schemas import LoginRequest   

# load_dotenv(".env")  
# print("SMTP_USER:", os.getenv("SMTP_USER"))
# print("SMTP_PASSWORD:", os.getenv("SMTP_PASSWORD"))
# # -------------------------------
# Database: Create all tables
# -------------------------------
models.Base.metadata.create_all(bind=database.engine)

# -------------------------------
# App and Middleware
# -------------------------------
app = FastAPI()
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    print("🔴 422 VALIDATION ERROR:")
    print("BODY:", body.decode('utf-8') if body else "NO BODY")
    print("ERRORS:", exc.errors())
    print("HEADERS:", dict(request.headers))
    print("============================")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "received_body": body.decode('utf-8') if body else None
        }
    )
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
def on_startup():
    """
    This function runs when the application starts.
    It seeds the database with initial admin users if they don't exist.
    """
    print("--- Running startup tasks ---")
    seed_admin_users()  # <-- 2. Call the function here
    print("--- Startup tasks complete ---")
# -------------------------------
# Static Files
# -------------------------------
app.mount("/storage", StaticFiles(directory="storage"), name="storage")
TICKETS_DIR = r"D:\WebApp\backend\tickets_dir"
app.mount("/media/tickets", StaticFiles(directory=os.path.abspath(TICKETS_DIR)), name="tickets")

PDF_TICKETS_DIR = r"D:\WebApp\backend\ticket_pdfs"
os.makedirs(PDF_TICKETS_DIR, exist_ok=True)

app.mount(
    "/media/ticket_pdfs",
    StaticFiles(directory=PDF_TICKETS_DIR),
    name="ticket_pdfs"
)


# -------------------------------
# Logging setup
# -------------------------------
access_logger = logging.getLogger("uvicorn.access")
access_logger.handlers.clear()
access_uvicorn_handler = logging.StreamHandler()
access_logger.addHandler(access_uvicorn_handler)
access_logger.propagate = False
access_logger.setLevel(logging.INFO)

# -------------------------------
# Job & Phase Management Router
# -------------------------------
# job_phase_router = APIRouter(prefix="/api/job-phases", tags=["Job Phases"])

crew_mapping_router = APIRouter(prefix="/api/crew-mapping", tags=["Crew Mapping"])

def parse_ids(id_string: str):
    if not id_string:
        return []
    return [item.strip() for item in id_string.split(",") if item.strip()]

def list_to_csv(id_list: List):
    return ",".join(map(str, id_list))

@crew_mapping_router.get("/", response_model=List[schemas.CrewMappingResponse])
def list_crew_mappings(db: Session = Depends(database.get_db)):
    """Lists all non-deleted and ACTIVE crew mappings."""
    return db.query(models.CrewMapping).filter(
        models.CrewMapping.is_deleted == False,
        # --- ADD THIS FILTER ---
        models.CrewMapping.status == 'Active' # Assuming status is a string here
    ).all()

@crew_mapping_router.get("/foreman-list", response_model=List[int])
def get_foremen_with_crew(db: Session = Depends(database.get_db)):
    foremen = db.query(models.CrewMapping.foreman_id).filter(
        models.CrewMapping.is_deleted == False,
        models.CrewMapping.status == 'Active'
    ).distinct().all()

    # each result is a tuple like: (3,) → so flatten it
    return [f[0] for f in foremen]


@crew_mapping_router.get("/by-foreman/{foreman_id}", response_model=schemas.CrewMappingResponse)
def get_crew_details_by_foreman(foreman_id: int, db: Session = Depends(database.get_db)):
    mapping_details = crud.get_crew_mapping(db, foreman_id=foreman_id)
    if not mapping_details:
        raise HTTPException(status_code=404, detail=f"No crew mapping found for foreman with ID {foreman_id}")
    return mapping_details

@crew_mapping_router.get("/{crew_id}", response_model=schemas.CrewMappingResponse) # ✅ CORRECTED
def get_crew_mapping_by_id(crew_id: int, db: Session = Depends(database.get_db)):
    """Gets a single crew mapping by its ID."""
    mapping = db.query(models.CrewMapping).filter(
        models.CrewMapping.id == crew_id, 
        models.CrewMapping.is_deleted == False
    ).first()
    if not mapping:
        raise HTTPException(status_code=404, detail=f"Crew mapping with id {crew_id} not found")
    return mapping
# In backend/main.py

# -------------------------------
# Dedicated User Router
# -------------------------------
user_router = APIRouter(prefix="/api/users", tags=["Users"])

# In backend/main.py

# Ensure these are imported at the top of your file
from .auditing import log_action


@user_router.post("/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(database.get_db),
    # --- 1. ADD THIS DEPENDENCY ---
    # This securely gets the admin who is performing this action.
    current_admin: models.User = Depends(oauth2.get_current_user) 
):
    """
    Creates a new user with a manually provided ID and logs the action.
    """
    # 1. Validate that the manually provided ID is unique (existing code)
    if db.query(models.User).filter(models.User.id == user.id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with ID {user.id} already exists."
        )

    # 2. Validate that the email is unique (existing code)
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email address is already registered."
        )

    # 3. Validate that the username is unique (existing code)
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken."
        )

    # Hash the password before storing (existing code)
    hashed_password = utils_comman.hash_password(user.password)

    # Create a new User database model instance using the validated data (existing code)
    new_user = models.User(
        id=user.id,
        username=user.username,
        email=user.email,
        password=hashed_password,
        first_name=user.first_name,
        middle_name=user.middle_name,
        last_name=user.last_name,
        role=user.role,
        status=user.status
    )
    
    # Add the new user to the session
    db.add(new_user)
    
    # --- 2. ADD THE AUDIT LOG ENTRY ---
    log_action(
        db=db,
        user_id=current_admin.id,
        action='CREATE',
        target_resource='USER',
        target_resource_id=new_user.id, # The ID of the user being created
        details=f"User '{new_user.username}' created with role '{new_user.role.value}' by  '{current_admin.username}'."
    )
    
    # --- 3. COMMIT BOTH CHANGES AT ONCE ---
    # This ensures that if logging fails, the user creation is also rolled back.
    db.commit()
    db.refresh(new_user)
    
    return new_user


def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """
    Retrieves a list of ONLY ACTIVE users.
    """
    # --- ADD THIS FILTER ---
    users = db.query(models.User).filter(
        models.User.status == models.ResourceStatus.ACTIVE
    ).offset(skip).limit(limit).all()
    
    return users

# --- The Correct Update Endpoint for Users ---
@user_router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(database.get_db), 
    current_admin: models.User = Depends(oauth2.get_current_user)
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)
    if not update_data:
        return db_user

    # --- 1. CAPTURE & PROCESS CHANGES FOR AUDIT LOGGING ---
    
    # Dictionary to store only the fields that were modified
    changed_fields = {}
    
    # Iterate through the fields provided in the update request
    for field, new_value in update_data.items():
        # Get the original value from the database object
        old_value = getattr(db_user, field)
        
        # NOTE: Handle ENUMs correctly by comparing string representations
        # or handle different types of comparison as needed (e.g., date vs string)
        old_value_to_compare = str(old_value).strip().lower() if old_value else None
        new_value_to_compare = str(new_value).strip().lower() if new_value else None

        # Check if the value has actually changed
        if old_value_to_compare != new_value_to_compare:
            # Store the change details
            changed_fields[field] = {
                "old": old_value,
                "new": new_value
            }
            
            # 2. Apply the change to the database object
            setattr(db_user, field, new_value)
            
    # If no effective changes were found after comparison, skip logging and commit
    if not changed_fields:
        return db_user

    # --- 3. ADD THE AUDIT LOG ENTRY ---
    # Log details as a JSON string for easy readability and querying
    details_log = {
        "user_id_updated": db_user.id,
        "username_updated": db_user.username,
        "admin_username": current_admin.username,
        "changes": changed_fields
    }

    log_action(
        db=db,
        user_id=current_admin.id,
        action='UPDATE',
        target_resource='USER',
        target_resource_id=db_user.id,
        details=f"User '{db_user.username}' updated. Changes: {changed_fields}"
    )
    
    # 4. Commit both the update and the log entry
    db.commit()
    db.refresh(db_user)
    
    return db_user


@user_router.get("/role/{role_name}", response_model=List[schemas.User])
def get_active_users_by_role(role_name: str, db: Session = Depends(database.get_db)):
    """
    Retrieves all ACTIVE users for the given role (case-insensitive input).
    Works even when DB columns are ENUM types.
    """
    valid_roles = ["foreman", "supervisor", "project_engineer", "admin", "accountant"]
    role_name_clean = role_name.strip().upper()

    if role_name.lower() not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' is not a valid role."
        )

    # Match ENUM directly using uppercase string
    active_users_in_role = db.query(models.User).filter(
        and_(
            models.User.role == role_name_clean,
            models.User.status == "ACTIVE"
        )
    ).all()

    return active_users_in_role
@user_router.get("/{user_id}", response_model=schemas.User)
def get_user(user_id: int, db: Session = Depends(database.get_db)):
    """
    Retrieve a single user by ID.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@user_router.get("/", response_model=List[schemas.User])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    """
    Retrieve all ACTIVE users excluding admins and app_admins.
    """
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.APP_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to view users.")
    
    users = db.query(models.User).filter(
        models.User.status == models.ResourceStatus.ACTIVE,
        models.User.role.notin_([models.UserRole.ADMIN, models.UserRole.APP_ADMIN])  # Exclude admin roles
    ).offset(skip).limit(limit).all()
    
    return users

@crew_mapping_router.post("/", response_model=schemas.CrewMappingResponse, status_code=201)
def create_crew_mapping(crew: schemas.CrewMappingCreate, db: Session = Depends(database.get_db),current_admin: models.User = Depends(oauth2.get_current_user) 
):
    """
    Creates a new crew mapping and correctly links the related resources
    using SQLAlchemy relationships, ensuring correct data types for IDs.
    """

    # ✅ Step 1: Deactivate all previous active mappings for this foreman
    db.query(models.CrewMapping).filter(
        models.CrewMapping.foreman_id == crew.foreman_id,
        models.CrewMapping.status == "Active"
    ).update({models.CrewMapping.status: "Inactive"})
    db.commit()

    # ✅ Step 2: Create new mapping as Active
    db_crew = models.CrewMapping(
        foreman_id=crew.foreman_id,
        status="Active"  # always Active when newly created
    )

    # ✅ Step 3: Handle relationships safely
    if crew.employee_ids:
        string_ids = [str(eid) for eid in crew.employee_ids]
        employee_objects = db.query(models.Employee).filter(models.Employee.id.in_(string_ids)).all()
        db_crew.employees = employee_objects

    if crew.equipment_ids:
        string_ids = [str(eid) for eid in crew.equipment_ids]
        equipment_objects = db.query(models.Equipment).filter(models.Equipment.id.in_(string_ids)).all()
        db_crew.equipment = equipment_objects

    if crew.material_ids:
        material_objects = db.query(models.Material).filter(models.Material.id.in_(crew.material_ids)).all()
        db_crew.materials = material_objects

    if crew.vendor_ids:
        vendor_objects = db.query(models.Vendor).filter(models.Vendor.id.in_(crew.vendor_ids)).all()
        db_crew.vendors = vendor_objects

    if crew.dumping_site_ids:
        string_ids = [str(dsid) for dsid in crew.dumping_site_ids]
        dumping_site_objects = db.query(models.DumpingSite).filter(models.DumpingSite.id.in_(string_ids)).all()
        db_crew.dumping_sites = dumping_site_objects

    # ✅ Step 4: Save the new mapping
    db.add(db_crew)
    db.commit()
    db.refresh(db_crew)
    log_action(
        db=db,
        user_id=current_admin.id,
        action='CREATE',
        target_resource='CREW_MAPPING',
        target_resource_id=db_crew.id,
        details=(
            f"Crew mapping created for Foreman ID '{db_crew.foreman_id}' "
            f"with Employees: {crew.employee_ids}, Equipment: {crew.equipment_ids}, "
            f"Materials: {crew.material_ids}, Vendors: {crew.vendor_ids}, "
            f"Dumping Sites: {crew.dumping_site_ids} by '{current_admin.username}'."
        )
    )

    return db_crew


@crew_mapping_router.put("/{crew_id}", response_model=schemas.CrewMappingResponse)
def update_crew_mapping(crew_id: int, crew: schemas.CrewMappingCreate, db: Session = Depends(database.get_db)):
    """
    Updates an existing crew mapping by finding it and replacing its
    relationships with the new set of provided IDs.
    """
    # Step 1: Find the existing crew mapping record
    db_crew = db.query(models.CrewMapping).filter(
        models.CrewMapping.id == crew_id, 
        models.CrewMapping.is_deleted == False
    ).first()

    if not db_crew:
        raise HTTPException(status_code=404, detail="Crew mapping not found")

    # Step 2: Update the direct fields on the object
    db_crew.foreman_id = crew.foreman_id
    db_crew.status = crew.status or "Active"
    
    # Step 3: Update all relationships by fetching the new objects
    
    # Handle Employees (String IDs)
    if crew.employee_ids:
        string_ids = [str(eid) for eid in crew.employee_ids]
        db_crew.employees = db.query(models.Employee).filter(models.Employee.id.in_(string_ids)).all()
    else:
        db_crew.employees = []  # Clear the relationship if an empty list is provided

    # Handle Equipment (String IDs)
    if crew.equipment_ids:
        string_ids = [str(eid) for eid in crew.equipment_ids]
        db_crew.equipment = db.query(models.Equipment).filter(models.Equipment.id.in_(string_ids)).all()
    else:
        db_crew.equipment = []

    # Handle Materials (Integer IDs)
    if crew.material_ids:
        db_crew.materials = db.query(models.Material).filter(models.Material.id.in_(crew.material_ids)).all()
    else:
        db_crew.materials = []

    # Handle Vendors (Integer IDs)
    if crew.vendor_ids:
        db_crew.vendors = db.query(models.Vendor).filter(models.Vendor.id.in_(crew.vendor_ids)).all()
    else:
        db_crew.vendors = []

    # Handle Dumping Sites (String IDs)
    if crew.dumping_site_ids:
        string_ids = [str(dsid) for dsid in crew.dumping_site_ids]
        db_crew.dumping_sites = db.query(models.DumpingSite).filter(models.DumpingSite.id.in_(string_ids)).all()
    else:
        db_crew.dumping_sites = []

    # Step 4: Commit the session to save all changes
    db.commit()
    db.refresh(db_crew)
    
    return db_crew


@crew_mapping_router.delete("/{crew_id}", status_code=204)
def soft_delete_crew_mapping(crew_id: int, db: Session = Depends(database.get_db)):
    db_crew = db.query(models.CrewMapping).filter(
        models.CrewMapping.id == crew_id, 
        models.CrewMapping.is_deleted == False
    ).first()

    if not db_crew:
        raise HTTPException(status_code=404, detail="Crew mapping not found")

    db_crew.is_deleted = True
    # ✅ CORRECTED: Use func directly from SQLAlchemy
    db_crew.deleted_at = func.now() 
    
    db.commit()
    
    # A 204 No Content response should not return a body
    return


# -------------------------------
# CRUD Routers for Other Models
# -------------------------------
crud_models = [
    # {"model": models.User, "schemas": (schemas.UserCreate, schemas.User)},
    {"model": models.Employee, "schemas": (schemas.EmployeeCreate, schemas.Employee)},
    {"model": models.Equipment, "schemas": (schemas.EquipmentCreate, schemas.Equipment)},
    # {"model": models.Vendor, "schemas": (schemas.VendorCreate, schemas.Vendor)},
    # {"model": models.Material, "schemas": (schemas.MaterialCreate, schemas.Material)},
    # {"model": models.DumpingSite, "schemas": (schemas.DumpingSiteCreate, schemas.DumpingSite)},
]

for item in crud_models:
    model, (create_schema, response_schema) = item["model"], item["schemas"]
    prefix, tags = f"/api/{model.__tablename__}", [model.__tablename__.capitalize()]
    router = create_crud_router(model=model, create_schema=create_schema, response_schema=response_schema, prefix=prefix, tags=tags)
    app.include_router(router)

# -------------------------------
# Include All Other Routers
# -------------------------------
app.include_router(user_router) # <--- ADD THIS LINE
# app.include_router(job_phase_router)
app.include_router(crew_mapping_router)
app.include_router(timesheet.router)
app.include_router(equipment.router)
app.include_router(submissions.router)
app.include_router(tickets.router)
app.include_router(review.router)
app.include_router(project_engineer.router)
app.include_router(ocr_main.router)
app.include_router(dropdowns_router)
# ... other routers
app.include_router(job_phases.router)  # ✅ make sure this is here
app.include_router(vendor_options.router)
app.include_router(vendor_router.router)
app.include_router(vendor_materials.router)
app.include_router(material_trucking_router.router)
app.include_router(material_option_router.router)
app.include_router(dumping_site_router.router)
app.include_router(section_category_router.router)
app.include_router(section_list_router.router)
# ✅ CORRECT ORDER - No conflicts
app.include_router(auth.router)           # Login + OTP (if it has them)
app.include_router(password_reset.router) # Token reset ← MOUNT LAST
app.include_router(web_password_reset.router)



# -------------------------------
# Auth Router
# -------------------------------
from . import utils_comman
from fastapi import APIRouter
from .auditing import log_action 

auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])

from fastapi import Form, Depends
from typing import Optional

@auth_router.post("/login", response_model=schemas.Token)
def login(
    username: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    password: str = Form(...),
    db: Session = Depends(database.get_db)
):
    # Must provide either username or email
    if not username and not email:
        raise HTTPException(
            status_code=400,
            detail="You must provide either username or email"
        )

    # Look up user by username OR email
    query = models.User

    if username:
        user = db.query(query).filter(query.username == username).first()
    else:
        user = db.query(query).filter(query.email == email).first()

    if not user or not utils_comman.verify_password(password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid login credentials"
        )

    access_token = token.create_access_token(
        data={"sub": user.username, "role": str(user.role.value)}
    )
    user_data = {
    "id": user.id,
    "username": user.username,
    "email": user.email,
    "first_name": user.first_name,
    "middle_name": user.middle_name,
    "last_name": user.last_name
    }

    print("LOGIN USER DATA →", user_data)
    log_action(
        db=db,
        user_id=user.id,
        action="LOGIN_SUCCESS",
        target_resource="USER",
        target_resource_id=str(user.id),
        details=f"User '{user.username}' logged in successfully."
    )
    db.commit()
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "middle_name": user.middle_name,
            "last_name": user.last_name
        }
    }





def get_current_user(token: str = Depends(token.oauth2_scheme), db: Session = Depends(database.get_db)):
    """
    This is a dependency that does the following:
    1. Verifies the JWT token from the request's Authorization header.
    2. Decodes the username from the token.
    3. Fetches the corresponding user object from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            print("JWT ERROR:", e)

            raise credentials_exception
    except JWTError:
        raise credentials_exception
    print("TOKEN RECEIVED:", token)
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
        
    return user

@auth_router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "middle_name": current_user.middle_name,
        "last_name": current_user.last_name,
        "role": current_user.role.value
    }

app.include_router(auth_router)
# -------------------------------
# Admin Dashboard Data Endpoint
# -------------------------------
@app.get("/api/data", response_model=schemas.AppData, tags=["App Data"])
def get_all_data(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user) # <-- THIS PROTECTS THE ENDPOINT
):
    """
    Provides all necessary data for the Admin Dashboard.
    This endpoint is now secure and requires authentication.
    """
    # You can add role-based authorization here if you want
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.APP_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource."
        )

    # Fetch all users EXCEPT for 'admin' and 'appadmin'
    filtered_users = db.query(models.User).filter(
        models.User.role.notin_([models.UserRole.ADMIN, models.UserRole.APP_ADMIN])
    ).all()

    return {
        "users": filtered_users,
        "employees": db.query(models.Employee).all(),
        "equipment": db.query(models.Equipment).all(),
        "job_phases": db.query(models.JobPhase).all(),
        "vendors": db.query(models.Vendor).all(),
        "dumping_sites": db.query(models.DumpingSite).all(),
    }

# app.include_router(
#     timesheet.router,
#     prefix="/api/timesheets", # This must match the URL your frontend is calling
#     tags=["Timesheets"],      # This is for organizing the API docs
# )




# -------------------------------
# Dedicated User Router
# -------------------------------
# In backend/main.py
from typing import List # Make sure List is imported from typing

# ...

# --- ADD THIS NEW ENDPOINT ---
@app.get("/api/audit-logs", response_model=List[schemas.AuditLogResponse], tags=["Auditing"])
def get_audit_logs(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Retrieves audit log entries, newest first. Only accessible by admins."""
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs.")
        
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return logs





