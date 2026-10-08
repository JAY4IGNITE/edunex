import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.models.canonical import (
    Student,
    AcademicRecord,
    AttendanceRecord,
    LMSRecord,
    EngagementRecord,
    FeedbackRecord
)

def build_temporal_dataset(db: Session) -> pd.DataFrame:
    """
    Constructs the temporal dataset for ML training/validation.
    Ensures absolute strictness: features from semester t are paired
    with the target from semester t+1.
    No future data is exposed in features.
    """
    
    # We load all required records into memory for fast Pandas operations,
    # given the known scale (1000 students, 4000 records per domain) is very small.
    # In a larger system, this would be a complex SQL join.
    
    academic_df = pd.read_sql(
        select(
            AcademicRecord.student_id,
            AcademicRecord.semester,
            AcademicRecord.cgpa,
            AcademicRecord.internal_marks,
            AcademicRecord.backlogs
        ),
        db.bind
    )
    
    attendance_df = pd.read_sql(
        select(
            AttendanceRecord.student_id,
            AttendanceRecord.semester,
            AttendanceRecord.overall_attendance
        ),
        db.bind
    )
    
    lms_df = pd.read_sql(
        select(
            LMSRecord.student_id,
            LMSRecord.semester,
            LMSRecord.login_frequency,
            LMSRecord.assignment_completion
        ),
        db.bind
    )
    
    engagement_df = pd.read_sql(
        select(
            EngagementRecord.student_id,
            EngagementRecord.semester,
            EngagementRecord.events_count,
            EngagementRecord.clubs_count,
            EngagementRecord.hackathons_count,
            EngagementRecord.certifications_count
        ),
        db.bind
    )
    
    feedback_df = pd.read_sql(
        select(
            FeedbackRecord.student_id,
            FeedbackRecord.semester,
            FeedbackRecord.student_satisfaction
        ),
        db.bind
    )
    
    if academic_df.empty:
        return pd.DataFrame()

    # Base features dataframe: all domains joined on student_id and semester (t)
    features_df = academic_df.merge(attendance_df, on=["student_id", "semester"], how="inner")
    features_df = features_df.merge(lms_df, on=["student_id", "semester"], how="inner")
    features_df = features_df.merge(engagement_df, on=["student_id", "semester"], how="inner")
    features_df = features_df.merge(feedback_df, on=["student_id", "semester"], how="inner")
    
    # We want to predict target for semester t+1.
    # So we create a target dataframe from academic_records where we shift the semester.
    target_df = academic_df[["student_id", "semester", "backlogs"]].copy()
    target_df.rename(columns={"backlogs": "target_backlogs"}, inplace=True)
    
    # To join semester t features with semester t+1 target, we subtract 1 from target's semester
    # so that target_df's "semester" represents the feature semester (t) it should match.
    target_df["semester"] = target_df["semester"] - 1
    
    # Merge features (t) with target (t+1 via adjusted index)
    temporal_df = features_df.merge(target_df, on=["student_id", "semester"], how="inner")
    
    # The target definition: 1 if backlogs > 0 in t+1, else 0
    temporal_df["target"] = (temporal_df["target_backlogs"] > 0).astype(int)
    
    # Drop the raw target_backlogs to prevent leakage, though it's already properly aligned
    temporal_df.drop(columns=["target_backlogs"], inplace=True)
    
    # Sort for predictability
    temporal_df.sort_values(["student_id", "semester"], inplace=True)
    temporal_df.reset_index(drop=True, inplace=True)
    
    return temporal_df

def extract_student_features(student_360) -> pd.DataFrame:
    """
    Extracts features for a single student for inference from their latest semester.
    """
    # Find the latest academic record
    if not student_360.academic_history:
        return pd.DataFrame()
        
    latest_academic = max(student_360.academic_history, key=lambda x: x.semester)
    t = latest_academic.semester
    
    # Extract matching records for semester t
    academic = next((r for r in student_360.academic_history if r.semester == t), None)
    attendance = next((r for r in student_360.attendance_history if r.semester == t), None)
    lms = next((r for r in student_360.lms_history if r.semester == t), None)
    engagement = next((r for r in student_360.engagement_history if r.semester == t), None)
    feedback = next((r for r in student_360.feedback_history if r.semester == t), None)
    
    if not all([academic, attendance, lms, engagement, feedback]):
        return pd.DataFrame()
        
    feature_dict = {
        "cgpa": academic.cgpa,
        "internal_marks": academic.internal_marks,
        "backlogs": academic.backlogs,
        "overall_attendance": attendance.overall_attendance,
        "login_frequency": lms.login_frequency,
        "assignment_completion": lms.assignment_completion,
        "events_count": engagement.events_count,
        "clubs_count": engagement.clubs_count,
        "hackathons_count": engagement.hackathons_count,
        "certifications_count": engagement.certifications_count,
        "student_satisfaction": feedback.student_satisfaction
    }
    
    return pd.DataFrame([feature_dict])
