"""Seed deterministic synthetic mentor and counselor caseloads."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import insert as pg_insert

revision = "6c9403"
down_revision = "5b8302"
branch_labels = None
depends_on = None


def upgrade():
    bind=op.get_bind()
    students=sa.table("students",sa.column("student_id",sa.String()))
    assignments=sa.table("demo_assignments",sa.column("user_id",sa.String()),sa.column("student_id",sa.String()))
    ids=[row[0] for row in bind.execute(sa.select(students.c.student_id).order_by(students.c.student_id)).all()]
    split=len(ids)//2
    rows=[{"user_id":"mentor-demo","student_id":sid} for sid in ids[:split]]
    rows += [{"user_id":"counselor-demo","student_id":sid} for sid in ids[split:]]
    if rows:
        bind.execute(pg_insert(assignments).values(rows).on_conflict_do_nothing(
            index_elements=[assignments.c.user_id,assignments.c.student_id]))


def downgrade():
    op.execute("DELETE FROM demo_assignments WHERE user_id IN ('mentor-demo','counselor-demo')")
