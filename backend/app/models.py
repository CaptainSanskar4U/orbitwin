from sqlmodel import Field, SQLModel
from datetime import datetime


class Incident(SQLModel, table=True):
    id: str | None = Field(default=None, primary_key=True)  # INC-2026-0001
    mission_id: str = "ORBITER-01"
    fault_type: str = ""
    severity: str = ""
    status: str = "SIMULATING"  # SIMULATING|FAULT|RECOVERING|STABLE
    root_cause: str = ""
    affected_json: str = "[]"
    before_json: str = "{}"
    after_json: str = "{}"
    recovered_json: str = "{}"
    ai_summary_json: str = ""
    start_time: datetime = Field(default_factory=datetime.utcnow)


class Event(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    incident_id: str = ""
    ts: datetime = Field(default_factory=datetime.utcnow)
    type: str = ""
    severity: str = "INFO"
    message: str = ""


class Telemetry(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    incident_id: str = ""
    tick: int = 0
    phase: str = ""
    data_json: str = "{}"
    ts: datetime = Field(default_factory=datetime.utcnow)
