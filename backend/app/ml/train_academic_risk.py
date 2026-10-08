import os
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score, confusion_matrix
from backend.app.core.database import SessionLocal
from backend.app.ml.features.temporal_aggregator import build_temporal_dataset

FEATURE_COLS = [
    "cgpa", "internal_marks", "backlogs",
    "overall_attendance", "login_frequency", "assignment_completion",
    "events_count", "clubs_count", "hackathons_count", "certifications_count",
    "student_satisfaction"
]

def train_and_evaluate():
    print("Connecting to database and building temporal dataset...")
    db = SessionLocal()
    try:
        df = build_temporal_dataset(db)
    finally:
        db.close()
        
    if df.empty:
        print("Dataset is empty. Cannot train.")
        return

    print(f"Total temporal examples: {len(df)}")
    
    # ---------------------------------------------------------
    # STRICT TEMPORAL SPLIT
    # Train: semester 1 and 2 (predicting 2 and 3)
    # Val/Test: semester 3 (predicting 4)
    # ---------------------------------------------------------
    train_df = df[df["semester"].isin([1, 2])]
    val_df = df[df["semester"] == 3]
    
    print(f"Training examples (Sem 1, 2): {len(train_df)}")
    print(f"Validation examples (Sem 3): {len(val_df)}")
    
    X_train, y_train = train_df[FEATURE_COLS], train_df["target"]
    X_val, y_val = val_df[FEATURE_COLS], val_df["target"]
    
    print(f"Target distribution (Train): {y_train.value_counts().to_dict()}")
    print(f"Target distribution (Val): {y_val.value_counts().to_dict()}")

    # ---------------------------------------------------------
    # BASELINE MODEL: Logistic Regression
    # ---------------------------------------------------------
    lr_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(class_weight="balanced", random_state=42))
    ])
    
    lr_pipeline.fit(X_train, y_train)
    lr_preds = lr_pipeline.predict(X_val)
    lr_probs = lr_pipeline.predict_proba(X_val)[:, 1]
    
    print("\n--- BASELINE: Logistic Regression ---")
    print(f"ROC-AUC: {roc_auc_score(y_val, lr_probs):.4f}")
    print(f"Precision: {precision_score(y_val, lr_preds):.4f}")
    print(f"Recall: {recall_score(y_val, lr_preds):.4f}")
    print(f"F1-Score: {f1_score(y_val, lr_preds):.4f}")
    print(f"Confusion Matrix:\n{confusion_matrix(y_val, lr_preds)}")

    # ---------------------------------------------------------
    # PRIMARY MODEL: Random Forest
    # ---------------------------------------------------------
    rf_pipeline = Pipeline([
        # RF doesn't strictly need scaling, but it doesn't hurt and keeps the pipeline signature standard
        ("rf", RandomForestClassifier(n_estimators=100, max_depth=6, class_weight="balanced", random_state=42))
    ])
    
    rf_pipeline.fit(X_train, y_train)
    rf_preds = rf_pipeline.predict(X_val)
    rf_probs = rf_pipeline.predict_proba(X_val)[:, 1]
    
    print("\n--- PRIMARY: Random Forest ---")
    print(f"ROC-AUC: {roc_auc_score(y_val, rf_probs):.4f}")
    print(f"Precision: {precision_score(y_val, rf_preds):.4f}")
    print(f"Recall: {recall_score(y_val, rf_preds):.4f}")
    print(f"F1-Score: {f1_score(y_val, rf_preds):.4f}")
    print(f"Confusion Matrix:\n{confusion_matrix(y_val, rf_preds)}")

    # ---------------------------------------------------------
    # MODEL SELECTION
    # Preference: Recall, then F1, then ROC-AUC
    # ---------------------------------------------------------
    lr_f1 = f1_score(y_val, lr_preds)
    rf_f1 = f1_score(y_val, rf_preds)
    
    selected_model = rf_pipeline if rf_f1 >= lr_f1 else lr_pipeline
    model_name = "RandomForest" if rf_f1 >= lr_f1 else "LogisticRegression"
    
    print(f"\nSelected Model: {model_name}")
    
    # ---------------------------------------------------------
    # SERIALIZATION
    # ---------------------------------------------------------
    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)
    
    artifact_path = os.path.join(model_dir, "academic_risk_model.joblib")
    
    artifact = {
        "model": selected_model,
        "features": FEATURE_COLS,
        "version": "1.0.0",
        "metadata": {
            "model_type": model_name,
            "horizon": "t+1 semester",
            "target": "backlogs > 0"
        }
    }
    
    joblib.dump(artifact, artifact_path)
    print(f"Model serialized to {artifact_path}")

if __name__ == "__main__":
    train_and_evaluate()
