from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Status = Literal["Recommended", "Assigned", "In Progress", "Completed", "Dismissed"]


class InterventionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    student_id: str = Field(min_length=1, max_length=80)
    recommendation_key: str = Field(min_length=1, max_length=80)


class InterventionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    version: int = Field(ge=1)
    status: Status | None = None
    assignee: str | None = Field(default=None, min_length=1, max_length=80)
    due_date: date | None = None
    notes: str | None = Field(default=None, max_length=4000)
    dismissal_reason: str | None = Field(default=None, min_length=1, max_length=2000)
