import random
import string
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth_middleware import get_current_user
from models.experiment import Experiment, ExperimentStep
from models.lab_session import LabSession, LabSessionEnrollment
from models.override import OverrideRequest
from models.session import ExperimentSession
from models.user import User

router = APIRouter(prefix="/lab-sessions", tags=["lab-sessions"])


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _generate_unique_code(db: Session) -> str:
    """Generate a unique 6-char uppercase alphanumeric code."""
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choices(chars, k=6))
        existing = db.query(LabSession).filter(LabSession.code == code).first()
        if not existing:
            return code


def _student_progress(enrollment: LabSessionEnrollment, db: Session):
    """Build per-student progress dict for a session detail response."""
    student = db.query(User).filter(User.id == enrollment.student_id).first()
    if not student:
        return None

    exp_sess: Optional[ExperimentSession] = None
    if enrollment.experiment_session_id:
        exp_sess = db.query(ExperimentSession).filter(
            ExperimentSession.id == enrollment.experiment_session_id
        ).first()

    if not exp_sess:
        return {
            "student_id": enrollment.student_id,
            "student_name": student.full_name,
            "enrollment_id": enrollment.id,
            "experiment_session_id": None,
            "current_step_number": 0,
            "total_steps": 0,
            "progress_percent": 0.0,
            "status": "not_started",
            "pending_override": None,
            "last_updated": enrollment.joined_at.isoformat() if enrollment.joined_at else None,
        }

    total_steps = len(exp_sess.experiment.steps) if exp_sess.experiment else 0
    progress_pct = (exp_sess.current_step_number / total_steps * 100.0) if total_steps > 0 else 0.0

    # Check for pending override
    pending_req = (
        db.query(OverrideRequest)
        .filter(
            OverrideRequest.session_id == exp_sess.id,
            OverrideRequest.status == "pending",
        )
        .first()
    )

    pending_override_dict = None
    if pending_req:
        pending_override_dict = {
            "request_id": pending_req.id,
            "step_number": pending_req.step_number,
            "step_description": pending_req.step_description,
            "image_path": pending_req.image_path,
            "requested_at": pending_req.requested_at.isoformat() if pending_req.requested_at else None,
        }

    if pending_req:
        status = "safety_alert"
    elif exp_sess.status == "completed":
        status = "completed"
    elif exp_sess.status == "active":
        status = "active"
    else:
        status = "inactive"

    return {
        "student_id": enrollment.student_id,
        "student_name": student.full_name,
        "enrollment_id": enrollment.id,
        "experiment_session_id": exp_sess.id,
        "current_step_number": exp_sess.current_step_number,
        "total_steps": total_steps,
        "progress_percent": round(progress_pct, 1),
        "status": status,
        "pending_override": pending_override_dict,
        "last_updated": exp_sess.started_at.isoformat() if exp_sess.started_at else None,
    }


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class CreateLabSessionBody(BaseModel):
    name: str
    experiment_id: int


class JoinLabSessionBody(BaseModel):
    code: str
    # Optionally passed so backend can link experiment_session right away
    experiment_session_id: Optional[int] = None


class LinkExperimentSessionBody(BaseModel):
    experiment_session_id: int


# ─────────────────────────────────────────────
# INSTRUCTOR ROUTES
# ─────────────────────────────────────────────

