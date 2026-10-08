from backend.app.models.base import TimestampMixin, Base
from backend.app.models.canonical import (
    Student,
    AcademicRecord,
    AttendanceRecord,
    LMSRecord,
    EngagementRecord,
    PlacementRecord,
    SkillRecord,
    FeedbackRecord
)
from backend.app.models.scoring import StudentSuccessScore
from backend.app.models.academic_risk import AcademicRiskScore
from backend.app.models.placement_risk import PlacementRiskScore
from backend.app.models.segment import StudentSegmentMembership

