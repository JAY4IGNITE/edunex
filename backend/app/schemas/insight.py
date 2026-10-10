from datetime import datetime
from typing import Any

from pydantic import BaseModel


class InsightMetric(BaseModel):
    name: str
    value: Any
    unit: str | None = None

class TrendPoint(BaseModel):
    period: str
    metric: str
    value: float

class Insight(BaseModel):
    insight_id: str
    category: str
    priority: str
    title: str
    description: str
    metric_value: float | None = None
    comparison_value: float | None = None
    unit: str | None = None
    supporting_metrics: list[InsightMetric] = []
    trend_data: list[TrendPoint] = []
    insufficient_sample: bool = False

class InsightResponse(BaseModel):
    generated_at: datetime
    applied_filters: dict[str, Any]
    population_size: int
    insights: list[Insight]
