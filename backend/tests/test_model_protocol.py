import json
from types import SimpleNamespace

import numpy as np
import pandas as pd
import pytest

from backend.app.ml.explainability import generate_shap_explanation
from backend.app.ml.features.temporal_aggregator import (
    FEATURE_COLS,
    TABLES,
    assemble_temporal_dataset,
    build_csv_dataset,
)
from backend.app.ml.inference import predict_academic_risk
from backend.app.ml.train_academic_risk import (
    ROOT,
    baseline_scores,
    metrics,
    split_dataset,
    train_and_evaluate,
)
from backend.app.schemas.student_360 import Student360Response
from backend.app.services.ml_prediction_service import MLPredictionService


@pytest.fixture(scope="module")
def dataset():
    return build_csv_dataset(ROOT / "data" / "processed")


def test_disjoint_students_and_forward_only_terms(dataset):
    splits, groups = split_dataset(dataset)
    assert not set(groups["train"]) & set(groups["validation"])
    assert not set(groups["test"]) & (set(groups["train"]) | set(groups["validation"]))
    assert set(splits["train"].semester) == {1,2}
    assert set(splits["test"].semester) == {3}
    assert (dataset.target_semester == dataset.semester + 1).all()
    assert "target" not in FEATURE_COLS and "student_id" not in FEATURE_COLS


def test_duplicate_keys_rejected():
    frames = {name:pd.read_csv(ROOT / "data" / "processed" / f"canonical_{name}_records.csv") for name in TABLES}
    frames["academic"] = pd.concat([frames["academic"], frames["academic"].iloc[[0]]])
    with pytest.raises(ValueError, match="Duplicate"):
        assemble_temporal_dataset(frames)


def test_metrics_and_artifact_reproduce(dataset, tmp_path):
    first = train_and_evaluate(tmp_path / "one.joblib", tmp_path / "one.json", dataset)
    second = train_and_evaluate(tmp_path / "two.joblib", tmp_path / "two.json", dataset)
    assert first == second
    assert sum(b["count"] for b in first["partitions"]["test"]["model"]["calibration_bins"]) == 200
    assert first["partitions"]["test"]["rows"] == 200
    assert json.loads((tmp_path / "one.json").read_text())["artifact_sha256"] == first["artifact_sha256"]


def test_contributions_reconstruct_probability(dataset):
    row = dataset.iloc[[0]]
    _, probability, _ = predict_academic_risk(row)
    explanation = generate_shap_explanation(row)
    log_odds = explanation["expected_value"] + sum(r["contribution"] for r in explanation["all_contributions"])
    assert 1 / (1 + np.exp(-log_odds)) == pytest.approx(probability, abs=1e-12)


def test_baseline_has_no_future_dependency(dataset):
    frame = dataset.iloc[[0]].copy()
    before = baseline_scores(frame)
    frame["target"] = 1 - frame.target
    assert baseline_scores(frame) == before


def test_missing_artifact_serves_score_not_probability(monkeypatch, tmp_path, dataset):
    import backend.app.services.ml_prediction_service as service_module
    monkeypatch.setenv("EDUNEX_MODEL_PATH",str(tmp_path / "missing.joblib"))
    profile = Student360Response(student=dict(student_id="TEST", department="CSE",year=2,semester=2,section="A",academic_year="2025-2026"),
        academic_history=[dict(student_id="TEST",semester=2,academic_year="2025-2026",cgpa=5,internal_marks=30,backlogs=2)])
    service = MLPredictionService(None)
    service.student_360_service = SimpleNamespace(get_student_360=lambda _:profile)
    monkeypatch.setattr(service_module,"extract_student_features",lambda _:dataset.iloc[[0]])
    result = service.get_academic_risk_prediction("TEST")
    assert result["status"] == "fallback"
    assert result["score_type"] == "risk_score_not_probability"
    assert "risk_probability" not in result and result["risk_score"] > 0


def test_single_class_evaluation_does_not_invent_auc():
    report = metrics([0,0],[.1,.2])
    assert report["roc_auc"] is None and report["roc_auc_note"]


def test_nonfinite_inference_rejected(dataset):
    row = dataset.iloc[[0]].copy()
    row["cgpa"] = np.inf
    with pytest.raises(ValueError,match="finite"):
        predict_academic_risk(row)


def test_missing_target_is_excluded_not_labeled_negative():
    frames = {name:pd.read_csv(ROOT / "data" / "processed" / f"canonical_{name}_records.csv") for name in TABLES}
    frames["academic"].loc[1,"backlogs"] = np.nan
    result = assemble_temporal_dataset(frames)
    assert not ((result.student_id == "STU0001") & (result.semester == 1)).any()
    assert result.attrs["data_audit"]["invalid_target_rows"] == 1


def test_corrupt_artifact_has_controlled_load_error(monkeypatch,tmp_path):
    from backend.app.ml.inference import _load_model
    path = tmp_path / "broken.joblib"
    path.write_bytes(b"")
    monkeypatch.setenv("EDUNEX_MODEL_PATH",str(path))
    with pytest.raises(ValueError,match="Unreadable"):
        _load_model()
