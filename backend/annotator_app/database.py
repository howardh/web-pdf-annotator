import sqlalchemy
from sqlalchemy import create_engine, ForeignKey
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from sqlalchemy import Column, Integer, String, Float, Date, Time, DateTime, Boolean, Enum, LargeBinary

from flask_security import Security, SQLAlchemyUserDatastore, \
    UserMixin, RoleMixin, login_required

import json
import enum
import datetime
import os

from annotator_app.extensions import db

roles_users = db.Table('roles_users',
        db.Column('user_id', db.Integer(), db.ForeignKey('users.id')),
        db.Column('role_id', db.Integer(), db.ForeignKey('roles.id')))

class Role(db.Model, RoleMixin):
    __tablename__ = 'roles'
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))

class User(db.Model, UserMixin):
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

class Document(db.Model):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    url = Column(String)
    hash = Column(String)
    title = Column(String)
    author = Column(String)
    bibtex = Column(String)
    deleted_at = Column(Date)
    annotations = db.relationship('Annotation', lazy='dynamic')

    def to_dict(self):
        return {
                'id': self.id,
                'user_id': self.user_id,
                'url': self.url,
                'title': self.title,
                'author': self.author,
                'bibtex': self.bibtex,
                'deleted_at': self.deleted_at.strftime('%Y-%m-%d') if self.deleted_at is not None else None
        }

class Annotation(db.Model):
    __tablename__ = 'annotations'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    doc_id = Column(Integer, ForeignKey('documents.id'))
    page = Column(String)
    type = Column(String)
    blob = Column(String)
    parser = Column(String)
    position = Column(String) # Coordinate for points, bounding box for rect. Format: json string.
    deleted_at = Column(Date)

    def to_dict(self):
        return {
                'id': self.id,
                'user_id': self.user_id,
                'doc_id': self.doc_id,
                'page': self.page,
                'type': self.type,
                'blob': self.blob,
                'position': json.loads(self.position),
                'parser': self.parser,
                'deleted_at': self.deleted_at.strftime('%Y-%m-%d') if self.deleted_at is not None else None
        }

documents_tags = db.Table('documents_tags',
        db.Column('document_id', db.Integer(), db.ForeignKey('documents.id')),
        db.Column('tag_id', db.Integer(), db.ForeignKey('tags.id')))

annotations_tags = db.Table('annotations_tags',
        db.Column('annotation_id', db.Integer(), db.ForeignKey('annotations.id')),
        db.Column('tag_id', db.Integer(), db.ForeignKey('tags.id')))

class Tag(db.Model):
    __tablename__ = 'tags'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    name = Column(String)
    description = Column(String)
    deleted_at = Column(Date)

    def to_dict(self):
        return {
                'id': self.id,
                'user_id': self.user_id,
                'doc_id': self.doc_id,
                'page': self.page,
                'type': self.type,
                'blob': self.blob,
                'position': json.loads(self.position),
                'parser': self.parser,
                'deleted_at': self.deleted_at.strftime('%Y-%m-%d') if self.deleted_at is not None else None
        }

# Setup Flask-Security
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
