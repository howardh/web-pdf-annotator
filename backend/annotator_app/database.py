from flask_security import current_user

import sqlalchemy
from sqlalchemy import create_engine, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.associationproxy import AssociationProxy, association_proxy

from sqlalchemy import Column, Integer, String, Float, Date, Time, DateTime, Boolean, Enum, LargeBinary, Text

from flask_security import Security, SQLAlchemyUserDatastore, \
    UserMixin, RoleMixin, login_required

import json
import enum
import datetime
import os

from annotator_app.extensions import db

class ModelMixin(object):
    def to_dict(self):
        return {}
    def update(self, data):
        for k,v in data.items():
            if v is None:
                self.__setattr__(k,v)
                continue

            cls = self.__class__
            try:
                attr = cls.__getattribute__(cls,k)
            except AttributeError:
                print('Invalid attribute %s' % k)

            if type(attr) is AssociationProxy:
                self.__setattr__(k,v)
                continue

            prop = attr.property
            prop_type = type(prop.columns[0].type)
            if prop_type is Date:
                val = datetime.datetime.strptime(v, "%Y-%m-%d").date()
            elif prop_type is DateTime:
                val = datetime.datetime.strptime(v, "%Y-%m-%dT%H:%M:%S")
            else:
                val = v
            self.__setattr__(k,val)

def date_to_str(d):
    if d is None:
        return None
    return d.strftime('%Y-%m-%d')

def datetime_to_str(d):
    if d is None:
        return None
    return d.strftime('%Y-%m-%dT%H:%M:%S')

roles_users = db.Table('roles_users',
        db.Column('user_id', db.Integer(), db.ForeignKey('users.id')),
        db.Column('role_id', db.Integer(), db.ForeignKey('roles.id')))

class Role(db.Model, RoleMixin):
    __tablename__ = 'roles'
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))

class User(db.Model, UserMixin, ModelMixin):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String)
    password = Column(LargeBinary)
    verified_email = Column(Boolean)
    active = db.Column(db.Boolean())
    confirmed_at = db.Column(db.DateTime())

    roles = db.relationship('Role', secondary=roles_users,
                            backref=db.backref('users', lazy='dynamic'))
    documents = db.relationship('Document', lazy='dynamic')

class EmailConfirmationCode(db.Model, ModelMixin):
    __tablename__ = 'email_confirmation_codes'
    user_id = Column(Integer, ForeignKey('users.id'))
    code = Column(String(), primary_key=True)
    created_at = db.Column(db.DateTime(), server_default=func.now())
    user = db.relationship('User')

class Document(db.Model, ModelMixin):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    note_id = Column(Integer, ForeignKey('notes.id',name='fkey_note_id'))
    url = Column(String)
    hash = Column(String)
    title = Column(String)
    author = Column(String)
    bibtex = Column(String)
    read = Column(Boolean)
    deleted_at = Column(Date)
    created_at = Column(DateTime)
    last_modified_at = Column(DateTime)
    last_accessed_at = Column(DateTime)

    note = db.relationship('Note')
    annotations = db.relationship('Annotation', lazy='dynamic')
    tags = db.relationship('Tag', secondary=lambda: documents_tags)

    tag_names = association_proxy('tags', 'name',
            creator=lambda name: db.session.query(Tag).filter_by(user_id=current_user.get_id(),name=name).first()
    )

    def to_dict(self):
        return {
                'id': self.id,
                'user_id': self.user_id,
                'url': self.url,
                'title': self.title,
                'author': self.author,
                'bibtex': self.bibtex,
                'read': self.read,
                'deleted_at': date_to_str(self.deleted_at),
                'last_modified_at': datetime_to_str(self.last_modified_at),
                'last_accessed_at': datetime_to_str(self.last_accessed_at),
                'tag_names': list(self.tag_names)
        }

