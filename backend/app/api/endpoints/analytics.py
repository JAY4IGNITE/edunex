from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.scoring_config import ScoringConfig
from backend.app.services.cache import CacheService
from backend.app.services.insight import InsightService

router = APIRouter()

class AnalyticsDistribution(BaseModel):
    success_score_distribution: dict[str, int]
    academic_risk_distribution: dict[str, int]
    placement_risk_distribution: dict[str, int]
    segment_distribution: dict[str, int]

class AnalyticsOverview(BaseModel):
    total_students: int
    average_success_score: float | None
    average_attendance: float | None
    average_engagement_index: float | None
    success_score_distribution: dict[str, int]
    academic_risk_distribution: dict[str, int]
    placement_risk_distribution: dict[str, int]
    segment_distribution: dict[str, int]
    applied_filters: dict[str, Any]

class AnalyticsTrends(BaseModel):
    success_score_trends: dict[str, float]
    attendance_trends: dict[str, float]
    engagement_trends: dict[str, float]

def _calculate_distributions(metrics):
    ss_dist = {}
    for score in metrics["success_scores"]:
        band = ScoringConfig.get_band(score)
        ss_dist[band] = ss_dist.get(band, 0) + 1
        
    acad_dist = {}
    for r in metrics["academic_risks"]:
        acad_dist[r] = acad_dist.get(r, 0) + 1
        
    place_dist = {}
    for r in metrics["placement_risks"]:
        place_dist[r] = place_dist.get(r, 0) + 1
        
    return ss_dist, acad_dist, place_dist, metrics.get("segments", {})

@router.get("/overview", response_model=AnalyticsOverview, summary="Get Analytics Overview")
def get_analytics_overview(
    department: str | None = Query(None),
    year: int | None = Query(None),
    semester: int | None = Query(None),
    db: Session = Depends(get_db)
):
    cache_key = f"edunex:v1:analytics:overview:dept={department}:yr={year}:sem={semester}"
    cached = CacheService.get(cache_key)
    if cached:
        return AnalyticsOverview(**cached)

    service = InsightService(db)
    metrics = service._gather_metrics(department, year, semester)
    
    avg_score = None
    if metrics["success_scores"]:
        avg_score = round(sum(metrics["success_scores"]) / len(metrics["success_scores"]), 1)
        
    avg_att = None
    all_att = [att for sems in metrics["semester_attendance"].values() for att in sems]
    if all_att:
        avg_att = round(sum(all_att) / len(all_att), 1)
        
    avg_eng = None
    if metrics["engagement_indices"]:
        avg_eng = round(sum(metrics["engagement_indices"]) / len(metrics["engagement_indices"]), 1)

    ss_dist, acad_dist, place_dist, seg_dist = _calculate_distributions(metrics)

    result = AnalyticsOverview(
        total_students=metrics["population_size"],
        average_success_score=avg_score,
        average_attendance=avg_att,
        average_engagement_index=avg_eng,
        success_score_distribution=ss_dist,
        academic_risk_distribution=acad_dist,
        placement_risk_distribution=place_dist,
        segment_distribution=seg_dist,
        applied_filters=metrics["applied_filters"]
    )
    CacheService.set(cache_key, result, ttl=300, tags=["analytics"])
    return result

@router.get("/trends", response_model=AnalyticsTrends, summary="Get Analytics Trends")
def get_analytics_trends(
    department: str | None = Query(None),
    year: int | None = Query(None),
    semester: int | None = Query(None),
    db: Session = Depends(get_db)
):
    cache_key = f"edunex:v1:analytics:trends:dept={department}:yr={year}:sem={semester}"
    cached = CacheService.get(cache_key)
    if cached:
        return AnalyticsTrends(**cached)

    service = InsightService(db)
    metrics = service._gather_metrics(department, year, semester)
    
    ss_trends = {}
    for sem, scores in metrics["semester_success"].items():
        if len(scores) >= 10:
            ss_trends[sem] = round(sum(scores) / len(scores), 1)
            
    att_trends = {}
    for sem, atts in metrics["semester_attendance"].items():
        if len(atts) >= 10:
            att_trends[sem] = round(sum(atts) / len(atts), 1)
            
    eng_trends = {}
    for sem, engs in metrics["semester_engagement"].items():
        if len(engs) >= 10:
            eng_trends[sem] = round(sum(engs) / len(engs), 1)

    result = AnalyticsTrends(
        success_score_trends=ss_trends,
        attendance_trends=att_trends,
        engagement_trends=eng_trends
    )
    CacheService.set(cache_key, result, ttl=300, tags=["analytics"])
    return result

@router.get("/distribution", response_model=AnalyticsDistribution, summary="Get Analytics Distribution")
def get_analytics_distribution(
    department: str | None = Query(None),
    year: int | None = Query(None),
    semester: int | None = Query(None),
    db: Session = Depends(get_db)
):
    cache_key = f"edunex:v1:analytics:distribution:dept={department}:yr={year}:sem={semester}"
    cached = CacheService.get(cache_key)
    if cached:
        return AnalyticsDistribution(**cached)

    service = InsightService(db)
    metrics = service._gather_metrics(department, year, semester)
    
    ss_dist, acad_dist, place_dist, seg_dist = _calculate_distributions(metrics)

    result = AnalyticsDistribution(
        success_score_distribution=ss_dist,
        academic_risk_distribution=acad_dist,
        placement_risk_distribution=place_dist,
        segment_distribution=seg_dist
    )
    CacheService.set(cache_key, result, ttl=300, tags=["analytics"])
    return result
