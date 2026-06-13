import random
import string
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


def _generate_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=6))


class LabSession(Base):
    __tablename__ = "lab_sessions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(6), unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    status = Column(String, default="active", nullable=False)  # active | closed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    instructor = relationship("User", foreign_keys=[instructor_id], backref="lab_sessions_created")
    experiment = relationship("Experiment", foreign_keys=[experiment_id], backref="lab_sessions")
    enrollments = relationship("LabSessionEnrollment", back_populates="lab_session", cascade="all, delete-orphan")


class LabSessionEnrollment(Base):
    __tablename__ = "lab_session_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("lab_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # Filled when the student actually starts the experiment
    experiment_session_id = Column(Integer, ForeignKey("experiment_sessions.id"), nullable=True)

    # Relationships
    lab_session = relationship("LabSession", back_populates="enrollments")
    student = relationship("User", foreign_keys=[student_id], backref="lab_enrollments")
    experiment_session = relationship("ExperimentSession", foreign_keys=[experiment_session_id], backref="lab_enrollment")
