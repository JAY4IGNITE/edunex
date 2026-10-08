import pytest
from pydantic import ValidationError
from backend.app.schemas.canonical import StudentSchema, AcademicRecordSchema, ProvenanceMetadata
import yaml

def test_student_schema_valid():
    student = StudentSchema(
        student_id="STU001",
        department="Computer Science",
        year=3,
        semester=5,
        section="A",
        academic_year="2026-2027"
    )
    assert student.student_id == "STU001"

def test_student_schema_invalid_year_format():
    with pytest.raises(ValidationError):
        StudentSchema(
            student_id="STU001",
            department="Computer Science",
            year=3,
            semester=5,
            section="A",
            academic_year="26-27"  # Invalid format
        )

def test_academic_schema_missing_student_id():
    with pytest.raises(ValidationError):
        AcademicRecordSchema(
            semester=5,
            academic_year="2026-2027",
            cgpa=8.5,
            internal_marks=45.0,
            backlogs=0
        )

def test_academic_schema_invalid_cgpa_range():
    with pytest.raises(ValidationError):
        AcademicRecordSchema(
            student_id="STU001",
            semester=5,
            academic_year="2026-2027",
            cgpa=11.5,  # Invalid range
            internal_marks=45.0,
            backlogs=0
        )

def test_dataset_metadata_validation():
    # Load from registry to test
    with open("data/metadata/dataset_registry.yaml", "r") as f:
        registry = yaml.safe_load(f)
    
    demo_meta = registry["datasets"]["campuspulse_demo"]
    # Pydantic validation
    from datetime import date
    prov = ProvenanceMetadata(
        dataset_id=demo_meta["dataset_id"],
        source_name=demo_meta["name"],
        reference=demo_meta["reference"],
        license=demo_meta["license"],
        acquisition_date=date.fromisoformat(demo_meta["acquisition_date"]),
        authenticity=demo_meta["authenticity"],
        domains=demo_meta["domains_covered"],
        verification_status=demo_meta["verification_status"]
    )
    assert prov.dataset_id == "campuspulse_demo"

def test_source_mapping_validation():
    with open("data/metadata/source_mapping.yaml", "r") as f:
        mappings = yaml.safe_load(f)
    
    assert "campuspulse_demo" in mappings["mappings"]
    assert mappings["mappings"]["campuspulse_demo"]["cgpa"]["validation"] == "range_0_10"

def test_duplicate_records_detection():
    # Simulate a check for duplicate student-period records
    records = [
        AcademicRecordSchema(student_id="STU001", semester=1, academic_year="2026-2027", cgpa=8.0, internal_marks=40.0, backlogs=0),
        AcademicRecordSchema(student_id="STU001", semester=1, academic_year="2026-2027", cgpa=8.0, internal_marks=40.0, backlogs=0)
    ]
    seen = set()
    duplicates = []
    for r in records:
        key = (r.student_id, r.semester, r.academic_year)
        if key in seen:
            duplicates.append(key)
        seen.add(key)
    
    assert len(duplicates) == 1
    assert duplicates[0] == ("STU001", 1, "2026-2027")

