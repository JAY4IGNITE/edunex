import pandas as pd
import numpy as np
import json
from datetime import datetime
from pydantic import ValidationError
from typing import Type, Any, Dict, List
from backend.app.schemas.canonical import ProvenanceMetadata

class IngestionPipeline:
    def __init__(self, dataset_id: str, provenance_info: dict):
        self.dataset_id = dataset_id
        self.provenance_info = provenance_info
        self.report = {
            "dataset_id": dataset_id,
            "run_time": str(datetime.now()),
            "domains": {}
        }

    def process_domain(self, domain_name: str, file_path: str, schema_model: Type[Any], unique_keys: List[str]):
        stats = {
            "records_processed": 0,
            "records_accepted": 0,
            "records_rejected": 0,
            "missing_values": 0,
            "duplicate_records": 0,
            "schema_errors": 0,
            "invalid_ranges": 0
        }
        
        try:
            df = pd.read_csv(file_path)
            stats["records_processed"] = len(df)
            
            # Missing values count (simple estimation)
            stats["missing_values"] = int(df.isnull().sum().sum())
            
            # Fill NaNs where appropriate, or let Pydantic handle validation failures
            # Using simple dict conversion
            records = df.replace({np.nan: None}).to_dict(orient="records")
            
            valid_records = []
            seen_keys = set()

            for rec in records:
                try:
                    # Schema validation
                    valid_obj = schema_model(**rec)
                    
                    # Temporal/Identity duplicate validation
                    key = tuple(getattr(valid_obj, k) for k in unique_keys)
                    if key in seen_keys:
                        stats["duplicate_records"] += 1
                        stats["records_rejected"] += 1
                        continue
                    seen_keys.add(key)
                    
                    valid_records.append(valid_obj.model_dump())
                    stats["records_accepted"] += 1
                except ValidationError as e:
                    stats["schema_errors"] += 1
                    stats["records_rejected"] += 1
                    # Could break down invalid ranges based on error type if needed
            
            self.report["domains"][domain_name] = stats
            return pd.DataFrame(valid_records)
            
        except Exception as e:
            self.report["domains"][domain_name] = {"error": str(e)}
            return pd.DataFrame()

    def save_quality_report(self, output_path: str):
        with open(output_path, 'w') as f:
            json.dump(self.report, f, indent=4)

    def record_provenance(self, output_path: str):
        prov = ProvenanceMetadata(**self.provenance_info)
        with open(output_path, 'w') as f:
            f.write(prov.model_dump_json(indent=4))
