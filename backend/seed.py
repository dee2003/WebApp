# # In your seed.py file

# from sqlalchemy.orm import sessionmaker
# from .models import User, UserRole, ResourceStatus  # <-- Make sure both enums are imported
# from .utils_comman import hash_password
# from .database import engine

# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# def seed_admin_users():
#     db = SessionLocal()
#     try:
#         # --- Admin User ---
#         admin_user = db.query(User).filter(User.username == "admin").first()
#         if not admin_user:
#             new_admin = User(
#                 id=1,
#                 username="admin",
#                 email="admin@yourcompany.com",
#                 first_name="System",
#                 last_name="Admin",
#                 password=hash_password("Admin@123"),
#                 # Use the enum members directly. SQLAlchemy will use the correct value ("admin").
#                 role=UserRole.ADMIN,
#                 status=ResourceStatus.ACTIVE
#             )
#             db.add(new_admin)
#             print("INFO:     Created System Admin user.")

#         # --- App Admin User ---
#         appadmin_user = db.query(User).filter(User.username == "appadmin").first()
#         if not appadmin_user:
#             new_app_admin = User(
#                 id=2,
#                 username="appadmin",
#                 email="appadmin@yourcompany.com",
#                 first_name="Application",
#                 last_name="Admin",
#                 password=hash_password("AppAdmin@123"),
#                 # Use the enum members directly. SQLAlchemy will use the correct value ("appadmin").
#                 role=UserRole.APP_ADMIN, # <-- Use the enum member you added
#                 status=ResourceStatus.ACTIVE
#             )
#             db.add(new_app_admin)
#             print("INFO:     Created Application Admin user.")

#         db.commit()
#         print("INFO:     Admin users seeded successfully.")
#     finally:
#         db.close()

import os
from sqlalchemy.orm import sessionmaker
from .models import User, UserRole, ResourceStatus
from .utils_comman import hash_password
from .database import engine

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_admin_users():
    db = SessionLocal()
    try:
        # Read passwords from ENV variables
        admin_pass = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123")  
        app_admin_pass = os.getenv("DEFAULT_APP_ADMIN_PASSWORD", "AppAdmin@123")

        # --- Admin User ---
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            new_admin = User(
                id=1,
                username="admin",
                email="deekshapoojary614@gmail.com",
                first_name="System",
                last_name="Admin",
                password=hash_password(admin_pass),
                role=UserRole.ADMIN,
                status=ResourceStatus.ACTIVE
            )
            db.add(new_admin)
            print("INFO:     Created System Admin user.")

        # --- App Admin User ---
        appadmin_user = db.query(User).filter(User.username == "appadmin").first()
        if not appadmin_user:
            new_app_admin = User(
                id=2,
                username="appadmin",
                email="appadmin@yourcompany.com",
                first_name="Application",
                last_name="Admin",
                password=hash_password(app_admin_pass),
                role=UserRole.APP_ADMIN,
                status=ResourceStatus.ACTIVE
            )
            db.add(new_app_admin)
            print("INFO:     Created Application Admin user.")

        db.commit()
        print("INFO:     Admin users seeded successfully.")
    finally:
        db.close()
