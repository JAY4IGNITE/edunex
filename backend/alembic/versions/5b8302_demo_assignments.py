"""Synthetic staff caseload assignments."""
from alembic import op
import sqlalchemy as sa
revision = "5b8302"
down_revision = "4a7201"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("demo_assignments",sa.Column("id",sa.Integer(),primary_key=True),
        sa.Column("user_id",sa.String(80),nullable=False),
        sa.Column("student_id",sa.String(),sa.ForeignKey("students.student_id"),nullable=False),
        sa.UniqueConstraint("user_id","student_id",name="uq_demo_assignment"))
    op.create_index("ix_demo_assignments_user_id","demo_assignments",["user_id"])
    op.create_index("ix_demo_assignments_student_id","demo_assignments",["student_id"])


def downgrade():
    op.drop_table("demo_assignments")
