"""Seller role, WhatsApp inbox, lead appointments, app settings

Revision ID: a7c3e91f5b20
Revises: 186a2a31c03c
Create Date: 2026-10-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7c3e91f5b20'
down_revision: Union[str, Sequence[str], None] = '186a2a31c03c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ── users: teléfono y activar/desactivar cuenta ──────────────────────
    op.add_column('users', sa.Column('phone', sa.String(length=32), nullable=True))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))

    # ── ajustes globales ─────────────────────────────────────────────────
    op.create_table('app_settings',
    sa.Column('key', sa.String(length=100), nullable=False),
    sa.Column('value', sa.Text(), nullable=False),
    sa.PrimaryKeyConstraint('key')
    )

    # ── WhatsApp ─────────────────────────────────────────────────────────
    op.create_table('wa_conversations',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('phone', sa.String(length=32), nullable=False),
    sa.Column('contact_name', sa.String(length=255), nullable=True),
    sa.Column('ai_enabled', sa.Boolean(), nullable=False),
    sa.Column('stage', sa.String(length=50), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('assigned_to', sa.String(length=36), nullable=True),
    sa.Column('client_id', sa.String(length=36), nullable=True),
    sa.Column('last_message_text', sa.Text(), nullable=True),
    sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('unread_count', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
    sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wa_conversations_phone'), 'wa_conversations', ['phone'], unique=True)
    op.create_index(op.f('ix_wa_conversations_stage'), 'wa_conversations', ['stage'], unique=False)
    op.create_index(op.f('ix_wa_conversations_last_message_at'), 'wa_conversations', ['last_message_at'], unique=False)

    op.create_table('wa_messages',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('conversation_id', sa.String(length=36), nullable=False),
    sa.Column('direction', sa.String(length=10), nullable=False),
    sa.Column('sender', sa.String(length=20), nullable=False),
    sa.Column('agent_id', sa.String(length=36), nullable=True),
    sa.Column('text', sa.Text(), nullable=False),
    sa.Column('media_url', sa.String(length=1024), nullable=True),
    sa.Column('media_type', sa.String(length=50), nullable=True),
    sa.Column('wa_message_id', sa.String(length=255), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['agent_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['conversation_id'], ['wa_conversations.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wa_messages_conversation_id'), 'wa_messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_wa_messages_wa_message_id'), 'wa_messages', ['wa_message_id'], unique=False)
    op.create_index(op.f('ix_wa_messages_created_at'), 'wa_messages', ['created_at'], unique=False)

    # ── appointments: citas con leads (sin cuenta de cliente) ────────────
    # batch_alter_table para que también funcione en SQLite (dev)
    with op.batch_alter_table('appointments') as batch:
        batch.alter_column('client_id', existing_type=sa.String(length=36), nullable=True)
        batch.add_column(sa.Column('contact_name', sa.String(length=255), nullable=True))
        batch.add_column(sa.Column('contact_phone', sa.String(length=32), nullable=True))
        batch.add_column(sa.Column('conversation_id', sa.String(length=36), nullable=True))
        batch.add_column(sa.Column('created_by', sa.String(length=36), nullable=True))
        batch.create_foreign_key('fk_appointments_conversation_id', 'wa_conversations', ['conversation_id'], ['id'])
        batch.create_foreign_key('fk_appointments_created_by', 'users', ['created_by'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Las citas de leads no tienen cliente: no caben en el esquema anterior
    op.execute("DELETE FROM appointments WHERE client_id IS NULL")
    with op.batch_alter_table('appointments') as batch:
        batch.drop_constraint('fk_appointments_created_by', type_='foreignkey')
        batch.drop_constraint('fk_appointments_conversation_id', type_='foreignkey')
        batch.drop_column('created_by')
        batch.drop_column('conversation_id')
        batch.drop_column('contact_phone')
        batch.drop_column('contact_name')
        batch.alter_column('client_id', existing_type=sa.String(length=36), nullable=False)

    op.drop_index(op.f('ix_wa_messages_created_at'), table_name='wa_messages')
    op.drop_index(op.f('ix_wa_messages_wa_message_id'), table_name='wa_messages')
    op.drop_index(op.f('ix_wa_messages_conversation_id'), table_name='wa_messages')
    op.drop_table('wa_messages')
    op.drop_index(op.f('ix_wa_conversations_last_message_at'), table_name='wa_conversations')
    op.drop_index(op.f('ix_wa_conversations_stage'), table_name='wa_conversations')
    op.drop_index(op.f('ix_wa_conversations_phone'), table_name='wa_conversations')
    op.drop_table('wa_conversations')
    op.drop_table('app_settings')
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'phone')
