# Pitch outline

## 1. The problem

Student-support teams work across disconnected academic, attendance, learning, engagement, placement, skills, and feedback records. Reviewing those fragments makes it hard to see what changed and where staff follow-up may help.

## 2. The product

EduNex brings those signals into a cohort overview and Student 360 view, with transparent score drivers, descriptive trends, and a prioritized list for staff review.

## 3. The intervention loop

The prototype pairs reviewable support suggestions with explicit staff assignment, status changes, optimistic conflict checks, and an audit trail. It keeps the human action visible and records before/after observations only when data is available.

## 4. What the model evidence says

The fixed-seed, synthetic next-semester backlog model reports ROC-AUC 0.8735 on a student-disjoint test split. At its fixed threshold it detects 4 of 23 positive test outcomes (17.4% recall). The deterministic baseline has higher recall on this synthetic split. The model card explains the trade-off; these results are not evidence of institutional performance or causal benefit.

## 5. Why trust needs limits

The app explains data gaps, scopes the demo by role, and requires staff to act. The role picker is public, the data is synthetic, fairness has not been validated, and the Render Free database expires. The current build is a prototype, not a ready institutional system.

## 6. Next validation steps

Work with one institution under an approved governance process; validate definitions, security, subgroup performance, calibration, accessibility, and prospective outcomes before considering a pilot. Build durable backups and monitoring before any real-data deployment.
