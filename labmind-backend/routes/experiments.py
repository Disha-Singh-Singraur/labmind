import os
import uuid
from typing import List

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth_middleware import get_current_user
from models.experiment import Experiment, ExperimentStep
from models.session import ExperimentSession
from models.user import User
from schemas.experiment import ExperimentOut, StepOut
from services.ai_service import parse_pdf_to_experiment, PRELOADED_EXPERIMENTS, PRELOADED_TEMPLATE_MAP

router = APIRouter(prefix="/experiments", tags=["experiments"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))


# ---------------------------------------------------------------------------
# Preloaded schemas
# ---------------------------------------------------------------------------

class PreloadedExperimentOut(BaseModel):
    id: int
    name: str
    subject: str
    difficulty: str
    duration_minutes: int
    step_count: int
    objective: str
    materials: List[str]
    safety_notes: List[str]


class StartPreloadedOut(BaseModel):
    session_id: int
    experiment_id: int


# ---------------------------------------------------------------------------
# Preloaded routes — MUST come before /{experiment_id} to avoid routing clash
# ---------------------------------------------------------------------------

@router.get("/preloaded", response_model=List[PreloadedExperimentOut])
async def get_preloaded_experiments():
    """Return the 3 built-in template experiments. No auth required."""
    return [
        PreloadedExperimentOut(**{k: v for k, v in exp.items() if k != "template_key"})
        for exp in PRELOADED_EXPERIMENTS
    ]


@router.post("/start-preloaded/{preloaded_id}", response_model=StartPreloadedOut)
async def start_preloaded_experiment(
    preloaded_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a real experiment + active session from a preloaded template."""
    catalog_entry = next((e for e in PRELOADED_EXPERIMENTS if e["id"] == preloaded_id), None)
    if not catalog_entry:
        raise HTTPException(status_code=404, detail="Preloaded experiment not found")

    template = PRELOADED_TEMPLATE_MAP[catalog_entry["template_key"]]

    # Create the experiment record owned by this user
    experiment = Experiment(
        user_id=current_user.id,
        name=template["name"],
        objective=template["objective"],
        materials=template["materials"],
        safety_notes=template["safety_notes"],
        result_questions=template.get("result_questions"),
        raw_pdf_text=None,
    )
    db.add(experiment)
    db.flush()  # get experiment.id

    # Create steps
    for step_data in template["steps"]:
        step = ExperimentStep(
            experiment_id=experiment.id,
            step_number=step_data["step_number"],
            title=step_data["title"],
            description=step_data["description"],
            why=step_data.get("why"),
            safety_warning=step_data.get("safety_warning"),
            checkpoint_required=step_data.get("checkpoint_required", False),
        )
        db.add(step)

    # Create active session starting at step 1
    session = ExperimentSession(
        experiment_id=experiment.id,
        user_id=current_user.id,
        current_step_number=1,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return StartPreloadedOut(session_id=session.id, experiment_id=experiment.id)



@router.post("/upload-pdf", response_model=ExperimentOut)
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE_MB}MB",
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.pdf"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    # Extract text using PyMuPDF
    pdf_doc = fitz.open(filepath)
    pdf_text = ""
    for page in pdf_doc:
        pdf_text += page.get_text()
    pdf_doc.close()

    if not pdf_text.strip():
        pdf_text = "No text could be extracted from this PDF (possibly scanned image)"

    # Parse with AI service
    parsed = await parse_pdf_to_experiment(pdf_text)

    experiment = Experiment(
        user_id=current_user.id,
        name=parsed["name"],
        objective=parsed["objective"],
        materials=parsed["materials"],
        safety_notes=parsed["safety_notes"],
        result_questions=parsed.get("result_questions"),
        raw_pdf_text=pdf_text[:10000],  # Store first 10k chars
    )
    db.add(experiment)
    db.flush()  # Get experiment.id

    for step_data in parsed["steps"]:
        step = ExperimentStep(
            experiment_id=experiment.id,
            step_number=step_data["step_number"],
            title=step_data["title"],
            description=step_data["description"],
            why=step_data.get("why"),
            safety_warning=step_data.get("safety_warning"),
            checkpoint_required=step_data.get("checkpoint_required", False),
        )
        db.add(step)

    db.commit()
    db.refresh(experiment)
    return ExperimentOut.model_validate(experiment)


@router.get("/all", response_model=List[ExperimentOut])
async def list_all_experiments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all experiments in the system — intended for instructors to pick when creating a lab session."""
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can list all experiments")
    experiments = (
        db.query(Experiment)
        .order_by(Experiment.created_at.desc())
        .all()
    )
    return [ExperimentOut.model_validate(e) for e in experiments]


@router.get("/", response_model=List[ExperimentOut])
async def list_experiments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiments = (
        db.query(Experiment)
        .filter(Experiment.user_id == current_user.id)
        .order_by(Experiment.created_at.desc())
        .all()
    )
    return [ExperimentOut.model_validate(e) for e in experiments]


@router.get("/{experiment_id}", response_model=ExperimentOut)
async def get_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = (
        db.query(Experiment)
        .filter(Experiment.id == experiment_id)
        .first()
    )
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return ExperimentOut.model_validate(experiment)


@router.get("/{experiment_id}/steps", response_model=List[StepOut])
async def get_steps(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = (
        db.query(Experiment)
        .filter(Experiment.id == experiment_id)
        .first()
    )
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return [StepOut.model_validate(s) for s in experiment.steps]
