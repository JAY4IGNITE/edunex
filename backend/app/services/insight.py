from typing import List, Optional, Dict
from datetime import datetime, UTC
from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.app.core.insight_config import InsightConfig
from backend.app.schemas.insight import Insight, InsightMetric, InsightResponse, TrendPoint
from backend.app.services.student_360 import Student360Service
from backend.app.services.scoring import ScoringService
from backend.app.services.academic_risk import AcademicRiskService
from backend.app.services.placement_risk import PlacementRiskService
from backend.app.services.segmentation import SegmentationService
from backend.app.models.canonical import Student
from backend.app.schemas.student_360 import Student360Response

class InsightService:
    def __init__(self, db: Session):
        self.db = db
        self.student_360_service = Student360Service(db)
        self.scoring_service = ScoringService(db)
        self.academic_risk_service = AcademicRiskService(db)
        self.placement_risk_service = PlacementRiskService(db)
        self.segmentation_service = SegmentationService(db)

    def _gather_metrics(self, department: Optional[str] = None, year: Optional[int] = None, semester: Optional[int] = None):
        query = self.db.query(Student.student_id)
        
        applied_filters = {}
        if department:
            query = query.filter(Student.department == department)
            applied_filters["department"] = department
        if year:
            query = query.filter(Student.year == year)
            applied_filters["year"] = year
        if semester:
            query = query.filter(Student.semester == semester)
            applied_filters["semester"] = semester
            
        student_ids = [row[0] for row in query.all()]
        population_size = len(student_ids)

        metrics = {
            "applied_filters": applied_filters,
            "population_size": population_size,
            "academic_risks": [],
            "placement_risks": [],
            "success_scores": [],
            "segments": {},
            "engagement_indices": [],
            "high_eng_low_acad": 0,
            "low_eng_low_acad": 0,
            "semester_attendance": {},
            "semester_engagement": {},
            "semester_success": {}
        }

        if population_size < InsightConfig.MIN_COHORT_SIZE:
            return metrics

        # Bulk fetch to avoid N+1
        students_360 = self.student_360_service.get_students_360_bulk(student_ids)
        s360_map = {s.student.student_id: s for s in students_360}

        # Bulk fetch pre-calculated metrics to completely eliminate N+1 queries over remote database
        from backend.app.models.academic_risk import AcademicRiskScore
        from backend.app.models.placement_risk import PlacementRiskScore
        from backend.app.models.scoring import StudentSuccessScore
        from backend.app.models.segment import StudentSegmentMembership
        
        # We chunk the IDs to avoid extremely large IN clauses, but 5000 is usually fine for Postgres.
        ac_risks = {row[0]: row[1] for row in self.db.query(AcademicRiskScore.student_id, AcademicRiskScore.risk_level).filter(AcademicRiskScore.student_id.in_(student_ids)).all()}
        pl_risks = {row[0]: row[1] for row in self.db.query(PlacementRiskScore.student_id, PlacementRiskScore.risk_level).filter(PlacementRiskScore.student_id.in_(student_ids)).all()}
        scores = {row[0]: row[1] for row in self.db.query(StudentSuccessScore.student_id, StudentSuccessScore.score).filter(StudentSuccessScore.student_id.in_(student_ids)).all()}
        segments = {row[0]: row[1] for row in self.db.query(StudentSegmentMembership.student_id, StudentSegmentMembership.segment_id).filter(StudentSegmentMembership.student_id.in_(student_ids), StudentSegmentMembership.membership_type == "PRIMARY").all()}

        for sid in student_ids:
            s360 = s360_map.get(sid)
            if not s360:
                continue

            ar_level = ac_risks.get(sid)
            if ar_level:
                metrics["academic_risks"].append(ar_level)
            
            pr_level = pl_risks.get(sid)
            if pr_level:
                metrics["placement_risks"].append(pr_level)
            
            ss = scores.get(sid)
            if ss is not None:
                metrics["success_scores"].append(ss)
            
            seg_level = segments.get(sid)
            if seg_level:
                metrics["segments"][seg_level] = metrics["segments"].get(seg_level, 0) + 1
                if seg_level == "HIGH_ENGAGEMENT_LOW_ACADEMIC":
                    metrics["high_eng_low_acad"] += 1
                elif seg_level == "LOW_ENGAGEMENT_LOW_ACADEMIC":
                    metrics["low_eng_low_acad"] += 1

            if s360.engagement_history:
                latest = max(s360.engagement_history, key=lambda x: x.semester)
                index = latest.events_count + latest.clubs_count + latest.hackathons_count + latest.certifications_count
                metrics["engagement_indices"].append(index)
                
            for att in s360.attendance_history:
                sem = f"Sem-{att.semester}"
                metrics["semester_attendance"].setdefault(sem, []).append(att.overall_attendance)
                
            for eng in s360.engagement_history:
                sem = f"Sem-{eng.semester}"
                idx = eng.events_count + eng.clubs_count + eng.hackathons_count + eng.certifications_count
                metrics["semester_engagement"].setdefault(sem, []).append(idx)
                
            all_sems = set(r.semester for r in s360.academic_history)
            for sem_num in all_sems:
                sem = f"Sem-{sem_num}"
                class IsolatedS360:
                    pass
                isolated_s360 = IsolatedS360()
                isolated_s360.academic_history = [r for r in s360.academic_history if r.semester == sem_num]
                isolated_s360.attendance_history = [r for r in s360.attendance_history if r.semester == sem_num]
                isolated_s360.lms_history = [r for r in s360.lms_history if r.semester == sem_num]
                isolated_s360.engagement_history = [r for r in s360.engagement_history if r.semester == sem_num]
                isolated_s360.placement_information = s360.placement_information
                isolated_s360.skills_information = s360.skills_information
                isolated_s360.feedback_history = [r for r in s360.feedback_history if r.semester == sem_num]
                domain_scores = self.scoring_service.calculate_domain_scores(isolated_s360)
                available_domains = list(domain_scores.keys())
                if available_domains:
                    from backend.app.core.scoring_config import ScoringConfig
                    total_weight = sum(ScoringConfig.DEFAULT_WEIGHTS[d] for d in available_domains)
                    if total_weight > 0:
                        score = sum(domain_scores[d] * (ScoringConfig.DEFAULT_WEIGHTS[d] / total_weight) for d in available_domains)
                        metrics["semester_success"].setdefault(sem, []).append(score)

        return metrics

    def generate_insights(self, department: Optional[str] = None, year: Optional[int] = None, semester: Optional[int] = None) -> InsightResponse:
        metrics = self._gather_metrics(department, year, semester)
        population_size = metrics["population_size"]
        applied_filters = metrics["applied_filters"]
        insights = []

        if population_size < InsightConfig.MIN_COHORT_SIZE:
            insights.append(Insight(
                insight_id="INSUFFICIENT_DATA",
                category="ALL",
                priority=InsightConfig.PRIORITY_INFO,
                title="Insufficient Data",
                description=f"The current cohort size ({population_size}) is below the minimum threshold ({InsightConfig.MIN_COHORT_SIZE}) required to generate statistically meaningful comparative insights.",
                insufficient_sample=True
            ))
            return InsightResponse(
                generated_at=datetime.now(UTC),
                applied_filters=applied_filters,
                population_size=population_size,
                insights=insights
            )

        academic_risks = metrics["academic_risks"]
        placement_risks = metrics["placement_risks"]
        success_scores = metrics["success_scores"]
        engagement_indices = metrics["engagement_indices"]
        high_eng_low_acad = metrics["high_eng_low_acad"]
        low_eng_low_acad = metrics["low_eng_low_acad"]
        semester_attendance = metrics["semester_attendance"]
        semester_success = metrics["semester_success"]

        # 1. Academic Risk Insight
        if academic_risks:
            high_acad = academic_risks.count("HIGH")
            pct_high_acad = (high_acad / len(academic_risks)) * 100.0
            priority = InsightConfig.PRIORITY_HIGH if pct_high_acad > InsightConfig.HIGH_RISK_PERCENTAGE_THRESHOLD else InsightConfig.PRIORITY_MEDIUM
            
            insights.append(Insight(
                insight_id="ACAD_RISK_01",
                category=InsightConfig.CATEGORIES["ACADEMIC_RISK"],
                priority=priority,
                title="Academic Risk Distribution",
                description=f"{round(pct_high_acad, 1)}% of students in this cohort currently have HIGH academic risk.",
                metric_value=round(pct_high_acad, 1),
                unit="%",
                supporting_metrics=[
                    InsightMetric(name="High Risk Count", value=high_acad),
                    InsightMetric(name="Total Assessed", value=len(academic_risks))
                ]
            ))

        # 2. Placement Risk Insight
        if placement_risks:
            high_place = placement_risks.count("HIGH")
            pct_high_place = (high_place / len(placement_risks)) * 100.0
            priority = InsightConfig.PRIORITY_HIGH if pct_high_place > InsightConfig.HIGH_RISK_PERCENTAGE_THRESHOLD else InsightConfig.PRIORITY_MEDIUM
            
            insights.append(Insight(
                insight_id="PLACE_RISK_01",
                category=InsightConfig.CATEGORIES["PLACEMENT_RISK"],
                priority=priority,
                title="Placement Risk Distribution",
                description=f"{round(pct_high_place, 1)}% of students in this cohort currently have HIGH placement risk.",
                metric_value=round(pct_high_place, 1),
                unit="%",
                supporting_metrics=[
                    InsightMetric(name="High Risk Count", value=high_place),
                    InsightMetric(name="Total Assessed", value=len(placement_risks))
                ]
            ))

        # 3. Comparative Student Success Insight
        avg_score = 0.0
        if success_scores:
            avg_score = sum(success_scores) / len(success_scores)
            
            # If filtered, compare to institution
            comparison_val = None
            desc = f"The average success score for this cohort is {round(avg_score, 1)}."
            if applied_filters:
                # Get institution average
                all_sids = [r[0] for r in self.db.query(Student.student_id).all()]
                all_scores = []
                for s in all_sids:
                    try:
                        all_scores.append(self.scoring_service.get_or_calculate_success_score(s).success_score)
                    except HTTPException: pass
                if all_scores:
                    inst_avg = sum(all_scores) / len(all_scores)
                    comparison_val = round(inst_avg, 1)
                    diff = round(avg_score - inst_avg, 1)
                    direction = "higher" if diff >= 0 else "lower"
                    desc += f" This is {abs(diff)} points {direction} than the institution baseline of {comparison_val}."
            
            insights.append(Insight(
                insight_id="SUCCESS_COMP_01",
                category=InsightConfig.CATEGORIES["COMPARATIVE"],
                priority=InsightConfig.PRIORITY_INFO if not comparison_val else InsightConfig.PRIORITY_MEDIUM,
                title="Cohort Success Score vs Institution",
                description=desc,
                metric_value=round(avg_score, 1),
                comparison_value=comparison_val,
                unit="points",
                supporting_metrics=[
                    InsightMetric(name="Total Assessed", value=len(success_scores))
                ]
            ))

        # 4. Engagement Insight
        if engagement_indices:
            avg_eng = sum(engagement_indices) / len(engagement_indices)
            desc = f"The average engagement index in this cohort is {round(avg_eng, 1)}."
            if high_eng_low_acad > 0:
                desc += f" There are {high_eng_low_acad} highly engaged students currently facing elevated academic risk."
                
            insights.append(Insight(
                insight_id="ENG_01",
                category=InsightConfig.CATEGORIES["ENGAGEMENT"],
                priority=InsightConfig.PRIORITY_INFO,
                title="Cohort Engagement Overview",
                description=desc,
                metric_value=round(avg_eng, 1),
                unit="index points",
                supporting_metrics=[
                    InsightMetric(name="High Engagement / Low Academic Count", value=high_eng_low_acad),
                    InsightMetric(name="Low Engagement / Low Academic Count", value=low_eng_low_acad)
                ]
            ))

        # 5. Trends Insight
        trend_points = []
        for sem in sorted(semester_success.keys()):
            if len(semester_success[sem]) >= InsightConfig.MIN_COHORT_SIZE:
                trend_points.append(TrendPoint(
                    period=sem,
                    metric="average_success_score",
                    value=round(sum(semester_success[sem]) / len(semester_success[sem]), 1)
                ))
        for sem in sorted(semester_attendance.keys()):
            if len(semester_attendance[sem]) >= InsightConfig.MIN_COHORT_SIZE:
                trend_points.append(TrendPoint(
                    period=sem,
                    metric="average_attendance",
                    value=round(sum(semester_attendance[sem]) / len(semester_attendance[sem]), 1)
                ))
                
        # Require at least 2 periods for a valid trend insight
        distinct_periods = len(set(p.period for p in trend_points))
        if distinct_periods >= 2:
            insights.append(Insight(
                insight_id="TREND_01",
                category=InsightConfig.CATEGORIES["TRENDS"],
                priority=InsightConfig.PRIORITY_INFO,
                title="Longitudinal Performance Trends",
                description="Historical summaries of cohort metrics across available semesters.",
                trend_data=trend_points
            ))

        return InsightResponse(
            generated_at=datetime.now(UTC),
            applied_filters=applied_filters,
            population_size=population_size,
            insights=insights
        )
