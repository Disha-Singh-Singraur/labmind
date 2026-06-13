from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class StartSessionRequest(BaseModel):
    experiment_id: int
    force: bool = False


class UpdateStepRequest(BaseModel):
    step_number: int
    notes: Optional[str] = None


class SessionOut(BaseModel):
    id: int
    experiment_id: int
    user_id: int
    current_step_number: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SessionProgressOut(BaseModel):
    id: int
    session_id: int
    step_id: int
    completed_at: datetime
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class ActiveSessionOut(BaseModel):
    student_name: str
    student_id: int
    experiment_name: str
    current_step_number: int
    total_steps: int
    status: str
    started_at: datetime
    session_id: int
    experiment_id: int

    model_config = {"from_attributes": True}


class MySessionOut(BaseModel):
    id: int
    experiment_id: int
    experiment_name: str
    experiment_objective: str
    current_step_number: int
    total_steps: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

