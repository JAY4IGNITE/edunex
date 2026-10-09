from typing import Optional
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

        # Fetching pre-calculated metrics directly via query


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

        from backend.app.models.canonical import AttendanceRecord, EngagementRecord, AcademicRecord, LMSRecord, PlacementRecord, SkillRecord, FeedbackRecord
        
        # 1. Fetch scalar aggregations efficiently
        att_records = self.db.query(AttendanceRecord.student_id, AttendanceRecord.semester, AttendanceRecord.overall_attendance).filter(AttendanceRecord.student_id.in_(student_ids)).all()
        eng_records = self.db.query(
            EngagementRecord.student_id, 
            EngagementRecord.semester, 
            EngagementRecord.events_count, 
            EngagementRecord.clubs_count, 
            EngagementRecord.hackathons_count, 
            EngagementRecord.certifications_count
        ).filter(EngagementRecord.student_id.in_(student_ids)).all()
        
        from collections import defaultdict
        student_eng_by_sem = defaultdict(dict)
        for row in eng_records:
            student_eng_by_sem[row.student_id][row.semester] = row.events_count + row.clubs_count + row.hackathons_count + row.certifications_count
        
        for sid in student_ids:
            # Process engagement indices (latest semester for each student)
            sems = student_eng_by_sem.get(sid)
            if sems:
                latest_sem = max(sems.keys())
                metrics["engagement_indices"].append(sems[latest_sem])

            # Restore missing metric processing
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

        for row in att_records:
            metrics["semester_attendance"].setdefault(f"Sem-{row.semester}", []).append(row.overall_attendance)
            
        for row in eng_records:
            idx = row.events_count + row.clubs_count + row.hackathons_count + row.certifications_count
            metrics["semester_engagement"].setdefault(f"Sem-{row.semester}", []).append(idx)
        
        # To avoid massive memory leak, semester_success is approximated or optimized by fetching just what we need.
        # But for trends, the endpoint needs it. We will fetch dicts instead of full models.
        acad_records = self.db.query(AcademicRecord.student_id, AcademicRecord.semester, AcademicRecord.cgpa).filter(AcademicRecord.student_id.in_(student_ids)).all()
        lms_records = self.db.query(LMSRecord.student_id, LMSRecord.semester, LMSRecord.assignment_completion).filter(LMSRecord.student_id.in_(student_ids)).all()
        place_records = self.db.query(PlacementRecord.student_id, PlacementRecord.aptitude_score, PlacementRecord.coding_score, PlacementRecord.mock_interview_score).filter(PlacementRecord.student_id.in_(student_ids)).all()
        skill_records = self.db.query(SkillRecord.student_id, SkillRecord.technical_skill_score, SkillRecord.soft_skill_score).filter(SkillRecord.student_id.in_(student_ids)).all()
        fb_records = self.db.query(FeedbackRecord.student_id, FeedbackRecord.semester, FeedbackRecord.student_satisfaction).filter(FeedbackRecord.student_id.in_(student_ids)).all()
        
        place_map = {r.student_id: (r.aptitude_score + r.coding_score + r.mock_interview_score)/3.0 for r in place_records}
        skill_map = {r.student_id: (r.technical_skill_score + r.soft_skill_score)/2.0 for r in skill_records}
        
        # Group by student and semester
        stu_sem_data = defaultdict(lambda: defaultdict(dict))
        for r in acad_records:
            stu_sem_data[r.student_id][r.semester]["acad"] = r.cgpa * 10.0
        for r in att_records:
            stu_sem_data[r.student_id][r.semester]["att"] = r.overall_attendance
        for r in lms_records:
            stu_sem_data[r.student_id][r.semester]["lms"] = r.assignment_completion
        for sid, sems in student_eng_by_sem.items():
            for sem, eng_idx in sems.items():
                stu_sem_data[sid][sem]["eng"] = min(eng_idx * 10.0, 100.0)
        for r in fb_records:
            stu_sem_data[r.student_id][r.semester]["fb"] = r.student_satisfaction * 20.0
            
        from backend.app.core.scoring_config import ScoringConfig
        for sid in student_ids:
            sems = stu_sem_data.get(sid, {})
            p_score = place_map.get(sid)
            s_score = skill_map.get(sid)
            for sem_num, data in sems.items():
                domain_scores = {}
                if "acad" in data: domain_scores["academic"] = data["acad"]
                if "att" in data: domain_scores["attendance"] = data["att"]
                if "lms" in data: domain_scores["lms"] = data["lms"]
                if "eng" in data: domain_scores["engagement"] = data["eng"]
                if p_score is not None: domain_scores["placement"] = p_score
                if s_score is not None: domain_scores["skills"] = s_score
                if "fb" in data: domain_scores["feedback"] = data["fb"]
                
                avail = list(domain_scores.keys())
                if avail:
                    tw = sum(ScoringConfig.DEFAULT_WEIGHTS[d] for d in avail)
                    if tw > 0:
                        score = sum(domain_scores[d] * (ScoringConfig.DEFAULT_WEIGHTS[d] / tw) for d in avail)
                        metrics["semester_success"].setdefault(f"Sem-{sem_num}", []).append(score)

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
