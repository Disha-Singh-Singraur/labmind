from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class ExperimentSession(Base):
    __tablename__ = "experiment_sessions"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    current_step_number = Column(Integer, default=1)
    status = Column(String, default="active")  # active | paused | completed
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    experiment = relationship("Experiment", back_populates="sessions")
    user = relationship("User", back_populates="sessions")
    progress = relationship("SessionProgress", back_populates="session", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="session", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class SessionProgress(Base):
    __tablename__ = "session_progress"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("experiment_sessions.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("experiment_steps.id"), nullable=False)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=True)
    notes = Column(Text, nullable=True)

    session = relationship("ExperimentSession", back_populates="progress")
    step = relationship("ExperimentStep", back_populates="progress_records")
