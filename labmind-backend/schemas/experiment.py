from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class StepOut(BaseModel):
    id: int
    experiment_id: int
    step_number: int
    title: str
    description: str
    why: Optional[str] = None
    safety_warning: Optional[str] = None
    checkpoint_required: bool
    is_completed: bool

    model_config = {"from_attributes": True}


class ExperimentOut(BaseModel):
    id: int
    user_id: int
    name: str
    objective: str
    materials: List[str]
    safety_notes: List[str]
    created_at: datetime
    steps: List[StepOut] = []
    result_questions: Optional[list] = None
    active_session_id: Optional[int] = None
    current_step_number: Optional[int] = None

    model_config = {"from_attributes": True}


class ExperimentCreate(BaseModel):
    name: str
    objective: str
    materials: List[str]
    safety_notes: List[str]
    steps: List[dict]
    raw_pdf_text: Optional[str] = None
