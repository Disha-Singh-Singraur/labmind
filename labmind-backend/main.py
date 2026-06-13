import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Import all models so SQLAlchemy knows about them before create_all
from database import engine, Base
import models.user  # noqa: F401
import models.experiment  # noqa: F401
import models.session  # noqa: F401
import models.photo  # noqa: F401
import models.chat  # noqa: F401
import models.override  # noqa: F401
import models.lab_session  # noqa: F401

# Import routers
from routes import auth, experiments, sessions, ai as ai_routes, override
from routes import lab_sessions as lab_sessions_routes, instructor

# Create all tables
Base.metadata.create_all(bind=engine)

# Create uploads directory
upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(upload_dir, exist_ok=True)

from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="LabMind API",
    description="AI-Powered Laboratory Assistant — Phase 1",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(experiments.router)
app.include_router(sessions.router)
app.include_router(ai_routes.router)
app.include_router(override.router)
app.include_router(lab_sessions_routes.router)
app.include_router(instructor.router)



@app.get("/")
async def root():
    use_real_ai = os.getenv("USE_REAL_AI", "false").lower() == "true"
    return {
        "message": "LabMind API v1.0",
        "status": "operational",
        "ai_mode": "live" if use_real_ai else "mock",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

# Trigger uvicorn reload
# Done

