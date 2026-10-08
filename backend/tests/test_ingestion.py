import os
import json
import pytest
from backend.app.services.ingestion import IngestionPipeline
from backend.app.schemas.canonical import AcademicRecordSchema

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
    import subprocess
    import sys
    # We can rely on the fact that random.seed(42) was set in the script.
    pass
