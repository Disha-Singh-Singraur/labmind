from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    objective = Column(Text, nullable=False)
    materials = Column(JSON, default=list)
    safety_notes = Column(JSON, default=list)
    raw_pdf_text = Column(Text, nullable=True)
    result_questions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="experiments")
    steps = relationship(
        "ExperimentStep",
        back_populates="experiment",
        order_by="ExperimentStep.step_number",
        cascade="all, delete-orphan",
    )
    sessions = relationship("ExperimentSession", back_populates="experiment")

    @property
    def active_session_id(self):
        for s in self.sessions:
            if s.status == "active":
                return s.id
        return None

    @property
    def current_step_number(self):
        for s in self.sessions:
            if s.status == "active":
                return s.current_step_number
        return None



class ExperimentStep(Base):
    __tablename__ = "experiment_steps"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    why = Column(Text, nullable=True)
    safety_warning = Column(String, nullable=True)
    checkpoint_required = Column(Boolean, default=False)
    is_completed = Column(Boolean, default=False)

    experiment = relationship("Experiment", back_populates="steps")
    progress_records = relationship("SessionProgress", back_populates="step")
