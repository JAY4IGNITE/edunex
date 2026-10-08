import os
import yaml
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
import pandas as pd

from backend.app.core.database import engine, Base, SessionLocal
from backend.app.services.ingestion import IngestionPipeline
from backend.app.schemas.canonical import (
    StudentSchema, AcademicRecordSchema, AttendanceRecordSchema,
    LMSRecordSchema, EngagementRecordSchema, PlacementRecordSchema,
    SkillRecordSchema, FeedbackRecordSchema
)
from backend.app.models.canonical import (
    Student, AcademicRecord, AttendanceRecord, LMSRecord,
    EngagementRecord, PlacementRecord, SkillRecord, FeedbackRecord
)

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

def load_into_db(session: Session, model, df: pd.DataFrame):
    records = df.to_dict(orient="records")
    session.bulk_insert_mappings(model, records)
    session.commit()

def run():
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
            print(f"File not found: {file_path}")
            continue
            
        df = pipeline.process_domain(name, file_path, schema, unique_keys)
        processed_dfs[(name, model)] = df
        
        # Save canonical
        df.to_csv(os.path.join(PROCESSED_DIR, f"canonical_{name}.csv"), index=False)

    pipeline.save_quality_report(os.path.join(PROCESSED_DIR, "quality_report.json"))
    pipeline.record_provenance(os.path.join(PROCESSED_DIR, "provenance.json"))
    
    print("Ingestion files saved. Attempting database load...")
    
    # DB Load
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        
        for (name, model), df in processed_dfs.items():
            print(f"Loading {name} to DB...")
            # Clear existing for idempotency in demo script
            db.query(model).delete()
            db.commit()
            
            load_into_db(db, model, df)
            
        print("Database ingestion successful.")
        db.close()
    except OperationalError as e:
        print("Database connection failed. Ensure PostgreSQL is running. Data saved to processed directory.")
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    run()
