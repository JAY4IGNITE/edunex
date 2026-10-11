import os

import pandas as pd
import yaml
from sqlalchemy import tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from backend.app.core.database import SessionLocal
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
from backend.app.schemas.canonical import (
    AcademicRecordSchema,
    AttendanceRecordSchema,
    EngagementRecordSchema,
    FeedbackRecordSchema,
    LMSRecordSchema,
    PlacementRecordSchema,
    SkillRecordSchema,
    StudentSchema,
)
from backend.app.services.ingestion import IngestionPipeline

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
DEMO_DIR = os.path.join(BASE_DIR, "data/demo/generated")
PROCESSED_DIR = os.path.join(BASE_DIR, "data/processed")
META_DIR = os.path.join(BASE_DIR, "data/metadata")
os.makedirs(PROCESSED_DIR, exist_ok=True)

def load_metadata():
    with open(os.path.join(META_DIR, "dataset_registry.yaml"), "r") as f:
        registry = yaml.safe_load(f)
    return registry["datasets"]["campuspulse_demo"]

def load_into_db(session: Session, model, df: pd.DataFrame, unique_keys: list[str]):
    records = df.to_dict(orient="records")
    if not records:
        return
    statement = pg_insert(model).values(records).on_conflict_do_nothing(
        index_elements=[getattr(model, key) for key in unique_keys]
    )
    session.execute(statement)
    session.commit()


def missing_natural_keys(session: Session, model, df: pd.DataFrame, unique_keys: list[str]):
    expected = set(df[unique_keys].drop_duplicates().itertuples(index=False, name=None))
    columns = [getattr(model, key) for key in unique_keys]
    found = set()
    keys = list(expected)
    for offset in range(0, len(keys), 500):
        batch = keys[offset : offset + 500]
        if len(columns) == 1:
            condition = columns[0].in_([key[0] for key in batch])
        else:
            condition = tuple_(*columns).in_(batch)
        found.update(tuple(row) for row in session.query(*columns).filter(condition).all())
    return expected - found

def is_database_complete(db: Session) -> bool:
    """Fast pre-check to verify if database already contains seeded canonical and derived data.
    Runs fast count/limit queries without loading CSVs or running validation.
    """
    try:
        from backend.app.models.academic_risk import AcademicRiskScore
        from backend.app.models.placement_risk import PlacementRiskScore
        from backend.app.models.scoring import StudentSuccessScore
        from backend.app.models.demo_assignment import DemoAssignment

        expected_students = db.query(Student.student_id).count()
        if expected_students == 0:
            return False

        # Fast verification that canonical domains have data
        for model in (AcademicRecord, AttendanceRecord, LMSRecord, EngagementRecord, PlacementRecord, SkillRecord, FeedbackRecord):
            if db.query(model.student_id).first() is None:
                return False

        # Verify derived scores exist for the student population
        derived_data_complete = all(
            db.query(model).count() >= expected_students
            for model in (StudentSuccessScore, AcademicRiskScore, PlacementRiskScore)
        )
        if not derived_data_complete:
            return False

        # Verify demo assignment records exist
        if db.query(DemoAssignment.user_id).first() is None:
            return False

        return True
    except Exception as e:
        print(f"Database pre-check notice: {e}")
        return False

