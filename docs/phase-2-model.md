# Phase 2 evidence

Replaced shared validation/test evaluation with reproducible disjoint student groups and forward-semester targets. Added version-2 artifact/report, exact additive logistic explanations, explicit baseline fallback, model evidence API/page, and a model card with measured limitations. Original v1 artifact remains untouched by the new trainer. Tests now train into temporary paths.

Changed: `backend/app/ml/features/temporal_aggregator.py`, `train_academic_risk.py`, `inference.py`, `explainability.py`, `services/ml_prediction_service.py`, `api/endpoints/model.py`, `scripts/train_model.py`, `reports/model-metrics.json`, `MODEL_CARD.md`; frontend Model page, Student 360 model panel, types/navigation and tests.

Verified: 22 ML/backend tests; 50 frontend tests; production build; `/model` displays the artifact's measured 0.8735 test ROC-AUC and fits desktop/390px layouts. Repeated training produces identical reports/artifact hashes in the recorded environment. No claimed accuracy number is manually invented.

From repository root:

```powershell
.\.venv\Scripts\python.exe scripts/train_model.py
.\.venv\Scripts\python.exe -m pytest backend/tests/test_model_protocol.py backend/tests/test_ml.py -q --basetemp=.phase-work/pytest-model-final
npm test --prefix frontend
npm run build --prefix frontend
```

Local evidence: `http://127.0.0.1:5175/model`, API `http://127.0.0.1:8012/api/model`. Remaining limitations: synthetic-only evaluation; 17.4% recall at the fixed threshold; unvalidated semester-5 extrapolation; sparse high-probability calibration bins. Model predictions cannot replace staff review or establish causal effects. Authentication and role scope follow in Phase 3.
