from backend.app.models.academic_risk import AcademicRiskScore
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin
from backend.app.models.canonical import (
    AcademicRecord,
    AttendanceRecord,
    EngagementRecord,
    FeedbackRecord,
    LMSRecord,
    PlacementRecord,
    SkillRecord,
    Student,
)
from backend.app.models.demo_assignment import DemoAssignment
from backend.app.models.intervention import Intervention, InterventionAudit
from backend.app.models.placement_risk import PlacementRiskScore
from backend.app.models.scoring import StudentSuccessScore
from backend.app.models.segment import StudentSegmentMembership
