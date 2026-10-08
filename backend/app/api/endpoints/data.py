from fastapi import APIRouter, HTTPException
import json
import yaml
from pathlib import Path

router = APIRouter()

DATA_DIR = Path("c:/Users/ramuv/CampusPulse_AI_Phases_0_1/data")

@router.get("/sources", summary="Get Data Sources Mapping")
def get_data_sources():
    """Returns the source mapping configuration."""
    source_file = DATA_DIR / "metadata" / "source_mapping.yaml"
    if not source_file.exists():
        raise HTTPException(status_code=404, detail="Sources mapping not found")
    with open(source_file, "r") as f:
        return yaml.safe_load(f)

@router.get("/quality", summary="Get Data Quality Report")
def get_data_quality():
    """Returns the data quality ingestion report."""
    quality_file = DATA_DIR / "processed" / "quality_report.json"
    if not quality_file.exists():
        raise HTTPException(status_code=404, detail="Quality report not found")
    with open(quality_file, "r") as f:
        return json.load(f)

@router.get("/provenance", summary="Get Data Provenance")
def get_data_provenance():
    """Returns the dataset provenance information."""
    provenance_file = DATA_DIR / "processed" / "provenance.json"
    if not provenance_file.exists():
        raise HTTPException(status_code=404, detail="Provenance not found")
    with open(provenance_file, "r") as f:
        return json.load(f)

@router.get("/schema", summary="Get Data Schema Registry")
def get_data_schema():
    """Returns the canonical dataset schema registry."""
    schema_file = DATA_DIR / "metadata" / "dataset_registry.yaml"
    if not schema_file.exists():
        raise HTTPException(status_code=404, detail="Schema registry not found")
    with open(schema_file, "r") as f:
        return yaml.safe_load(f)
