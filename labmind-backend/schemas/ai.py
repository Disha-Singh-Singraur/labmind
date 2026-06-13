from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class ParsePDFRequest(BaseModel):
    pdf_text: str


class VerifyImageRequest(BaseModel):
    image_base64: str
    step_description: str
    experiment_name: str


class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    experiment_context: str
    current_step: str
    session_id: int
    student_name: str = "Student"


class AnswerItem(BaseModel):
    question_id: str
    question: str
    answer: Any
    unit: Optional[str] = None


class AnalyzeResultsRequest(BaseModel):
    observations: Optional[str] = None
    answers: Optional[List[AnswerItem]] = None
    experiment: Dict[str, Any]
    session_id: int
    steps_completed: int


class VerifyImageResponse(BaseModel):
    feedback: str
    confidence_score: float
    issues: List[str]
    is_correct: bool
    suggestions: List[str]


class AnalyzeResultsResponse(BaseModel):
    analysis: str
    learning_summary: str
    possible_errors: List[str]
    accuracy_assessment: str
    recommendations: List[str]
    deviation: float
    expected: str
    observed: str


class ChatResponse(BaseModel):
    reply: str
