from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth_middleware import get_current_user
from models.chat import ChatMessage
from models.user import User
from schemas.ai import (
    ParsePDFRequest,
    VerifyImageRequest,
    ChatRequest,
    AnalyzeResultsRequest,
    VerifyImageResponse,
    AnalyzeResultsResponse,
    ChatResponse,
)
from services.ai_service import (
    parse_pdf_to_experiment,
    verify_lab_image,
    chat_with_context,
    generate_result_analysis,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/parse-pdf")
async def parse_pdf(
    data: ParsePDFRequest,
    current_user: User = Depends(get_current_user),
):
    result = await parse_pdf_to_experiment(data.pdf_text)
    return result


@router.post("/verify-image", response_model=VerifyImageResponse)
async def verify_image(
    data: VerifyImageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await verify_lab_image(
        data.image_base64,
        data.step_description,
        data.experiment_name,
    )
    return VerifyImageResponse(**result)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reply = await chat_with_context(
        messages=data.messages,
        experiment_context=data.experiment_context,
        current_step=data.current_step,
        student_name=current_user.full_name,
    )

    # Persist the last user message + assistant reply
    if data.messages:
        last_user = data.messages[-1]
        if last_user.get("role") == "user":
            db.add(
                ChatMessage(
                    session_id=data.session_id,
                    role="user",
                    content=last_user["content"],
                    step_context=data.current_step,
                )
            )

    db.add(
        ChatMessage(
            session_id=data.session_id,
            role="assistant",
            content=reply,
            step_context=data.current_step,
        )
    )
    db.commit()

    return ChatResponse(reply=reply)


@router.post("/analyze-results", response_model=AnalyzeResultsResponse)
async def analyze_results(
    data: AnalyzeResultsRequest,
    current_user: User = Depends(get_current_user),
):
    if data.answers:
        formatted = ["Student observations:"]
        for item in data.answers:
            ans = item.answer
            if isinstance(ans, bool):
                ans_str = "YES" if ans else "NO"
            elif ans is None:
                ans_str = ""
            else:
                ans_str = str(ans)
            suffix = f" {item.unit}" if item.unit else ""
            formatted.append(f"- {item.question}: {ans_str}{suffix}")
        observations_text = "\n".join(formatted)
    else:
        observations_text = data.observations or ""

    result = await generate_result_analysis(
        observations=observations_text,
        experiment=data.experiment,
        steps_completed=data.steps_completed,
    )
    return AnalyzeResultsResponse(**result)
