"""Reproducible synthetic evaluation; the test partition never selects a model."""
import hashlib
import json
import platform
import os
import tempfile
from pathlib import Path
from types import SimpleNamespace
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score, brier_score_loss
from backend.app.ml.features.temporal_aggregator import FEATURE_COLS, build_csv_dataset
from backend.app.services.explanation import ExplanationService

ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = Path(__file__).parent / "models" / "academic_risk_v2.joblib"
REPORT_PATH = ROOT / "reports" / "model-metrics.json"
SEED = 42


def split_dataset(df):
    ids = sorted(df.student_id.unique())
    train_ids, held_ids = train_test_split(ids, test_size=.4, random_state=SEED)
    val_ids, test_ids = train_test_split(sorted(held_ids), test_size=.5, random_state=SEED)
    groups = {"train":sorted(train_ids),"validation":sorted(val_ids),"test":sorted(test_ids)}
    splits = {name:df[df.student_id.isin(values) & df.semester.isin([1,2] if name=="train" else [3])].copy()
              for name,values in groups.items()}
    if any(part.empty for part in splits.values()):
        raise ValueError("Need nonempty train terms 1/2 and held-out term 3 partitions")
    if splits["train"].target.nunique() != 2:
        raise ValueError("Training requires both outcome classes; no model was saved")
    return splits, groups


def baseline_scores(frame):
    scores = []
    service = ExplanationService(None)
    for row in frame.to_dict("records"):
        row.setdefault("subject_performance",None)
        record = SimpleNamespace(**row)
        profile = SimpleNamespace(academic_history=[record],attendance_history=[record],lms_history=[record])
        scores.append(service._explain_academic_risk(profile).score / 100)
    return np.asarray(scores)


def metrics(y, probabilities, threshold=.5):
    y, probabilities = np.asarray(y), np.asarray(probabilities)
    predicted = probabilities >= threshold
    bins = []
    for i in range(5):
        mask = (probabilities >= i/5) & (probabilities < (i+1)/5 if i<4 else probabilities <= 1)
        count = int(mask.sum())
        bins.append({"lower":i/5,"upper":(i+1)/5,"count":count,
                     "mean_score":float(probabilities[mask].mean()) if count else None,
                     "observed_positive_fraction":float(y[mask].mean()) if count else None})
    return {"roc_auc":float(roc_auc_score(y,probabilities)) if len(np.unique(y))==2 else None,
            "roc_auc_note":None if len(np.unique(y))==2 else "Undefined: only one outcome class in this partition",
            "precision":float(precision_score(y,predicted,zero_division=0)), "recall":float(recall_score(y,predicted,zero_division=0)),
            "f1":float(f1_score(y,predicted,zero_division=0)), "brier":float(brier_score_loss(y,probabilities)),
            "threshold":threshold,"calibration_bins":bins}


def train_and_evaluate(output_path=MODEL_PATH, report_path=REPORT_PATH, dataset=None):
    df = build_csv_dataset(ROOT / "data" / "processed") if dataset is None else dataset.copy()
    splits, groups = split_dataset(df)
    train = splits["train"]
    model = Pipeline([("scaler",StandardScaler()),("lr",LogisticRegression(random_state=SEED,max_iter=1000))])
    model.fit(train[FEATURE_COLS],train.target)
    data_hash = hashlib.sha256(df.to_json(orient="records",double_precision=15).encode()).hexdigest()
    report = {"version":"2.0.0","seed":SEED,"provenance":"Demonstration Institutional Dataset — synthetic",
        "target":"Backlogs > 0 in the immediately following semester; no future inputs",
        "method":"Unweighted logistic regression; fixed threshold 0.5; no tuning on validation or test",
        "split_method":"Disjoint student groups 60/20/20; train feature semesters 1/2, validation/test semester 3",
        "features":FEATURE_COLS,"data_sha256":data_hash,"data_audit":df.attrs.get("data_audit",{}),
        "split_ids":groups,"dependencies":{"python":platform.python_version(),"sklearn":sklearn.__version__,"pandas":pd.__version__,"numpy":np.__version__},
        "baseline_note":"Existing academic-risk formula on the feature term only, score/100, MEDIUM threshold 0.30. This heuristic is not a calibrated probability. Original internal-mark and login scales are preserved.",
        "limitations":["Synthetic outcomes are generated from synthetic academic profiles; no real-world validation.",
                        "Semester 4→5 inference extrapolates beyond the observed semester 3→4 evaluation.",
                        "Calibration bins describe this test set; no post-hoc calibration or causal claim.",
                        "Sensitive attributes and student IDs are excluded from model inputs; proxy bias remains possible."],"partitions":{}}
    for name,part in splits.items():
        report["partitions"][name] = {"rows":len(part),"students":int(part.student_id.nunique()),"positives":int(part.target.sum()),
            "model":metrics(part.target,model.predict_proba(part[FEATURE_COLS])[:,1]),
            "deterministic_baseline":metrics(part.target,baseline_scores(part),.3),
            "prevalence_baseline":metrics(part.target,np.repeat(train.target.mean(),len(part)))}
    metadata = {"model_type":"LogisticRegression","horizon":"t+1 semester","target":report["target"],"data_sha256":data_hash}
    artifact = {"model":model,"features":FEATURE_COLS,"version":"2.0.0","metadata":metadata,
                "background_mean":model.named_steps["scaler"].transform(train[FEATURE_COLS]).mean(axis=0),"report":report}
    output_path, report_path = Path(output_path), Path(report_path)
    output_path.parent.mkdir(parents=True,exist_ok=True)
    report_path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=output_path.parent, suffix=".joblib", delete=False) as temporary:
        temporary_path = Path(temporary.name)
    try:
        joblib.dump(artifact,temporary_path)
        os.replace(temporary_path,output_path)
    finally:
        temporary_path.unlink(missing_ok=True)
    report["artifact_sha256"] = hashlib.sha256(output_path.read_bytes()).hexdigest()
    report_path.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({"artifact":str(output_path),"report":str(report_path),"test":report["partitions"]["test"]},indent=2))
    return report


if __name__ == "__main__":
    train_and_evaluate()
