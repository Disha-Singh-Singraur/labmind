from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime, timezone
from database import Base


class OverrideRequest(Base):
    __tablename__ = "override_requests"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("experiment_sessions.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_name = Column(String, nullable=False)
    experiment_name = Column(String, nullable=False)
    step_title = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending | approved | rejected
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    image_path = Column(String, nullable=True)
    step_description = Column(String, nullable=True)
