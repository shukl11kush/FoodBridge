import datetime
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.db.session import engine, Base, SessionLocal
from app.db.models import User
from app.services.revert_service import execute_claim_reversion_job
from app.routers import auth, listings, claims, chat, rewards, admin

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("foodbridge")

# Create Database Tables Safely
try:
    Base.metadata.create_all(bind=engine, checkfirst=True)
    logger.info("Database schema initialized successfully.")
except Exception as e:
    logger.warning(f"Database schema initialization warning (tables may already exist): {str(e)}")

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="FoodBridge Dual-Portal Food Donation Platform REST API"
)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Background Task Scheduler for 2.5-hour claim auto-reversion
scheduler = BackgroundScheduler()

def scheduled_revert_job():
    db = SessionLocal()
    try:
        execute_claim_reversion_job(db)
    finally:
        db.close()

from app.auth.jwt import hash_password

def seed_admin_user():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "admin@foodbridge.com").first()
        if not admin_user:
            admin_user = User(
                email="admin@foodbridge.com",
                password_hash=hash_password("admin123"),
                user_type="ADMIN"
            )
            db.add(admin_user)
            db.commit()
            logger.info("Default admin user (admin@foodbridge.com) created successfully.")
    except Exception as e:
        db.rollback()
        logger.warning(f"Admin seeding check warning: {str(e)}")
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    seed_admin_user()
    scheduler.add_job(scheduled_revert_job, "interval", minutes=5)
    scheduler.start()
    logger.info("FoodBridge FastAPI service started & APScheduler initialized.")

@app.on_event("shutdown")
def shutdown_event():
    if scheduler.running:
        scheduler.shutdown()

# Include Routers
app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(claims.router)
app.include_router(chat.router)
app.include_router(rewards.router)
app.include_router(admin.router)

@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "app_name": settings.app_name,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.api_port, reload=True)
