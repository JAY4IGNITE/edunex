import pytest
import pandas as pd
import os
import joblib
from backend.app.core.database import SessionLocal
from backend.app.ml.features.temporal_aggregator import build_temporal_dataset
from backend.app.ml.train_academic_risk import train_and_evaluate
from backend.app.ml.inference import predict_academic_risk, _load_model, _MODEL_ARTIFACT
from backend.app.services.ml_prediction_service import MLPredictionService

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module")
def temporal_df(db_session):
    return build_temporal_dataset(db_session)

def test_temporal_dataset_generation(temporal_df):
    assert not temporal_df.empty, "Temporal dataset should not be empty"
    
def test_no_duplicate_training_rows(temporal_df):
    duplicates = temporal_df.duplicated(subset=["student_id", "semester"])
    assert not duplicates.any(), "Duplicate student-semester pairs found"

def test_correct_semester_pairing(temporal_df):
    # Max semester in features should be 3 since max available semester is 4 (and target is t+1)
    assert temporal_df["semester"].max() <= 3
    # Check that there is no semester 4 in the feature set
    assert 4 not in temporal_df["semester"].values

def test_data_leakage_t_plus_one(temporal_df, db_session):
    """
    Ensure t+1 backlogs is not used as a feature, and target correctly matches t+1.
    """
    assert "target_backlogs" not in temporal_df.columns
    assert "target" in temporal_df.columns
    
    # Let's manually verify one record to ensure no leakage
    sample = temporal_df.iloc[0]
    student_id = sample["student_id"]
    feature_sem = sample["semester"]
    
    from backend.app.models.canonical import AcademicRecord
    # The feature backlogs should match semester t
    sem_t_academic = db_session.query(AcademicRecord).filter_by(student_id=student_id, semester=feature_sem).first()
    assert sample["backlogs"] == sem_t_academic.backlogs
    
    # The target should match semester t+1 backlogs > 0
    sem_t_plus_1_academic = db_session.query(AcademicRecord).filter_by(student_id=student_id, semester=feature_sem + 1).first()
    expected_target = 1 if sem_t_plus_1_academic.backlogs > 0 else 0
    assert sample["target"] == expected_target

def test_training_and_serialization():
    # Run the training process
    train_and_evaluate()
    
    model_path = os.path.join(os.path.dirname(__file__), "..", "app", "ml", "models", "academic_risk_model.joblib")
    assert os.path.exists(model_path)
    
    artifact = joblib.load(model_path)
    assert "model" in artifact
    assert "features" in artifact
    assert "metadata" in artifact

def test_inference_valid_prediction(temporal_df):
    # Ensure module reloads artifact
    import backend.app.ml.inference as inference
    inference._MODEL_ARTIFACT = None 
    
    sample = temporal_df.iloc[[0]].copy()
    prediction, probability, metadata = predict_academic_risk(sample)
    
    assert isinstance(prediction, bool)
    assert 0.0 <= probability <= 1.0
    assert "version" in metadata

def test_inference_missing_feature():
    df = pd.DataFrame({"cgpa": [5.0]}) # missing other features
    with pytest.raises(ValueError, match="Missing required features"):
        predict_academic_risk(df)

def test_inference_empty_dataframe():
    df = pd.DataFrame()
    with pytest.raises(ValueError, match="cannot be empty"):
        predict_academic_risk(df)

def test_ml_prediction_service(db_session):
    service = MLPredictionService(db_session)
    # Pick a valid student ID from temporal_df
    student_id = "STU0001"
    
    result = service.get_academic_risk_prediction(student_id)
    assert result["status"] == "success"
    assert "prediction" in result
    assert "risk_probability" in result
    assert result["prediction_horizon"] == "next_semester"
    assert "top_factors" in result
    
    factors = result["top_factors"]
    assert "all_contributions" in factors
    assert "top_higher_risk" in factors
    assert "top_lower_risk" in factors
    
def test_ml_shap_direction(temporal_df):
    from backend.app.ml.explainability import generate_shap_explanation
    sample = temporal_df.iloc[[0]].copy()
    
    explanation = generate_shap_explanation(sample)
    
    all_contrib = explanation["all_contributions"]
    
    for c in all_contrib:
        if c["direction"] == "higher_risk":
            assert c["contribution"] > 0
        elif c["direction"] == "lower_risk":
            assert c["contribution"] < 0
            
def test_api_prediction_endpoint(db_session):
    from fastapi.testclient import TestClient
    from backend.app.main import app
    client = TestClient(app)
    
    response = client.get("/api/students/STU0001/ai-prediction")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "prediction" in data
    assert "top_factors" in data

def test_ml_prediction_service_invalid_student(db_session):
    service = MLPredictionService(db_session)
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        service.get_academic_risk_prediction("INVALID_STU")
