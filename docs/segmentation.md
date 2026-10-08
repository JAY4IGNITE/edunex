# Student Segmentation (Phase 10)

## Purpose
The Student Segmentation capability intelligently groups the entire student population into transparent analytical cohorts. It supports administrators by moving beyond individual score ranking toward actionable demographic segments (e.g., highly engaged students who are failing academically, or top academic students struggling with placement readiness).

**Disclaimer:** Segment definitions are configurable analytical cohorts. They are not institutional policy classifications and do not constitute absolute predictions of a student's future.

## Available Segments
The system dynamically computes six mutually-exclusive primary analytical groups:

1. **High Academic, Low Placement Readiness** (`HIGH_ACADEMIC_LOW_PLACEMENT`)
2. **Low Academic, High Placement Readiness** (`LOW_ACADEMIC_HIGH_PLACEMENT`)
3. **High Engagement, Low Academic** (`HIGH_ENGAGEMENT_LOW_ACADEMIC`)
4. **Low Engagement, Low Academic** (`LOW_ENGAGEMENT_LOW_ACADEMIC`)
5. **High Academic, High Placement Readiness** (`HIGH_ACADEMIC_HIGH_PLACEMENT`)
6. **Low Academic, Low Placement Readiness** (`LOW_ACADEMIC_LOW_PLACEMENT`)

## Classification Methodology
Segmentation is mathematically derived from existing analytical layers, explicitly preserving logic consistency:

- **Academic Classification:** Direct mapping from the Academic Risk engine. 
  - `HIGH ACADEMIC` = "LOW" Academic Risk
  - `LOW ACADEMIC` = "HIGH" Academic Risk
- **Placement Classification:** Direct mapping from the Placement Risk engine.
  - `HIGH READINESS` = "LOW" Placement Risk
  - `LOW READINESS` = "HIGH" Placement Risk
- **Engagement Classification:** Computed dynamically as an index sum of canonical metrics (`events_count + clubs_count + hackathons_count + certifications_count`).
  - `>= 5` = "HIGH" Engagement
  - `<= 2` = "LOW" Engagement

## Missing-Data Handling
If a student lacks sufficient data in a specific domain (e.g., no placement record), they are assigned a classification of `UNAVAILABLE` for that domain.

Crucially, **missing data is NOT equivalent to poor performance.** An `UNAVAILABLE` placement classification mathematically excludes the student from all `HIGH_PLACEMENT` or `LOW_PLACEMENT` segments, preventing falsely labeling them.

## Overlap & Priority
Students often qualify for multiple theoretical groups (e.g. low academic, low placement, low engagement). To present a mutually-exclusive `primary_segment`, the algorithm resolves overlap deterministically using configured priority rankings defined centrally in `SegmentationConfig`. Any additional qualified groupings are preserved as `secondary_segments`.

## Dynamic Execution
Segment groupings and sub-statistics (e.g., Average Placement Risk among the `HIGH_ACADEMIC_LOW_PLACEMENT` population) are calculated iteratively at API call-time. Every statistic generated is directly traceable to real-time `Student360` profiles. No generic averages or LLM assumptions are injected.
