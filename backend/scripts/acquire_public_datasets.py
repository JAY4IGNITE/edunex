
def acquire_oulad():
    print("--- OULAD ACQUISITION ---")
    print("1. Download the dataset from: https://analyse.kmi.open.ac.uk/open_dataset")
    print("2. Extract the ZIP file.")
    print("3. Place 'studentInfo.csv' and 'studentVle.csv' in 'data/raw/oulad/'")
    print("\nVerified Mapped Fields:")
    print("- studentInfo.csv -> id_student (Canonical: student_id, prefixed with 'OULAD:')")
    print("- studentInfo.csv -> final_result (Canonical: mapped to academic_risk)")
    print("- studentVle.csv -> sum_click (Canonical: login_frequency / LMS activity)")
    print("\nIMPORTANT: Do not merge with campuspulse_demo students. Do not invent missing domains (Placement, etc).")

def acquire_uci_dropout():
    print("\n--- UCI DROPOUT ACQUISITION ---")
    print("1. Download from UCI Machine Learning Repository (DOI: 10.5281/zenodo.5777339)")
    print("2. Extract and place 'data.csv' in 'data/raw/uci/'")
    print("\nVerified Mapped Fields:")
    print("- data.csv -> Curricular units 1st sem (evaluations, approved, grade)")
    print("- data.csv -> Curricular units 2nd sem (evaluations, approved, grade)")
    print("- data.csv -> Target (Dropout, Enrolled, Graduate)")
    print("\nIMPORTANT: Only use for academic-risk model validation. Do not generate fake placement data for these students.")

if __name__ == "__main__":
    acquire_oulad()
    acquire_uci_dropout()
