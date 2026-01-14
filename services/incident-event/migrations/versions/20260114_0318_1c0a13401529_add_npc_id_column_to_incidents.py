"""Add npc_id column to incidents

Revision ID: 1c0a13401529
Revises: 
Create Date: 2026-01-14 03:18:05.640997+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1c0a13401529'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """마이그레이션 업그레이드"""
    # npc_id 컬럼만 추가 (다른 서비스의 테이블은 건드리지 않음)
    op.add_column('incidents', sa.Column('npc_id', postgresql.UUID(as_uuid=True), nullable=True))


def downgrade() -> None:
    """마이그레이션 다운그레이드"""
    # npc_id 컬럼만 제거
    op.drop_column('incidents', 'npc_id')
