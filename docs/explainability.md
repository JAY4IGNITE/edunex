# Explainability (Phase 9)

## Purpose
The Explainability layer provides a transparent, deterministic, and highly structured readout that identifies exactly *why* a student received a particular Success Score, Academic Risk, or Placement Risk. It satisfies the bonus requirement of the KPMG Challenge by explicitly surfacing indicators contributing to outcomes.

**Disclaimer:** The explanations are derived from deterministic analytical calculations and configured indicators. They are not causal explanations and should not be interpreted as guaranteed predictions of future student outcomes or AI-generated diagnostics.

## Supported Analytical Models
The explanation API fully reconciles:
1. **Student Success Score** (Phase 6)
2. **Academic Risk** (Phase 7)
3. **Placement Risk** (Phase 8)

## Why No LLM?
Large Language Models (LLMs) are explicitly prohibited from generating numeric explanations here because they:
- Hallucinate weights
- Confabulate reasoning for complex algebraic steps
- Prevent exact numerical reconciliation
- Violate determinism

Instead, the Explainability API uses mathematical interrogation to read the identical service logic used to generate the score, guaranteeing 100% audibility.

## Explanation Methodology

### 1. Contribution Formula
For each individual domain (or risk signal), the true component impact is calculated dynamically as:
```
Effective Weight = Configured Signal Weight / Sum(Configured Weights of Available Signals)

Contribution = Normalized Signal * Effective Weight
```
This formula proves mathematically that:
`Final Score = Sum(Contributions of all available domains)`

### 2. Success Score Explanation
- Exposes raw observed canonical values, normalized domain scores, and dynamically re-calculated effective weights.
- Contributors are tagged as `positive` (high contribution) or `negative` (low contribution).
- **Ranking:** Contributors are sorted descending by their contribution to highlight what drives success.

### 3. Academic & Placement Risk Explanation
- Positively inverted signals (e.g., high CGPA -> low risk) are fully unpacked.
- The total risk score mathematically reconciles with the sum of `risk_contribution` for all available dimensions.
- **Drivers vs Protective Indicators:** 
  - Signals contributing disproportionately to risk (`> average weight contribution`) are tagged as **Drivers**.
  - Signals actively mitigating risk (`< average weight contribution`) are tagged as **Protective Indicators**.
- Drivers are sorted descending (highest risk originators first). Protective indicators are sorted ascending (strongest protections first).

### 4. Missing-Data Handling and Weight Renormalization
If a student is missing canonical data (e.g., Feedback):
- It is explicitly returned with `status: "unavailable"`.
- It explicitly denotes `excluded_from_calculation: true`.
- Its `effective_weight` becomes 0.
- The remaining weights dynamically scale up (`effective_weight` > `configured_weight`), satisfying transparency over missing-data handling.

### 5. Temporal Handling
The Explainability endpoint persists the exact `assessment_period` (Academic Risk) and `assessment_metadata` (Placement Risk) dynamically evaluated during the scoring cycle, ensuring users understand *when* the indicators occurred.

## Responsible Interpretation
The language used in the API aligns with decision-support parameters:
- **Allowed:** "High academic risk based on configured indicators."
- **Disallowed:** "This student will fail" or "AI has determined this student is unsuccessful."
This API explicitly serves as a deterministic breakdown of quantitative behavior, empowering administrators to investigate variables rather than blindly trusting an opaque score.
