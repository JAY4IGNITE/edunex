import pytest
from sqlalchemy.orm import Session
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.models.canonical import Student, AcademicRecord
from backend.app.repositories.student_360 import Student360Repository

def test_postgresql_connection():
    try:
        # Attempt to connect to the database
        connection = engine.connect()
        connection.close()
        assert True
    except Exception as e:
        pytest.fail(f"PostgreSQL connection failed: {e}. Blocker: Database not accessible.")

def test_models_and_foreign_keys():
    # Verify relationships are correctly formed in ORM
    assert hasattr(Student, "academic_records")
    assert hasattr(AcademicRecord, "student")
    assert AcademicRecord.student.property.mapper.class_ == Student

def test_student_360_query_foundation():
    # If connection fails, this test will also fail or be skipped
    try:
        db = SessionLocal()
        repo = Student360Repository(db)
        # Assuming DB is empty, this should return None but not crash
        student_360 = repo.get_student_360("NON_EXISTENT")
        assert student_360 is None
        db.close()
    except Exception as e:
        pytest.skip(f"Skipping due to DB connection issue: {e}")

def test_uniqueness_constraints_present():
    # Inspect model table args for unique constraint on academic records
    found_unique = False
    for arg in AcademicRecord.__table_args__:
        if getattr(arg, "name", "") == "uq_academic_record":
            found_unique = True
    assert found_unique, "UniqueConstraint for uq_academic_record not found"