class Annotation(db.Model, ModelMixin):
    __tablename__ = 'annotations'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    doc_id = Column(Integer, ForeignKey('documents.id'))
    note_id = Column(Integer, ForeignKey('notes.id',name='fkey_note_id'))
    page = Column(String)
    type = Column(String)
    position = Column(String) # Coordinate for points, bounding box for rect. Format: json string.
    deleted_at = Column(Date)

    document = db.relationship("Document")
    note = db.relationship('Note')

    def update(self,data):
        super().update(data)
        if 'position' in data:
            self.position = json.dumps(data['position'])

    def to_dict(self):
        return {
                'id': self.id,
                'user_id': self.user_id,
                'note_id': self.note_id,
                'doc_id': self.doc_id,
                'page': self.page,
                'type': self.type,
                'position': json.loads(self.position),
                'deleted_at': self.deleted_at.strftime('%Y-%m-%d') if self.deleted_at is not None else None
        }

documents_tags = db.Table('documents_tags',
        db.Column('document_id', db.Integer(), db.ForeignKey('documents.id')),
        db.Column('tag_id', db.Integer(), db.ForeignKey('tags.id')))

annotations_tags = db.Table('annotations_tags',
        db.Column('annotation_id', db.Integer(), db.ForeignKey('annotations.id')),
        db.Column('tag_id', db.Integer(), db.ForeignKey('tags.id')))

notes_tags = db.Table('notes_tags',
        db.Column('note_id', db.Integer(), db.ForeignKey('notes.id',name='fkey_note_id')),
        db.Column('tag_id', db.Integer(), db.ForeignKey('tags.id',name='fkey_tag_id')))

class Tag(db.Model, ModelMixin):
    __tablename__ = 'tags'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    name = Column(String)
    description = Column(String)
    deleted_at = Column(Date)

    def update(self,data):
        super().update(data)
        # Non-empty name
        self.name = self.name.strip()
        if len(self.name) == 0:
            raise ValueError('Tag name cannot be empty')
        # Name uniqueness
        tag = db.session.query(Tag).filter_by(user_id=self.user_id, name=self.name).first()
        if tag is not None:
            raise ValueError('Tag name "%s" is already in use. Choose another name.' % self.name)

    def to_dict(self):
        return {
                'id': self.id,
                'user_id': self.user_id,
                'name': self.name,
                'description': self.description,
                'deleted_at': self.deleted_at.strftime('%Y-%m-%d') if self.deleted_at is not None else None
        }

class DocumentAccessCode(db.Model, ModelMixin):
    __tablename__ = 'document_access_codes'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    document_id = Column(Integer, ForeignKey('documents.id'))
    allow_read = Column(Boolean)
    allow_write = Column(Boolean)
    code = Column(String)
    created_at = db.Column(DateTime, server_default=func.now())

    def update(self,data):
        pass

    def to_dict(self):
        pass

class Note(db.Model, ModelMixin):
    __tablename__ = 'notes'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    body = Column(Text)
    parser = Column(String)
    deleted_at = Column(Date)
    created_at = Column(DateTime)
    last_modified_at = Column(DateTime)
    last_accessed_at = Column(DateTime)

    annotations = db.relationship('Annotation', lazy='dynamic')
    tags = db.relationship('Tag', secondary=lambda: notes_tags)

    tag_names = association_proxy('tags', 'name',
            creator=lambda name: db.session.query(Tag).filter_by(user_id=current_user.get_id(),name=name).first()
    )

    def to_dict(self):
        annotations = self.annotations.all()
        doc_id = None
        ann_id = None
        if len(annotations) > 0 and annotations[0].deleted_at is None:
            ann_id = annotations[0].id
            doc = annotations[0].document
            if doc.deleted_at is None:
                doc_id = doc.id
        return {
                'id': self.id,
                'user_id': self.user_id,
                'body': self.body,
                'parser': self.parser,
                'deleted_at': date_to_str(self.deleted_at),
                'last_modified_at': datetime_to_str(self.last_modified_at),
                'last_accessed_at': datetime_to_str(self.last_accessed_at),
                'tag_names': list(self.tag_names),
                'document_id': doc_id,
                'annotation_id': ann_id,
                'orphaned': len(annotations) > 0 and annotations[0].deleted_at is not None
        }

# Setup Flask-Security
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
