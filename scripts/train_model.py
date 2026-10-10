"""Run from the repository root; defaults to committed canonical synthetic CSVs."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.app.ml.features.temporal_aggregator import build_csv_dataset
from backend.app.ml.train_academic_risk import (
    MODEL_PATH,
    REPORT_PATH,
    train_and_evaluate,
)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",type=Path,default=MODEL_PATH)
    parser.add_argument("--report",type=Path,default=REPORT_PATH)
    parser.add_argument("--data",type=Path,default=Path(__file__).resolve().parents[1]/"data"/"processed")
    args = parser.parse_args()
    train_and_evaluate(args.output,args.report,build_csv_dataset(args.data))
