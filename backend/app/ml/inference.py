import os
import pickle
from pathlib import Path

import joblib
import numpy as np

from backend.app.ml.features.temporal_aggregator import FEATURE_COLS

_MODEL_ARTIFACT = None
_MODEL_SOURCE = None
DEFAULT_MODEL_PATH = Path(__file__).parent / "models" / "academic_risk_v2.joblib"


def model_path():
    from backend.app.core.config import settings
    return Path(os.getenv("EDUNEX_MODEL_PATH") or settings.edunex_model_path or DEFAULT_MODEL_PATH)


def _load_model():
    global _MODEL_ARTIFACT, _MODEL_SOURCE
    path = model_path()
    if not path.is_file():
        raise FileNotFoundError("Model artifact is unavailable")
    source = (str(path.resolve()), path.stat().st_mtime_ns)
    if _MODEL_ARTIFACT is None or _MODEL_SOURCE != source:
        try:
            artifact = joblib.load(path)
        except (EOFError, pickle.UnpicklingError, ImportError, AttributeError) as exc:
            raise ValueError("Unreadable model artifact") from exc
        if not isinstance(artifact, dict):
            raise ValueError("Invalid model artifact")
        if artifact.get("version") != "2.0.0" or artifact.get("features") != FEATURE_COLS:
            raise ValueError("Unsupported model version or feature contract")
        model = artifact["model"]
        if not hasattr(model, "named_steps") or not hasattr(model, "classes_"):
            raise ValueError("Unsupported model structure")
        if list(model.classes_) != [0, 1] or set(model.named_steps) != {"scaler", "lr"}:
            raise ValueError("Unsupported model structure or outcome classes")
        background = np.asarray(artifact.get("background_mean"), dtype=float)
        if background.shape != (len(FEATURE_COLS),) or not np.isfinite(background).all():
            raise ValueError("Invalid explanation background")
        if not isinstance(artifact.get("report"), dict) or not isinstance(artifact.get("metadata"), dict):
            raise ValueError("Missing model evidence")
        _MODEL_ARTIFACT, _MODEL_SOURCE = artifact, source
    return _MODEL_ARTIFACT


def validated_features(frame, artifact):
    if frame.empty:
        raise ValueError("Feature DataFrame cannot be empty for inference.")
    missing = [col for col in artifact["features"] if col not in frame]
    if missing:
        raise ValueError(f"Missing required features for inference: {missing}")
    values = frame[artifact["features"]]
    if len(values) != 1 or not np.isfinite(values.to_numpy(dtype=float)).all():
        raise ValueError("Inference requires exactly one finite feature row")
    return values


def predict_academic_risk(features_df):
    if features_df.empty:
        raise ValueError("Feature DataFrame cannot be empty for inference.")
    artifact = _load_model()
    values = validated_features(features_df, artifact)
    probability = float(artifact["model"].predict_proba(values)[0][1])
    return probability >= .5, probability, {**artifact["metadata"], "version":artifact["version"]}
