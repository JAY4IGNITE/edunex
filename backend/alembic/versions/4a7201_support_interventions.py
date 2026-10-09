"""Add audited intervention workflow without changing existing scoring tables."""
from alembic import op
import sqlalchemy as sa

revision = "4a7201"
down_revision = "3ec038198807"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("interventions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("students.student_id"), nullable=False),
        sa.Column("recommendation_key", sa.String(80), nullable=False),
        sa.Column("recommendation", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("assignee", sa.String(80)), sa.Column("due_date", sa.Date()),
        sa.Column("notes", sa.Text(), nullable=False), sa.Column("dismissal_reason", sa.Text()),
        sa.Column("before_snapshot", sa.JSON(), nullable=False), sa.Column("after_snapshot", sa.JSON()),
        sa.Column("outcome", sa.JSON()), sa.Column("active_key", sa.String(200), unique=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)), sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("status IN ('Recommended','Assigned','In Progress','Completed','Dismissed')", name="ck_intervention_status"))
    for field in ("student_id", "status", "assignee", "due_date"):
        op.create_index(f"ix_interventions_{field}", "interventions", [field])
    op.create_index("ix_intervention_status_due", "interventions", ["status", "due_date"])
    op.create_table("intervention_audit",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("intervention_id", sa.Integer(), sa.ForeignKey("interventions.id"), nullable=False),
        sa.Column("actor", sa.String(80), nullable=False), sa.Column("event", sa.String(30), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_intervention_audit_intervention_id", "intervention_audit", ["intervention_id"])


def downgrade():
    op.drop_table("intervention_audit")
    op.drop_table("interventions")
