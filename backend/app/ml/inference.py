import os
import joblib
import pandas as pd
from typing import Dict, Any, Tuple

# We cache the model at the module level to avoid reloading on every request
_MODEL_ARTIFACT = None

def _load_model():
    global _MODEL_ARTIFACT
    if _MODEL_ARTIFACT is None:
        model_path = os.path.join(os.path.dirname(__file__), "models", "academic_risk_model.joblib")
        if not os.path.exists(model_path):
            raise FileNotFoundError("ML model artifact not found. Please train the model first.")
        _MODEL_ARTIFACT = joblib.load(model_path)
    return _MODEL_ARTIFACT

def predict_academic_risk(features_df: pd.DataFrame) -> Tuple[bool, float, Dict[str, Any]]:
    """
    Takes a single-row DataFrame of features and returns (prediction, probability, metadata).
    """
    if features_df.empty:
        raise ValueError("Feature DataFrame cannot be empty for inference.")
        
    artifact = _load_model()
    model = artifact["model"]
    feature_cols = artifact["features"]
    
    # Ensure correct feature ordering and presence
    missing_cols = [col for col in feature_cols if col not in features_df.columns]
    if missing_cols:
        raise ValueError(f"Missing required features for inference: {missing_cols}")
        
    X = features_df[feature_cols]
    
    probability = float(model.predict_proba(X)[0][1])
    prediction = bool(model.predict(X)[0])
    
    metadata = artifact.get("metadata", {})
    metadata["version"] = artifact.get("version", "unknown")
    
    return prediction, probability, metadata
