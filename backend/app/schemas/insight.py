from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class InsightMetric(BaseModel):
    name: str
    value: Any
    unit: Optional[str] = None

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
    metric_value: Optional[float] = None
    comparison_value: Optional[float] = None
    unit: Optional[str] = None
    supporting_metrics: List[InsightMetric] = []
    trend_data: List[TrendPoint] = []
    insufficient_sample: bool = False

class InsightResponse(BaseModel):
    generated_at: datetime
    applied_filters: Dict[str, Any]
    population_size: int
    insights: List[Insight]
