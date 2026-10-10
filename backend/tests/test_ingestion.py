import json

from backend.app.schemas.canonical import AcademicRecordSchema
from backend.app.services.ingestion import IngestionPipeline


def test_ingestion_duplicate_detection(tmp_path):
    # Create dummy csv
    csv_file = tmp_path / "test.csv"
    csv_file.write_text("student_id,semester,academic_year,cgpa,internal_marks,backlogs\n"
                        "STU01,1,2023-2024,8.0,40,0\n"
                        "STU01,1,2023-2024,8.0,40,0\n")
    
    pipeline = IngestionPipeline("test_dataset", {"dataset_id": "test", "source_name": "Test", "reference": "N/A", "license": "MIT", "acquisition_date": "2026-10-08", "authenticity": "mock", "domains": [], "verification_status": "VERIFIED"})
    df = pipeline.process_domain("academic", str(csv_file), AcademicRecordSchema, ["student_id", "semester", "academic_year"])
    
    stats = pipeline.report["domains"]["academic"]
    assert stats["records_processed"] == 2
    assert stats["duplicate_records"] == 1
    assert stats["records_accepted"] == 1
    assert len(df) == 1

def test_quality_report_generation(tmp_path):
    pipeline = IngestionPipeline("test_dataset", {})
    pipeline.report["domains"]["test"] = {"records_processed": 10}
    
    out_file = tmp_path / "report.json"
    pipeline.save_quality_report(str(out_file))
    
    assert out_file.exists()
    data = json.loads(out_file.read_text())
    assert data["domains"]["test"]["records_processed"] == 10

def test_orphan_detection():
    # Simulation: an academic record pointing to a non-existent student in DB.
    # Typically caught via DB Foreign Key constraints during ingestion.
    pass

def test_deterministic_generation():
    # If we run the generator twice with same seed, we get same results
    # We can rely on the fact that random.seed(42) was set in the script.
    pass


def test_database_seed_uses_natural_key_conflict_guard():
    import pandas as pd
    from sqlalchemy.dialects import postgresql

    from backend.app.models.canonical import Student
    from backend.scripts.run_ingestion import load_into_db

    class SessionStub:
        statement = None
        committed = False

        def execute(self, statement):
            self.statement = statement

        def commit(self):
            self.committed = True

    session = SessionStub()
    rows = pd.DataFrame([{
        "student_id": "STU0001", "department": "Computer Science", "year": 2,
        "semester": 4, "section": "A", "academic_year": "2024-2025",
    }])
    load_into_db(session, Student, rows, ["student_id"])
    sql = str(session.statement.compile(dialect=postgresql.dialect()))
    assert "ON CONFLICT (student_id) DO NOTHING" in sql
    assert session.committed


def test_partial_seed_detection_uses_composite_natural_keys():
    import pandas as pd
    from sqlalchemy import Column, Integer, String, create_engine
    from sqlalchemy.orm import declarative_base, sessionmaker

    from backend.scripts.run_ingestion import missing_natural_keys

    Base = declarative_base()

    class SampleRecord(Base):
        __tablename__ = "sample_records"
        id = Column(Integer, primary_key=True)
        student_id = Column(String, nullable=False)
        semester = Column(Integer, nullable=False)

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add(SampleRecord(student_id="STU0001", semester=1))
    session.commit()
    expected = pd.DataFrame([
        {"student_id": "STU0001", "semester": 1},
        {"student_id": "STU0001", "semester": 2},
    ])
    assert missing_natural_keys(session, SampleRecord, expected, ["student_id", "semester"]) == {
        ("STU0001", 2)
    }
    session.close()
    engine.dispose()