def run():
    # Fast path: check if database is already seeded before loading metadata,
    # processing CSVs, or validating schemas to avoid server startup delays.
    try:
        db = SessionLocal()
        try:
            if is_database_complete(db):
                print("Synthetic canonical data is already complete; skipping ingestion.")
                return
        finally:
            db.close()
    except Exception as e:
        print(f"Pre-check skipped due to database connection status: {e}")

    meta = load_metadata()
    prov_info = {
        "dataset_id": meta["dataset_id"],
        "source_name": meta["name"],
        "reference": meta["reference"],
        "license": meta["license"],
        "acquisition_date": meta["acquisition_date"],
        "authenticity": meta["authenticity"],
        "domains": meta["domains_covered"],
        "verification_status": meta["verification_status"]
    }
    
    pipeline = IngestionPipeline(dataset_id="campuspulse_demo", provenance_info=prov_info)

    # Domain configurations
    domains = [
        ("students", "students.csv", StudentSchema, ["student_id"], Student),
        ("academic_records", "academic_records.csv", AcademicRecordSchema, ["student_id", "semester", "academic_year"], AcademicRecord),
        ("attendance_records", "attendance_records.csv", AttendanceRecordSchema, ["student_id", "semester", "academic_year"], AttendanceRecord),
        ("lms_records", "lms_records.csv", LMSRecordSchema, ["student_id", "semester", "academic_year"], LMSRecord),
        ("engagement_records", "engagement_records.csv", EngagementRecordSchema, ["student_id", "semester", "academic_year"], EngagementRecord),
        ("placement_records", "placement_records.csv", PlacementRecordSchema, ["student_id"], PlacementRecord),
        ("skill_records", "skill_records.csv", SkillRecordSchema, ["student_id"], SkillRecord),
        ("feedback_records", "feedback_records.csv", FeedbackRecordSchema, ["student_id", "semester", "academic_year"], FeedbackRecord)
    ]

    processed_dfs = {}

    for name, filename, schema, unique_keys, model in domains:
        print(f"Processing {name}...")
        file_path = os.path.join(DEMO_DIR, filename)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Required synthetic dataset file is missing: {file_path}")
            
        df = pipeline.process_domain(name, file_path, schema, unique_keys)
        if df.empty:
            raise ValueError(f"Required synthetic dataset domain is empty after validation: {name}")
        processed_dfs[(name, model)] = df
        
        # Save canonical
        df.to_csv(os.path.join(PROCESSED_DIR, f"canonical_{name}.csv"), index=False)

    pipeline.save_quality_report(os.path.join(PROCESSED_DIR, "quality_report.json"))
    pipeline.record_provenance(os.path.join(PROCESSED_DIR, "provenance.json"))
    
    print("Ingestion files saved. Attempting database load...")
    
    # DB Load. Schema changes are owned by Alembic, not create_all.
    try:
        db = SessionLocal()

        unique_keys_by_model = {model: keys for _name, _file, _schema, keys, model in domains}
        domain_data_complete = all(
            not missing_natural_keys(db, model, df, unique_keys_by_model[model])
            for (_name, model), df in processed_dfs.items()
        )
        from backend.app.models.academic_risk import AcademicRiskScore
        from backend.app.models.placement_risk import PlacementRiskScore
        from backend.app.models.scoring import StudentSuccessScore
        from backend.app.models.segment import StudentSegmentMembership
        expected_students = db.query(Student).count()
        derived_data_complete = expected_students > 0 and all(
            db.query(model).count() >= expected_students
            for model in (StudentSuccessScore, AcademicRiskScore, PlacementRiskScore)
        )
        complete = domain_data_complete and derived_data_complete
        if not domain_data_complete:
            for (name, model), df in processed_dfs.items():
                print(f"Loading {name} to DB...")
                load_into_db(db, model, df, unique_keys_by_model[model])

        # On a new database the caseload migration precedes ingestion and sees no students.
        student_ids = [row[0] for row in db.query(Student.student_id).order_by(Student.student_id).all()]
        split = len(student_ids) // 2
        assignments = (
            [{"user_id": "mentor-demo", "student_id": sid} for sid in student_ids[:split]]
            + [{"user_id": "counselor-demo", "student_id": sid} for sid in student_ids[split:]]
        )
        if assignments:
            stmt = pg_insert(DemoAssignment).values(assignments).on_conflict_do_nothing(
                index_elements=[DemoAssignment.user_id, DemoAssignment.student_id]
            )
            db.execute(stmt)
            db.commit()

        if complete:
            print("Synthetic canonical data is already complete; no records changed.")
            db.close()
            return
            
        print("Database ingestion successful.")
        
        print("Calculating initial scores and segments...")
        from backend.app.services.academic_risk import AcademicRiskService
        from backend.app.services.placement_risk import PlacementRiskService
        from backend.app.services.scoring import ScoringService
        from backend.app.services.segmentation import SegmentationService
        
        scoring_svc = ScoringService(db)
        acad_risk_svc = AcademicRiskService(db)
        place_risk_svc = PlacementRiskService(db)
        seg_svc = SegmentationService(db)
        
        # Clear existing calculations
        db.query(StudentSegmentMembership).delete(synchronize_session=False)
        db.query(PlacementRiskScore).delete()
        db.query(AcademicRiskScore).delete()
        db.query(StudentSuccessScore).delete()
        db.commit()
        
        sids = [s.student_id for s in db.query(Student.student_id).all()]
        for sid in sids:
            try:
                scoring_svc.get_or_calculate_success_score(sid)
                acad_risk_svc.get_or_calculate_academic_risk(sid)
                place_risk_svc.get_or_calculate_placement_risk(sid)
                mem = seg_svc.classify_student(sid)
                if mem.primary_segment:
                    db.add(StudentSegmentMembership(
                        student_id=sid,
                        segment_id=mem.primary_segment,
                        membership_type="PRIMARY"
                    ))
                    for sec in mem.secondary_segments:
                        db.add(StudentSegmentMembership(
                            student_id=sid,
                            segment_id=sec,
                            membership_type="SECONDARY"
                        ))
            except Exception as e:
                print(f"Failed to calculate scores for {sid}: {e}")

        db.commit()
        db.close()
        
        # Invalidate all main tags because underlying data completely changed
        from backend.app.services.cache import CacheService
        from backend.app.services.pubsub import PubSubService
        
        CacheService.invalidate_tags(["analytics", "segments", "insights"])
        PubSubService.publish("analytics_updated")
        
        print("Caches invalidated and events published successfully.")
    except OperationalError as e:
        print(f"Database connection warning: {e}. Data saved to processed directory.")
    except Exception as e:
        print(f"Database error during ingestion: {e}")

if __name__ == "__main__":
    run()