@router.post("/create")
async def create_lab_session(
    body: CreateLabSessionBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can create lab sessions")

    experiment = db.query(Experiment).filter(Experiment.id == body.experiment_id).first()
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    code = _generate_unique_code(db)

    session = LabSession(
        code=code,
        name=body.name,
        instructor_id=current_user.id,
        experiment_id=body.experiment_id,
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "code": session.code,
        "name": session.name,
        "experiment_id": session.experiment_id,
        "experiment_name": experiment.name,
        "status": session.status,
        "created_at": session.created_at.isoformat(),
    }


@router.get("/")
async def list_lab_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can list lab sessions")

    sessions = (
        db.query(LabSession)
        .filter(LabSession.instructor_id == current_user.id)
        .order_by(LabSession.created_at.desc())
        .all()
    )

    result = []
    for s in sessions:
        enrollments = s.enrollments
        student_count = len(enrollments)

        # Count alerts: students with pending override requests
        alert_count = 0
        for enr in enrollments:
            if enr.experiment_session_id:
                pending = (
                    db.query(OverrideRequest)
                    .filter(
                        OverrideRequest.session_id == enr.experiment_session_id,
                        OverrideRequest.status == "pending",
                    )
                    .first()
                )
                if pending:
                    alert_count += 1

        result.append({
            "session_id": s.id,
            "code": s.code,
            "name": s.name,
            "experiment_name": s.experiment.name if s.experiment else "Unknown",
            "experiment_id": s.experiment_id,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "closed_at": s.closed_at.isoformat() if s.closed_at else None,
            "student_count": student_count,
            "alert_count": alert_count,
        })

    return result


@router.get("/{session_id}")
async def get_lab_session_detail(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can view session details")

    lab_sess = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not lab_sess:
        raise HTTPException(status_code=404, detail="Lab session not found")
    if lab_sess.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    students = []
    for enr in lab_sess.enrollments:
        prog = _student_progress(enr, db)
        if prog:
            students.append(prog)

    alert_count = sum(1 for s in students if s["status"] == "safety_alert")
    student_count = len(students)

    return {
        "session_id": lab_sess.id,
        "code": lab_sess.code,
        "name": lab_sess.name,
        "experiment_name": lab_sess.experiment.name if lab_sess.experiment else "Unknown",
        "experiment_id": lab_sess.experiment_id,
        "status": lab_sess.status,
        "created_at": lab_sess.created_at.isoformat() if lab_sess.created_at else None,
        "closed_at": lab_sess.closed_at.isoformat() if lab_sess.closed_at else None,
        "student_count": student_count,
        "alert_count": alert_count,
        "students": students,
    }


@router.put("/{session_id}/close")
async def close_lab_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can close lab sessions")

    lab_sess = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not lab_sess:
        raise HTTPException(status_code=404, detail="Lab session not found")
    if lab_sess.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    lab_sess.status = "closed"
    lab_sess.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lab_sess)

    return {"message": "Session closed", "session_id": lab_sess.id, "status": "closed"}


@router.delete("/{session_id}")
async def delete_lab_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can delete lab sessions")

    lab_sess = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not lab_sess:
        raise HTTPException(status_code=404, detail="Lab session not found")
    if lab_sess.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    db.delete(lab_sess)
    db.commit()

    return {"message": "Session deleted", "session_id": session_id}


# ─────────────────────────────────────────────
# STUDENT ROUTES
# ─────────────────────────────────────────────

@router.post("/join")
async def join_lab_session(
    body: JoinLabSessionBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can join lab sessions")

    code = body.code.upper().strip()
    lab_sess = db.query(LabSession).filter(LabSession.code == code).first()
    if not lab_sess:
        raise HTTPException(status_code=404, detail="Invalid session code")
    if lab_sess.status == "closed":
        raise HTTPException(status_code=400, detail="This session is closed")

    # Check if already enrolled
    existing = (
        db.query(LabSessionEnrollment)
        .filter(
            LabSessionEnrollment.session_id == lab_sess.id,
            LabSessionEnrollment.student_id == current_user.id,
        )
        .first()
    )

    if existing:
        # Already enrolled — return the existing enrollment
        return {
            "enrollment_id": existing.id,
            "session_id": lab_sess.id,
            "code": lab_sess.code,
            "name": lab_sess.name,
            "experiment_id": lab_sess.experiment_id,
            "experiment_name": lab_sess.experiment.name if lab_sess.experiment else "Unknown",
            "experiment_session_id": existing.experiment_session_id,
            "already_enrolled": True,
        }

    enrollment = LabSessionEnrollment(
        session_id=lab_sess.id,
        student_id=current_user.id,
        joined_at=datetime.now(timezone.utc),
        experiment_session_id=body.experiment_session_id,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return {
        "enrollment_id": enrollment.id,
        "session_id": lab_sess.id,
        "code": lab_sess.code,
        "name": lab_sess.name,
        "experiment_id": lab_sess.experiment_id,
        "experiment_name": lab_sess.experiment.name if lab_sess.experiment else "Unknown",
        "experiment_session_id": None,
        "already_enrolled": False,
    }


@router.get("/my-active/info")
async def get_my_active_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the student's active lab session enrollment (if any)."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Students only")

    enrollments = (
        db.query(LabSessionEnrollment)
        .join(LabSession, LabSession.id == LabSessionEnrollment.session_id)
        .filter(
            LabSessionEnrollment.student_id == current_user.id,
            LabSession.status == "active",
        )
        .order_by(LabSessionEnrollment.joined_at.desc())
        .all()
    )

    if not enrollments:
        return {"active_session": None, "active_sessions": []}

    active_sessions_list = []
    for enrollment in enrollments:
        lab_sess = enrollment.lab_session
        exp_sess = None
        if enrollment.experiment_session_id:
            exp_sess = db.query(ExperimentSession).filter(
                ExperimentSession.id == enrollment.experiment_session_id
            ).first()

        total_steps = len(lab_sess.experiment.steps) if lab_sess.experiment else 0

        active_sessions_list.append({
            "enrollment_id": enrollment.id,
            "session_id": lab_sess.id,
            "code": lab_sess.code,
            "name": lab_sess.name,
            "experiment_id": lab_sess.experiment_id,
            "experiment_name": lab_sess.experiment.name if lab_sess.experiment else "Unknown",
            "experiment_session_id": enrollment.experiment_session_id,
            "exp_session_status": exp_sess.status if exp_sess else None,
            "current_step_number": exp_sess.current_step_number if exp_sess else 0,
            "total_steps": total_steps,
            "instructor_name": lab_sess.instructor.full_name if lab_sess.instructor else "Unknown",
            "student_count": len(lab_sess.enrollments),
        })

    return {
        "active_session": active_sessions_list[0] if active_sessions_list else None,
        "active_sessions": active_sessions_list
    }



@router.put("/enrollment/{enrollment_id}/link-session")
async def link_experiment_session(
    enrollment_id: int,
    body: LinkExperimentSessionBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Called when a student starts their experiment — links the experiment_session to their enrollment."""
    enrollment = (
        db.query(LabSessionEnrollment)
        .filter(
            LabSessionEnrollment.id == enrollment_id,
            LabSessionEnrollment.student_id == current_user.id,
        )
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    enrollment.experiment_session_id = body.experiment_session_id
    db.commit()
    return {"message": "Linked", "enrollment_id": enrollment_id, "experiment_session_id": body.experiment_session_id}
