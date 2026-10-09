"""Read-only support planning built on the existing deterministic explanations."""
import hashlib
import json
from datetime import datetime, timezone

from fastapi import HTTPException

from backend.app.core.segmentation_config import SegmentationConfig
from backend.app.services.explanation import ExplanationService

PROVENANCE = "Demonstration Institutional Dataset — synthetic, not real students"
PRIORITY_FORMULA = "max(available risk scores)/100 × (1 + max(0, previous CGPA − latest CGPA)/10) × unaddressed driver count"
ACTIVE_STATUSES = ("Assigned", "In Progress")
HISTORY_FIELDS = ("academic_history", "attendance_history", "lms_history", "engagement_history", "feedback_history")


def latest(records):
    return max(records, key=lambda r: (r.academic_year, r.semester)) if records else None


def segments_for(profile, academic, placement):
    """Same segment rules as the existing service, without reads or writes."""
    a, p = (academic or {}).get("risk_level"), (placement or {}).get("risk_level")
    engagement = SegmentationConfig.classify_engagement(profile)
    conditions = {
        "HIGH_ACADEMIC_LOW_PLACEMENT": a == "LOW" and p == "HIGH",
        "LOW_ACADEMIC_HIGH_PLACEMENT": a == "HIGH" and p == "LOW",
        "HIGH_ENGAGEMENT_LOW_ACADEMIC": engagement == "HIGH" and a == "HIGH",
        "LOW_ENGAGEMENT_LOW_ACADEMIC": engagement == "LOW" and a == "HIGH",
        "HIGH_ACADEMIC_HIGH_PLACEMENT": a == "LOW" and p == "LOW",
        "LOW_ACADEMIC_LOW_PLACEMENT": a == "HIGH" and p == "HIGH",
    }
    return sorted((key for key, matches in conditions.items() if matches),
                  key=lambda key: SegmentationConfig.SEGMENTS[key]["priority"])


def _optional(calculation, profile):
    try:
        return calculation(profile).model_dump(mode="json")
    except HTTPException as exc:
        if exc.status_code != 400:
            raise
        return None


def _evidence(profile):
    academic, attendance, lms = (latest(getattr(profile, name)) for name in HISTORY_FIELDS[:3])
    placement = max(profile.placement_information, key=lambda r: r.assessment_date, default=None)
    skills = max(profile.skills_information, key=lambda r: r.assessment_date, default=None)
    evidence = {}
    for record, fields in [(academic, ("cgpa", "internal_marks", "backlogs", "subject_performance")),
                           (attendance, ("overall_attendance",)),
                           (lms, ("login_frequency", "assignment_completion")),
                           (placement, ("aptitude_score", "coding_score", "mock_interview_score", "placement_participation")),
                           (skills, ("technical_skill_score", "soft_skill_score"))]:
        if record:
            evidence.update({field: getattr(record, field) for field in fields})
    return evidence


def _recommendations(profile, academic, placement, success):
    evidence = _evidence(profile)
    result = []
    for kind, risk in (("academic", academic), ("placement", placement)):
        if not risk:
            continue
        drivers = [d for d in risk["drivers"] if d["status"] == "available" and not d["excluded_from_calculation"]]
        # MEDIUM can occur with no individual signal over the driver threshold.
        if not drivers and risk["risk_level"] in ("MEDIUM", "HIGH"):
            drivers = sorted(risk["protective_indicators"], key=lambda d: d["risk_contribution"], reverse=True)[:1]
        if not drivers:
            continue
        groups = [("learning-support", "Enroll in remedial learning or peer tutoring", "Faculty",
                   {"cgpa", "internal_marks", "backlogs", "subject_performance"}),
                  ("mentor-check-in", "Schedule a mentor check-in within 7 days and agree an attendance/LMS plan", "Mentor",
                   {"attendance", "lms_activity", "assignment_completion"})] if kind == "academic" else [
                      ("career-readiness", "Arrange coding/aptitude practice and a mock-interview slot", "Placement Officer",
                       {d["name"] for d in drivers})]
        # Low attendance is relevant supporting evidence even below the driver threshold.
        for key, action, owner, names in groups:
            matched = [d for d in drivers if d["name"] in names]
            if not matched:
                continue
            rationale = "; ".join(f"{d['name'].replace('_', ' ')} normalized risk {d['normalized_value']:.1f}/100, weighted contribution {d['risk_contribution']:.2f}" for d in matched)
            raw_fields = ("cgpa", "internal_marks", "backlogs", "subject_performance", "overall_attendance", "login_frequency", "assignment_completion") if kind == "academic" else ("aptitude_score", "coding_score", "mock_interview_score", "placement_participation", "technical_skill_score", "soft_skill_score")
            raw = {name: evidence[name] for name in raw_fields if evidence.get(name) is not None}
            result.append(dict(key=key, risk_type=kind, action=action, rationale=rationale,
                               evidence=raw, driver_keys=[f"{kind}:{d['name']}" for d in matched],
                               owner_role=owner, urgency="High" if risk["risk_level"] == "HIGH" else "Medium",
                               suggested_days=7 if risk["risk_level"] == "HIGH" else 14,
                               expected_impact="May support progress in these areas; no causal or numerical improvement is guaranteed."))
    domain_scores = {c["name"]: c["normalized_value"] for c in (success or {}).get("contributors", []) if c["status"] == "available"}
    if domain_scores.get("engagement", 100) < 50 and domain_scores.get("feedback", 100) < 50:
        result.append(dict(key="wellbeing-conversation", risk_type="engagement", action="Offer a private counselor wellbeing conversation",
                           rationale="Low engagement and feedback suggest asking about support needs; this is not a mental-health diagnosis.",
                           evidence={name: domain_scores[name] for name in ("engagement", "feedback")},
                           driver_keys=["engagement:engagement", "engagement:feedback"], owner_role="Counselor", urgency="Medium",
                           suggested_days=7, expected_impact="May help identify appropriate voluntary support; no outcome is guaranteed."))
    return result


