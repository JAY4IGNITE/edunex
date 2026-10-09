from fastapi import APIRouter
from backend.app.ml.inference import _load_model

router = APIRouter()


@router.get("/model")
def model_report():
    try:
        artifact = _load_model()
    except (FileNotFoundError, ValueError, OSError, KeyError, TypeError):
        return {"status":"unavailable","reason":"No compatible trained artifact; inference uses the transparent baseline when data permits."}
    return {"status":"available", **{key:value for key,value in artifact["report"].items() if key != "split_ids"}}
