import os
import json
import random
import numpy as np
import pandas as pd
from datetime import date, timedelta

# Set fixed seed
np.random.seed(42)
random.seed(42)

NUM_STUDENTS = 1000
SEMESTERS_PER_STUDENT = 4
ACADEMIC_YEARS = ["2023-2024", "2024-2025"]  # 2 sems per year

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../data/demo/generated")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_students():
    students = []
    profiles = ["A", "B", "C", "D", "E", "F"]
    departments = ["Computer Science", "Information Technology", "Electronics"]
    
    for i in range(1, NUM_STUDENTS + 1):
        profile = random.choice(profiles)
        student_id = f"STU{i:04d}"
        students.append({
            "student_id": student_id,
            "department": random.choice(departments),
            "year": 2,  # Suppose they are in 2nd year (completed 4 sems)
            "semester": 4,
            "section": random.choice(["A", "B", "C"]),
            "academic_year": ACADEMIC_YEARS[-1],
            "profile_type": profile # For generation correlation, won't be in canonical DB unless needed
        })
    return pd.DataFrame(students)

def generate_records(students_df):
    academic_records = []
    attendance_records = []
    lms_records = []
    engagement_records = []
    placement_records = []
    skill_records = []
    feedback_records = []

    for _, student in students_df.iterrows():
        sid = student["student_id"]
        profile = student["profile_type"]

        # Base attributes based on profile
        if profile == "A":  # High academic + high placement
            base_cgpa = np.random.normal(9.0, 0.5)
            base_att = np.random.normal(90, 5)
            base_engage = np.random.poisson(5)
            base_place = np.random.normal(85, 5)
        elif profile == "B":  # High academic + low placement
            base_cgpa = np.random.normal(8.8, 0.5)
            base_att = np.random.normal(88, 5)
            base_engage = np.random.poisson(2)
            base_place = np.random.normal(55, 10)
        elif profile == "C":  # Low academic + high placement
            base_cgpa = np.random.normal(6.5, 0.5)
            base_att = np.random.normal(70, 10)
            base_engage = np.random.poisson(6)
            base_place = np.random.normal(80, 5)
        elif profile == "D":  # Low academic + low placement
            base_cgpa = np.random.normal(5.5, 0.8)
            base_att = np.random.normal(60, 10)
            base_engage = np.random.poisson(1)
            base_place = np.random.normal(40, 10)
        elif profile == "E":  # High engagement + moderate academics
            base_cgpa = np.random.normal(7.5, 0.5)
            base_att = np.random.normal(80, 5)
            base_engage = np.random.poisson(8)
            base_place = np.random.normal(75, 5)
        else: # F: Low engagement + academic risk
            base_cgpa = np.random.normal(5.0, 1.0)
            base_att = np.random.normal(55, 15)
            base_engage = np.random.poisson(0)
            base_place = np.random.normal(45, 10)

        # Clip base attributes
        base_cgpa = np.clip(base_cgpa, 0, 10)
        base_att = np.clip(base_att, 0, 100)
        base_place = np.clip(base_place, 0, 100)

        # Generate semester records
        for sem in range(1, SEMESTERS_PER_STUDENT + 1):
            ay = ACADEMIC_YEARS[0] if sem <= 2 else ACADEMIC_YEARS[1]
            
            # Add some noise per semester
            cgpa = np.clip(np.random.normal(base_cgpa, 0.3), 0, 10)
            internal = np.clip(cgpa * 5 + np.random.normal(0, 5), 0, 50)
            backlogs = np.random.poisson(0.5) if cgpa < 6 else 0
            
            academic_records.append({
                "student_id": sid, "semester": sem, "academic_year": ay,
                "cgpa": round(cgpa, 2), "internal_marks": round(internal, 2),
                "backlogs": backlogs
            })

            att = np.clip(np.random.normal(base_att, 3), 0, 100)
            attendance_records.append({
                "student_id": sid, "semester": sem, "academic_year": ay,
                "overall_attendance": round(att, 2)
            })

            lms_login = np.clip(att / 10.0 + np.random.normal(0, 1), 0, 10)
            lms_assign = np.clip(att + np.random.normal(0, 5), 0, 100)
            lms_records.append({
                "student_id": sid, "semester": sem, "academic_year": ay,
                "login_frequency": round(lms_login, 2), "assignment_completion": round(lms_assign, 2)
            })

            eng = np.random.poisson(base_engage / 4.0)
            engagement_records.append({
                "student_id": sid, "semester": sem, "academic_year": ay,
                "events_count": eng, "clubs_count": 1 if eng > 2 else 0,
                "hackathons_count": 1 if eng > 3 else 0, "certifications_count": 1 if eng > 4 else 0
            })

            sat = np.clip((cgpa / 2) + np.random.normal(0, 0.5), 0, 5)
            feedback_records.append({
                "student_id": sid, "semester": sem, "academic_year": ay,
                "student_satisfaction": round(sat, 1)
            })

        # Single records per student for placement and skills
        p_date = date(2025, 3, 15)
        apt = np.clip(np.random.normal(base_place, 5), 0, 100)
        code = np.clip(np.random.normal(base_place, 8), 0, 100)
        mock = np.clip(np.random.normal(base_place, 6), 0, 100)
        participated = True if base_place > 30 else False
        
        placement_records.append({
            "student_id": sid, "assessment_date": str(p_date),
            "aptitude_score": round(apt, 2), "coding_score": round(code, 2),
            "mock_interview_score": round(mock, 2), "placement_participation": participated
        })

        tech = np.clip(np.random.normal(base_place, 7), 0, 100)
        soft = np.clip(np.random.normal(base_place + 5, 7), 0, 100)
        skill_records.append({
            "student_id": sid, "assessment_date": str(p_date),
            "technical_skill_score": round(tech, 2), "soft_skill_score": round(soft, 2)
        })

    # Export to CSV
    students_df.drop(columns=["profile_type"]).to_csv(f"{OUTPUT_DIR}/students.csv", index=False)
    pd.DataFrame(academic_records).to_csv(f"{OUTPUT_DIR}/academic_records.csv", index=False)
    pd.DataFrame(attendance_records).to_csv(f"{OUTPUT_DIR}/attendance_records.csv", index=False)
    pd.DataFrame(lms_records).to_csv(f"{OUTPUT_DIR}/lms_records.csv", index=False)
    pd.DataFrame(engagement_records).to_csv(f"{OUTPUT_DIR}/engagement_records.csv", index=False)
    pd.DataFrame(placement_records).to_csv(f"{OUTPUT_DIR}/placement_records.csv", index=False)
    pd.DataFrame(skill_records).to_csv(f"{OUTPUT_DIR}/skill_records.csv", index=False)
    pd.DataFrame(feedback_records).to_csv(f"{OUTPUT_DIR}/feedback_records.csv", index=False)
    print(f"Generated {NUM_STUDENTS} students and associated records in {OUTPUT_DIR}")

if __name__ == "__main__":
    df = generate_students()
    generate_records(df)