def analyze_student(profile):
    # Canonical ordering makes ties deterministic without changing any scoring weight.
    profile = profile.model_copy(deep=True)
    for name in HISTORY_FIELDS:
        setattr(profile, name, sorted(getattr(profile, name), key=lambda r: (r.academic_year, r.semester), reverse=True))
    service = ExplanationService(None)
    success = _optional(service._explain_success_score, profile)
    academic = _optional(service._explain_academic_risk, profile)
    placement = _optional(service._explain_placement_risk, profile)
    recommendations = _recommendations(profile, academic, placement, success)
    history = sorted(profile.academic_history, key=lambda r: (r.academic_year, r.semester))
    decline = max(0, history[-2].cgpa - history[-1].cgpa) if len(history) >= 2 else 0
    observations = {}
    for name in HISTORY_FIELDS:
        record = latest(getattr(profile, name))
        observations[name] = f"{record.academic_year}:{record.semester:02}" if record else None
    for name in ("placement_information", "skills_information"):
        observations[name] = max((r.assessment_date.isoformat() for r in getattr(profile, name)), default=None)
    raw = profile.model_dump(mode="json")
    snapshot = dict(captured_at=datetime.now(timezone.utc).isoformat(),
                    success_score=success["score"] if success else None,
                    academic_risk=academic["score"] if academic else None,
                    placement_risk=placement["score"] if placement else None,
                    observations=observations, source=raw,
                    source_hash=hashlib.sha256(json.dumps(raw, sort_keys=True).encode()).hexdigest())
    return dict(student=raw["student"], success_score=success, academic_risk=academic,
                placement_risk=placement, segments=segments_for(profile, academic, placement),
                recommendations=recommendations, driver_keys=sorted({d for r in recommendations for d in r["driver_keys"]}),
                cgpa_decline=round(decline, 4), trend_available=len(history) >= 2, snapshot=snapshot, provenance=PROVENANCE)


def priority_score(analysis, addressed):
    scores = [analysis[k]["score"] for k in ("academic_risk", "placement_risk") if analysis[k] is not None]
    severity = max(scores, default=0) / 100
    unaddressed = len(set(analysis["driver_keys"]) - addressed)
    multiplier = 1 + analysis["cgpa_decline"] / 10
    return dict(priority=round(severity * multiplier * unaddressed, 4), severity=round(severity, 4),
                decline_multiplier=round(multiplier, 4), unaddressed_drivers=unaddressed,
                trend_available=analysis["trend_available"], formula=PRIORITY_FORMULA)


def observed_outcome(before, after):
    # A newly populated domain may be historical backfill. Require a later
    # observation in an already measured domain before describing a change.
    new_observations = any(value is not None and before["observations"].get(key) is not None and value > before["observations"][key]
                           for key, value in after["observations"].items())
    available = new_observations and before["source_hash"] != after["source_hash"]
    scores = before.get("success_score"), after.get("success_score")
    delta = round(scores[1] - scores[0], 2) if available and all(s is not None for s in scores) else None
    return dict(follow_up_available=available, score_change=delta,
                note="Observed synthetic score change, not a causal intervention effect." if available else "No later assessment recorded; outcome unavailable.")
