from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("experiment_sessions.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("experiment_steps.id"), nullable=True)
    file_path = Column(String, nullable=False)
    ai_feedback = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    issues = Column(JSON, default=list)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("ExperimentSession", back_populates="photos")
