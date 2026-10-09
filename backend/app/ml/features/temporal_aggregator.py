"""Same-period inputs paired with the immediately following cumulative semester."""
import json
import re
from pathlib import Path
import pandas as pd
import numpy as np
from sqlalchemy import select
from backend.app.models.canonical import AcademicRecord, AttendanceRecord, LMSRecord, EngagementRecord, FeedbackRecord

KEYS = ["student_id", "academic_year", "semester"]
TABLES = {"academic": AcademicRecord, "attendance": AttendanceRecord, "lms": LMSRecord,
          "engagement": EngagementRecord, "feedback": FeedbackRecord}
FEATURE_COLS = ["cgpa", "internal_marks", "backlogs", "overall_attendance", "login_frequency",
                "assignment_completion", "events_count", "clubs_count", "hackathons_count",
                "certifications_count", "student_satisfaction"]


def next_year(value, semester):
    if not re.fullmatch(r"\d{4}-\d{4}", value):
        raise ValueError("Academic year must use YYYY-YYYY format")
    start, end = map(int, value.split("-"))
    if end != start + 1:
        raise ValueError("Academic year must span consecutive calendar years")
    shift = int(semester % 2 == 0)
    return f"{start + shift}-{end + shift}"


def assemble_temporal_dataset(frames):
    for name, frame in frames.items():
        if frame.duplicated(KEYS).any():
            raise ValueError(f"Duplicate student/year/semester keys in {name}")
    academic = frames["academic"].copy()
    if academic.empty:
        return pd.DataFrame()
    features = academic.copy()
    for name in ("attendance", "lms", "engagement", "feedback"):
        columns = KEYS + [c for c in FEATURE_COLS if c in frames[name] and c not in features]
        features = features.merge(frames[name][columns], on=KEYS, how="inner", validate="one_to_one")
    features["target_semester"] = features.semester + 1
    features["target_academic_year"] = [next_year(y, s) for y, s in zip(features.academic_year, features.semester)]
    targets = academic[KEYS + ["backlogs"]].rename(columns={"semester":"target_semester", "academic_year":"target_academic_year", "backlogs":"target_backlogs"})
    result = features.merge(targets, on=["student_id", "target_academic_year", "target_semester"], how="inner", validate="one_to_one")
    valid_target = np.isfinite(result.target_backlogs) & (result.target_backlogs >= 0)
    invalid_targets = int((~valid_target).sum())
    result = result.loc[valid_target].copy()
    result["target"] = (result.pop("target_backlogs") > 0).astype(int)
    incomplete = result[FEATURE_COLS].isna().any(axis=1)
    dropped = int(incomplete.sum())
    result = result.loc[~incomplete].sort_values(KEYS).reset_index(drop=True)
    if "subject_performance" in result:
        result["subject_performance"] = result.subject_performance.map(lambda v: json.loads(v) if isinstance(v,str) and v else v if isinstance(v,dict) else None)
    result.attrs["data_audit"] = {"academic_rows":len(academic), "rows_with_all_domains":len(features),
        "missing_domain_rows":len(academic)-len(features), "without_adjacent_target":len(features)-len(result)-dropped-invalid_targets,
        "invalid_target_rows":invalid_targets,
        "missing_feature_rows":dropped, "eligible_temporal_rows":len(result)}
    return result


def build_temporal_dataset(db):
    frames = {}
    for name, model in TABLES.items():
        with db.bind.connect() as connection:
            frames[name] = pd.read_sql(select(model), connection)
    return assemble_temporal_dataset(frames)


def build_csv_dataset(directory):
    return assemble_temporal_dataset({name:pd.read_csv(Path(directory) / f"canonical_{name}_records.csv") for name in TABLES})


def extract_student_features(profile):
    if not profile.academic_history:
        return pd.DataFrame()
    academic = max(profile.academic_history, key=lambda r:(r.academic_year,r.semester))
    records = [academic]
    for name in ("attendance_history","lms_history","engagement_history","feedback_history"):
        record = next((r for r in getattr(profile,name) if (r.academic_year,r.semester)==(academic.academic_year,academic.semester)),None)
        if record is None:
            return pd.DataFrame()
        records.append(record)
    values = {key:getattr(record,key) for record in records for key in FEATURE_COLS if hasattr(record,key)}
    return pd.DataFrame([values],columns=FEATURE_COLS)
