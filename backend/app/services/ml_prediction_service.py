import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.app.services.student_360 import Student360Service
from backend.app.ml.features.temporal_aggregator import extract_student_features
from backend.app.ml.inference import predict_academic_risk
from backend.app.ml.explainability import generate_shap_explanation

from backend.app.services.cache import CacheService

class MLPredictionService:
    def __init__(self, db: Session):
        self.student_360_service = Student360Service(db)

    def get_academic_risk_prediction(self, student_id: str) -> dict:
        """
        Obtains the Student 360 data for a student, builds the feature vector
        from their most recent completed semester, and returns the ML prediction
        for their academic risk in the NEXT semester.
        """
        cache_key = f"edunex:v1:ai:prediction:{student_id}"
        cached = CacheService.get(cache_key)
        if cached:
            return cached
            
        try:
            student_360 = self.student_360_service.get_student_360(student_id)
        except HTTPException:
            raise
            
        features_df = extract_student_features(student_360)
        
        if features_df.empty:
            return {
                "status": "unavailable",
                "reason": "Insufficient historical data to generate a prediction."
            }
            
        try:
            prediction, probability, metadata = predict_academic_risk(features_df)
            explanation = generate_shap_explanation(features_df)
        except Exception as e:
            # Safely handle model loading errors or missing feature errors
            return {
                "status": "error",
                "reason": str(e)
            }
            
        result = {
            "status": "success",
            "student_id": student_id,
            "prediction_horizon": "next_semester",
            "prediction": "Elevated Risk" if prediction else "Low Risk",
            "risk_probability": round(probability, 4),
            "model_version": metadata.get("version", "1.0.0"),
            "features": features_df.to_dict(orient="records")[0],
            "top_factors": explanation
        }
        
        CacheService.set(cache_key, result, ttl=300, tags=[f"student:{student_id}"])
        return result

