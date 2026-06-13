from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth_middleware import get_current_user
from models.user import User
from models.override import OverrideRequest
from pydantic import BaseModel

router = APIRouter(prefix="/override", tags=["override"])


class OverrideRequestCreate(BaseModel):
    session_id: int
    step_number: int
    experiment_name: str
    image_base64: Optional[str] = None


@router.post("/request")
async def create_override_request(
    data: OverrideRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Student creates override request
    from models.session import ExperimentSession
    from models.experiment import ExperimentStep

    session = db.query(ExperimentSession).filter(ExperimentSession.id == data.session_id).first()
    step_title = None
    step_description = None
    if session:
        step = (
            db.query(ExperimentStep)
            .filter(
                ExperimentStep.experiment_id == session.experiment_id,
                ExperimentStep.step_number == data.step_number
            )
            .first()
        )
        if step:
            step_title = step.title
            step_description = step.description

    image_path = None
    if data.image_base64:
        import base64
        import uuid
        import os
        try:
            b64_data = data.image_base64
            if "," in b64_data:
                b64_data = b64_data.split(",")[1]
            img_data = base64.b64decode(b64_data)
            
            os.makedirs("uploads", exist_ok=True)
            filename = f"override_{uuid.uuid4()}.jpg"
            filepath = os.path.join("uploads", filename)
            
            with open(filepath, "wb") as f:
                f.write(img_data)
            image_path = f"/uploads/{filename}"
        except Exception as e:
            print(f"Error saving override photo: {e}")

    new_request = OverrideRequest(
        session_id=data.session_id,
        step_number=data.step_number,
        student_id=current_user.id,
        student_name=current_user.full_name,
        experiment_name=data.experiment_name,
        step_title=step_title,
        step_description=step_description,
        image_path=image_path,
        status="pending",
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return {"request_id": new_request.id, "status": new_request.status}


@router.get("/pending")
async def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(
            status_code=403, detail="Only instructors can view pending override requests"
        )

    requests = (
        db.query(OverrideRequest)
        .filter(OverrideRequest.status == "pending")
        .order_by(OverrideRequest.requested_at.desc())
        .all()
    )
    return requests


@router.get("/resolved")
async def get_resolved_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(
            status_code=403, detail="Only instructors can view resolved override requests"
        )

    requests = (
        db.query(OverrideRequest)
        .filter(OverrideRequest.status.in_(["approved", "rejected"]))
        .order_by(OverrideRequest.resolved_at.desc())
        .all()
    )
    return requests


@router.put("/{request_id}/approve")
async def approve_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(
            status_code=403, detail="Only instructors can resolve override requests"
        )

    req = db.query(OverrideRequest).filter(OverrideRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Override request not found")

    req.status = "approved"
    req.resolved_at = datetime.now(timezone.utc)
    req.resolved_by = current_user.id
    db.commit()
    db.refresh(req)
    return req


@router.put("/{request_id}/reject")
async def reject_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "instructor":
        raise HTTPException(
            status_code=403, detail="Only instructors can resolve override requests"
        )

    req = db.query(OverrideRequest).filter(OverrideRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Override request not found")

    req.status = "rejected"
    req.resolved_at = datetime.now(timezone.utc)
    req.resolved_by = current_user.id
    db.commit()
    db.refresh(req)
    return req


@router.get("/check/{session_id}/{step_number}")
async def check_override_status(
    session_id: int,
    step_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = (
        db.query(OverrideRequest)
        .filter(
            OverrideRequest.session_id == session_id,
            OverrideRequest.step_number == step_number,
        )
        .order_by(OverrideRequest.requested_at.desc())
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="No override request found for this step")

    return {"status": req.status}
