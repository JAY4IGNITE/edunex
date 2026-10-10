from backend.app.schemas.student_360 import Student360Response
from backend.app.services.support_analysis import (
    analyze_student,
    observed_outcome,
    priority_score,
)


def profile(**changes):
    data = dict(student=dict(student_id="DEMO1", department="CSE", year=2, semester=2,
                             section="A", academic_year="2025-2026"),
                academic_history=[dict(student_id="DEMO1", semester=1, academic_year="2024-2025",
                                       cgpa=7, internal_marks=45, backlogs=2),
                                  dict(student_id="DEMO1", semester=2, academic_year="2025-2026",
                                       cgpa=4, internal_marks=30, backlogs=4)],
                attendance_history=[dict(student_id="DEMO1", semester=2, academic_year="2025-2026",
                                         overall_attendance=61)])
    data.update(changes)
    return Student360Response(**data)


def test_missing_placement_does_not_suppress_academic_recommendations():
    result = analyze_student(profile())
    assert result["academic_risk"]["risk_level"] == "HIGH"
    assert result["placement_risk"] is None
    assert result["recommendations"]
    assert "61" in str(result["recommendations"])
    assert all("placement:" not in d for r in result["recommendations"] for d in r["driver_keys"])


def test_unavailable_signals_are_not_counted_as_risk():
    result = analyze_student(profile(academic_history=[], attendance_history=[]))
    assert result["driver_keys"] == []
    assert result["success_score"] is None
    assert priority_score(result, set())["priority"] == 0


def test_priority_decline_and_active_driver_coverage():
    result = analyze_student(profile())
    full = priority_score(result, set())
    covered = priority_score(result, set(result["driver_keys"]))
    assert full["decline_multiplier"] > 1
    assert full["priority"] > 0
    assert covered["priority"] == 0
    assert covered["unaddressed_drivers"] == 0


def test_completion_without_new_observations_has_no_measured_outcome():
    snapshot = analyze_student(profile())["snapshot"]
    assert observed_outcome(snapshot, snapshot)["score_change"] is None
    assert observed_outcome(snapshot, snapshot)["follow_up_available"] is False


def test_later_academic_year_is_used_even_with_lower_semester_number():
    value = profile()
    value.academic_history[0].semester = 4
    result = analyze_student(value)
    assert result["academic_risk"]["risk_level"] == "HIGH"
    cgpa = next(d for d in result["academic_risk"]["drivers"] if d["name"] == "cgpa")
    assert cgpa["normalized_value"] == 60


def test_historical_backfill_does_not_become_a_follow_up():
    from copy import deepcopy
    before = analyze_student(profile())["snapshot"]
    after = deepcopy(before)
    after["source_hash"] = "changed-by-backfill"
    after["observations"]["placement_information"] = "2001-01-01"
    after["success_score"] += 10
    assert observed_outcome(before, after)["follow_up_available"] is False
