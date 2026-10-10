"""Exact additive logistic coefficient contributions in log-odds units.

The historical function name is retained for callers. No heavyweight SHAP runtime
is needed: centered linear-model contributions reconstruct the same prediction.
"""
import numpy as np

from backend.app.ml.inference import _load_model, validated_features


def generate_shap_explanation(features_df):
    artifact = _load_model()
    values = validated_features(features_df, artifact)
    scaler, lr = artifact["model"].named_steps["scaler"], artifact["model"].named_steps["lr"]
    scaled = scaler.transform(values)[0]
    background = np.asarray(artifact["background_mean"])
    contributions = (scaled - background) * lr.coef_[0]
    base = float(lr.intercept_[0] + background @ lr.coef_[0])
    rows = [{"feature":name,"value":float(values.iloc[0][name]),"contribution":float(value),
             "direction":"higher_risk" if value>0 else "lower_risk" if value<0 else "neutral"}
            for name,value in zip(artifact["features"],contributions)]
    rows.sort(key=lambda row:abs(row["contribution"]),reverse=True)
    return {"all_contributions":rows,"top_higher_risk":[r for r in rows if r["direction"]=="higher_risk"][:3],
            "top_lower_risk":[r for r in rows if r["direction"]=="lower_risk"][:3],"expected_value":base,
            "method":"Centered logistic coefficients", "units":"log-odds",
            "note":"Associations relative to the training mean, not causal effects."}
