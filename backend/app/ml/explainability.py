import shap
import pandas as pd
from typing import Dict, Any, List
from backend.app.ml.inference import _load_model
from backend.app.core.database import SessionLocal
from backend.app.ml.features.temporal_aggregator import build_temporal_dataset

_EXPLAINER = None
_SCALER = None

def _initialize_explainer():
    global _EXPLAINER, _SCALER
    if _EXPLAINER is not None:
        return
        
    artifact = _load_model()
    model = artifact["model"] # Pipeline
    feature_cols = artifact["features"]
    
    # Lazily build background dataset once
    db = SessionLocal()
    try:
        df = build_temporal_dataset(db)
        if df.empty:
            raise ValueError("No temporal data available to build SHAP explainer.")
        X_bg = df[feature_cols]
    finally:
        db.close()
        
    lr_model = model.named_steps["lr"]
    _SCALER = model.named_steps["scaler"]
    
    X_bg_scaled = _SCALER.transform(X_bg)
    
    # Initialize explainer with a reasonable sample size to limit memory/compute overhead
    # LinearExplainer works well with a small representative background
    _EXPLAINER = shap.LinearExplainer(lr_model, shap.maskers.Independent(X_bg_scaled, max_samples=100))

def generate_shap_explanation(features_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Generates SHAP values for a given feature DataFrame (single row).
    Returns a dictionary of top contributing factors.
    """
    if features_df.empty:
        raise ValueError("Feature DataFrame cannot be empty for explanation.")
        
    _initialize_explainer()
    
    artifact = _load_model()
    feature_cols = artifact["features"]
    
    # Reorder features to match model
    X = features_df[feature_cols]
    
    # Scale features
    X_scaled = _SCALER.transform(X)
    
    # Calculate SHAP values
    shap_values = _EXPLAINER.shap_values(X_scaled)
    
    # Extract values for the single row
    row_shap = shap_values[0]
    
    # Map back to feature names
    contributions = []
    for i, col in enumerate(feature_cols):
        # A positive SHAP value increases the log-odds (increases risk)
        # A negative SHAP value decreases the log-odds (decreases risk)
        contributions.append({
            "feature": col,
            "value": float(X.iloc[0][col]),
            "contribution": float(row_shap[i]),
            "direction": "higher_risk" if row_shap[i] > 0 else "lower_risk"
        })
        
    # Sort by absolute magnitude of contribution
    contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    
    # Split into higher/lower risk drivers
    higher_risk = [c for c in contributions if c["direction"] == "higher_risk"]
    lower_risk = [c for c in contributions if c["direction"] == "lower_risk"]
    
    return {
        "all_contributions": contributions,
        "top_higher_risk": higher_risk[:3],
        "top_lower_risk": lower_risk[:3],
        "expected_value": float(_EXPLAINER.expected_value)
    }
