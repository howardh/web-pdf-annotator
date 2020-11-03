"""Initial migration

Revision ID: dc241a7b17e6
Revises: 
Create Date: 2020-11-01 21:34:13.114548

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dc241a7b17e6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('roles',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=True),
    sa.Column('description', sa.String(length=255), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(), nullable=True),
    sa.Column('password', sa.LargeBinary(), nullable=True),
    sa.Column('verified_email', sa.Boolean(), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=True),
    sa.Column('confirmed_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('documents',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('url', sa.String(), nullable=True),
    sa.Column('hash', sa.String(), nullable=True),
    sa.Column('title', sa.String(), nullable=True),
    sa.Column('author', sa.String(), nullable=True),
    sa.Column('bibtex', sa.String(), nullable=True),
    sa.Column('deleted_at', sa.Date(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('email_confirmation_codes',
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('code', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('code')
    )
    op.create_table('roles_users',
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('role_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], )
    )
    op.create_table('tags',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('deleted_at', sa.Date(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('annotations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('doc_id', sa.Integer(), nullable=True),
    sa.Column('page', sa.String(), nullable=True),
    sa.Column('type', sa.String(), nullable=True),
    sa.Column('blob', sa.String(), nullable=True),
    sa.Column('parser', sa.String(), nullable=True),
    sa.Column('position', sa.String(), nullable=True),
    sa.Column('deleted_at', sa.Date(), nullable=True),
    sa.ForeignKeyConstraint(['doc_id'], ['documents.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('document_access_codes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('document_id', sa.Integer(), nullable=True),
    sa.Column('allow_read', sa.Boolean(), nullable=True),
    sa.Column('allow_write', sa.Boolean(), nullable=True),
    sa.Column('code', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('documents_tags',
    sa.Column('document_id', sa.Integer(), nullable=True),
    sa.Column('tag_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
    sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], )
    )
    op.create_table('annotations_tags',
    sa.Column('annotation_id', sa.Integer(), nullable=True),
    sa.Column('tag_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['annotation_id'], ['annotations.id'], ),
    sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], )
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('annotations_tags')
    op.drop_table('documents_tags')
    op.drop_table('document_access_codes')
    op.drop_table('annotations')
    op.drop_table('tags')
    op.drop_table('roles_users')
    op.drop_table('email_confirmation_codes')
    op.drop_table('documents')
    op.drop_table('users')
    op.drop_table('roles')
    # ### end Alembic commands ###