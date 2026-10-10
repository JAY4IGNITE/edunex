import logging

from fastapi import HTTPException

from backend.app.ml.explainability import generate_shap_explanation
from backend.app.ml.features.temporal_aggregator import extract_student_features
from backend.app.ml.inference import predict_academic_risk
from backend.app.services.explanation import ExplanationService
from backend.app.services.student_360 import Student360Service

logger = logging.getLogger(__name__)


class MLPredictionService:
    def __init__(self, db):
        self.student_360_service = Student360Service(db)

    def _fallback(self, student, reason):
        try:
            baseline = ExplanationService(None)._explain_academic_risk(student).model_dump(mode="json")
        except HTTPException:
            return {"status":"unavailable","reason":reason + "; insufficient baseline data"}
        return {"status":"fallback","source":"deterministic_baseline","score_type":"risk_score_not_probability",
                "student_id":student.student.student_id,"risk_score":baseline["score"],"risk_level":baseline["risk_level"],
                "baseline_explanation":baseline,"reason":reason,"prediction_horizon":"current_assessment"}

    def get_academic_risk_prediction(self, student_id):
        student = self.student_360_service.get_student_360(student_id)
        features = extract_student_features(student)
        if features.empty:
            return self._fallback(student,"Insufficient same-term inputs for the trained model")
        try:
            prediction, probability, metadata = predict_academic_risk(features)
            explanation = generate_shap_explanation(features)
        except (FileNotFoundError, ValueError, OSError, KeyError, TypeError) as exc:
            logger.warning("Model unavailable; serving transparent baseline (%s)",type(exc).__name__)
            return self._fallback(student,"Trained model unavailable; transparent baseline shown")
        return {"status":"success","source":"trained_model","score_type":"synthetic_outcome_probability",
                "student_id":student_id,"prediction_horizon":"next_semester",
                "prediction":"Elevated Risk" if prediction else "Low Risk","risk_probability":round(probability,4),
                "model_version":metadata["version"],"features":features.to_dict(orient="records")[0],"top_factors":explanation,
                "limitation":"Synthetic demonstration model. Low recall at the fixed threshold; use baseline drivers for staff review, not automated decisions."}
