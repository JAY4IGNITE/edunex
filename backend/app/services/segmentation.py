from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.app.models.canonical import Student
from backend.app.services.student_360 import Student360Service
from backend.app.services.academic_risk import AcademicRiskService
from backend.app.services.placement_risk import PlacementRiskService
from backend.app.core.segmentation_config import SegmentationConfig
from backend.app.schemas.segment import SegmentMembershipResponse, SegmentSummary, SegmentDetailResponse, SegmentListResponse, SegmentCharacteristics

class SegmentationService:
    def __init__(self, db: Session):
        self.db = db
        self.student_360_service = Student360Service(db)
        self.academic_risk_service = AcademicRiskService(db)
        self.placement_risk_service = PlacementRiskService(db)

    def classify_student(self, student_id: str) -> SegmentMembershipResponse:
        """Dynamically classifies a single student."""
        try:
            student_360 = self.student_360_service.get_student_360(student_id)
        except HTTPException:
            return SegmentMembershipResponse(student_id=student_id, primary_segment=None, secondary_segments=[])

        # Get Academic Classification
        try:
            acad_response = self.academic_risk_service.get_or_calculate_academic_risk(student_id)
            acad_class = acad_response.risk_level
        except HTTPException:
            acad_class = "UNAVAILABLE"

        # Get Placement Classification
        try:
            place_response = self.placement_risk_service.get_or_calculate_placement_risk(student_id)
            place_class = place_response.risk_level
        except HTTPException:
            place_class = "UNAVAILABLE"

        # Get Engagement Classification
        eng_class = SegmentationConfig.classify_engagement(student_360)

        # Evaluate Segment Criteria
        matched_segments = []

        if acad_class == "LOW" and place_class == "LOW":
            matched_segments.append("HIGH_ACADEMIC_HIGH_PLACEMENT")
            
        if acad_class == "LOW" and place_class == "HIGH":
            matched_segments.append("HIGH_ACADEMIC_LOW_PLACEMENT")
            
        if acad_class == "HIGH" and place_class == "LOW":
            matched_segments.append("LOW_ACADEMIC_HIGH_PLACEMENT")
            
        if acad_class == "HIGH" and place_class == "HIGH":
            matched_segments.append("LOW_ACADEMIC_LOW_PLACEMENT")
            
        if eng_class == "HIGH" and acad_class == "HIGH":
            matched_segments.append("HIGH_ENGAGEMENT_LOW_ACADEMIC")
            
        if eng_class == "LOW" and acad_class == "HIGH":
            matched_segments.append("LOW_ENGAGEMENT_LOW_ACADEMIC")

        if not matched_segments:
            return SegmentMembershipResponse(student_id=student_id, primary_segment=None, secondary_segments=[])

        # Priority resolution
        # Sort matched segments by priority ascending (1 = highest priority)
        matched_segments.sort(key=lambda s: SegmentationConfig.SEGMENTS[s]["priority"])

        primary = matched_segments[0]
        secondaries = matched_segments[1:]

        return SegmentMembershipResponse(
            student_id=student_id,
            primary_segment=primary,
            secondary_segments=secondaries
        )

    def _get_all_student_ids(self, department: str = None, year: int = None, semester: int = None):
        query = self.db.query(Student.student_id)
        if department:
            query = query.filter(Student.department == department)
        if year:
            query = query.filter(Student.year == year)
        if semester:
            query = query.filter(Student.semester == semester)
        return [s.student_id for s in query.all()]

    def get_segments_summary(self, department: str = None, year: int = None, semester: int = None) -> SegmentListResponse:
        """Dynamically builds segments for all students."""
        student_ids = self._get_all_student_ids(department, year, semester)
        total_students = len(student_ids)

        segment_counts = {seg_id: 0 for seg_id in SegmentationConfig.SEGMENTS}

        # Calculate dynamics (this takes ~1-2 seconds for 1000 students)
        for sid in student_ids:
            mem = self.classify_student(sid)
            if mem.primary_segment:
                segment_counts[mem.primary_segment] += 1

        summaries = []
        for seg_id, config in SegmentationConfig.SEGMENTS.items():
            count = segment_counts[seg_id]
            pct = (count / total_students * 100.0) if total_students > 0 else 0.0
            summaries.append(SegmentSummary(
                segment_id=seg_id,
                name=config["name"],
                description=config["description"],
                student_count=count,
                percentage_of_population=round(pct, 2)
            ))

        return SegmentListResponse(
            total_students=total_students,
            segments=summaries
        )

    def get_segment_detail(self, segment_id: str, department: str = None, year: int = None, semester: int = None) -> SegmentDetailResponse:
        if segment_id not in SegmentationConfig.SEGMENTS:
            raise HTTPException(status_code=404, detail="Segment not found")

        student_ids = self._get_all_student_ids(department, year, semester)
        total_students = len(student_ids)
        
        segment_members = []
        
        # Accumulators for characteristics
        acad_risks = []
        place_risks = []
        cgpas = []
        attendances = []
        aptitudes = []
        codings = []

        for sid in student_ids:
            mem = self.classify_student(sid)
            if mem.primary_segment == segment_id:
                segment_members.append(sid)
                
                # Fetch characteristics dynamically
                s360 = self.student_360_service.get_student_360(sid)
                
                try:
                    ar = self.academic_risk_service.get_or_calculate_academic_risk(sid)
                    acad_risks.append(ar.academic_risk_score)
                except Exception: pass
                
                try:
                    pr = self.placement_risk_service.get_or_calculate_placement_risk(sid)
                    place_risks.append(pr.placement_risk_score)
                except Exception: pass

                latest_acad = self.academic_risk_service._get_latest_record(s360.academic_history)
                if latest_acad: cgpas.append(latest_acad.cgpa)
                
                latest_att = self.academic_risk_service._get_latest_record(s360.attendance_history)
                if latest_att: attendances.append(latest_att.overall_attendance)
                
                latest_place = self.placement_risk_service._get_latest_record(s360.placement_information)
                if latest_place:
                    aptitudes.append(latest_place.aptitude_score)
                    codings.append(latest_place.coding_score)

        count = len(segment_members)
        pct = (count / total_students * 100.0) if total_students > 0 else 0.0

        char = SegmentCharacteristics(
            average_academic_risk=round(sum(acad_risks)/len(acad_risks), 2) if acad_risks else None,
            average_placement_risk=round(sum(place_risks)/len(place_risks), 2) if place_risks else None,
            average_cgpa=round(sum(cgpas)/len(cgpas), 2) if cgpas else None,
            average_attendance=round(sum(attendances)/len(attendances), 2) if attendances else None,
            average_aptitude_score=round(sum(aptitudes)/len(aptitudes), 2) if aptitudes else None,
            average_coding_score=round(sum(codings)/len(codings), 2) if codings else None,
        )

        config = SegmentationConfig.SEGMENTS[segment_id]
        
        return SegmentDetailResponse(
            segment_id=segment_id,
            name=config["name"],
            description=config["description"],
            student_count=count,
            percentage_of_population=round(pct, 2),
            characteristics=char,
            students=segment_members
        )
