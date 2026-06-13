from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth_middleware import get_current_user
from models.experiment import Experiment, ExperimentStep
from models.session import ExperimentSession, SessionProgress
from models.user import User
from schemas.session import (
    SessionOut,
    StartSessionRequest,
    UpdateStepRequest,
    SessionProgressOut,
    ActiveSessionOut,
    MySessionOut,
)
from models.lab_session import LabSessionEnrollment

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/start", response_model=SessionOut)
async def start_session(
    data: StartSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    experiment = (
        db.query(Experiment)
        .filter(Experiment.id == data.experiment_id)
        .first()
    )
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    # Check for an existing active session
    existing = (
        db.query(ExperimentSession)
        .filter(
            ExperimentSession.experiment_id == data.experiment_id,
            ExperimentSession.user_id == current_user.id,
            ExperimentSession.status == "active",
        )
        .order_by(ExperimentSession.started_at.desc())
        .first()
    )

    if existing:
        if not data.force:
            # Resume: return the existing session
            return SessionOut.model_validate(existing)
        else:
            # Force fresh start: delete old session first
            db.query(LabSessionEnrollment).filter(
                LabSessionEnrollment.experiment_session_id == existing.id
            ).update({LabSessionEnrollment.experiment_session_id: None}, synchronize_session=False)
            db.delete(existing)
            db.commit()

    session = ExperimentSession(
        experiment_id=data.experiment_id,
        user_id=current_user.id,
        current_step_number=1,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)



@router.get("/active", response_model=List[ActiveSessionOut])
async def get_all_active_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all currently active sessions across all students. Instructor only."""
    if current_user.role != "instructor":
        raise HTTPException(
            status_code=403, detail="Only instructors can view active student sessions"
        )

    # Query all active sessions
    active_sessions = (
        db.query(ExperimentSession)
        .filter(ExperimentSession.status == "active")
        .order_by(ExperimentSession.started_at.desc())
        .all()
    )

    result = []
    for sess in active_sessions:
        student = sess.user
        experiment = sess.experiment
        total_steps = len(experiment.steps) if experiment else 0

        result.append(
            ActiveSessionOut(
                student_name=student.full_name if student else "Unknown Student",
                student_id=sess.user_id,
                experiment_name=experiment.name if experiment else "Unknown Experiment",
                current_step_number=sess.current_step_number,
                total_steps=total_steps,
                status=sess.status,
                started_at=sess.started_at,
                session_id=sess.id,
                experiment_id=sess.experiment_id,
            )
        )
    return result


@router.get("/active/{experiment_id}", response_model=SessionOut)
async def get_active_session(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the most recent active (in-progress) session for this experiment, if any."""
    session = (
        db.query(ExperimentSession)
        .filter(
            ExperimentSession.experiment_id == experiment_id,
            ExperimentSession.user_id == current_user.id,
            ExperimentSession.status == "active",
        )
        .order_by(ExperimentSession.started_at.desc())
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return SessionOut.model_validate(session)


@router.get("/my-active", response_model=List[MySessionOut])
async def get_my_active_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all active individual (non-lab) sessions for the current student."""
    active_sessions = (
        db.query(ExperimentSession)
        .filter(
            ExperimentSession.user_id == current_user.id,
            ExperimentSession.status == "active",
            ~ExperimentSession.id.in_(
                db.query(LabSessionEnrollment.experiment_session_id)
                .filter(LabSessionEnrollment.experiment_session_id.isnot(None))
            )
        )
        .order_by(ExperimentSession.started_at.desc())
        .all()
    )

    result = []
    for sess in active_sessions:
        exp = sess.experiment
        total_steps = len(exp.steps) if exp else 0
        result.append(
            MySessionOut(
                id=sess.id,
                experiment_id=sess.experiment_id,
                experiment_name=exp.name if exp else "Unknown Experiment",
                experiment_objective=exp.objective if exp else "",
                current_step_number=sess.current_step_number,
                total_steps=total_steps,
                status=sess.status,
                started_at=sess.started_at,
                completed_at=sess.completed_at,
            )
        )
    return result


@router.get("/my-completed", response_model=List[MySessionOut])
async def get_my_completed_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all completed individual (non-lab) sessions for the current student."""
    completed_sessions = (
        db.query(ExperimentSession)
        .filter(
            ExperimentSession.user_id == current_user.id,
            ExperimentSession.status == "completed",
            ~ExperimentSession.id.in_(
                db.query(LabSessionEnrollment.experiment_session_id)
                .filter(LabSessionEnrollment.experiment_session_id.isnot(None))
            )
        )
        .order_by(ExperimentSession.completed_at.desc())
        .all()
    )

    result = []
    for sess in completed_sessions:
        exp = sess.experiment
        total_steps = len(exp.steps) if exp else 0
        result.append(
            MySessionOut(
                id=sess.id,
                experiment_id=sess.experiment_id,
                experiment_name=exp.name if exp else "Unknown Experiment",
                experiment_objective=exp.objective if exp else "",
                current_step_number=sess.current_step_number,
                total_steps=total_steps,
                status=sess.status,
                started_at=sess.started_at,
                completed_at=sess.completed_at,
            )
        )
    return result



@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ExperimentSession)
        .filter(
            ExperimentSession.id == session_id,
            ExperimentSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionOut.model_validate(session)


@router.put("/{session_id}/step", response_model=SessionOut)
async def update_step(
    session_id: int,
    data: UpdateStepRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ExperimentSession)
        .filter(
            ExperimentSession.id == session_id,
            ExperimentSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Record completion of the current step
    current_step = (
        db.query(ExperimentStep)
        .filter(
            ExperimentStep.experiment_id == session.experiment_id,
            ExperimentStep.step_number == session.current_step_number,
        )
        .first()
    )

    if current_step:
        progress = SessionProgress(
            session_id=session.id,
            step_id=current_step.id,
            notes=data.notes,
        )
        db.add(progress)

    session.current_step_number = data.step_number
    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)


@router.put("/{session_id}/complete", response_model=SessionOut)
async def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ExperimentSession)
        .filter(
            ExperimentSession.id == session_id,
            ExperimentSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return SessionOut.model_validate(session)



@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes an individual experiment session for the current student."""
    session = (
        db.query(ExperimentSession)
        .filter(
            ExperimentSession.id == session_id,
            ExperimentSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Set any referencing lab session enrollments' experiment_session_id to None
    db.query(LabSessionEnrollment).filter(
        LabSessionEnrollment.experiment_session_id == session_id
    ).update({LabSessionEnrollment.experiment_session_id: None}, synchronize_session=False)

    db.delete(session)
    db.commit()
    return {"message": "Session deleted successfully", "session_id": session_id}


