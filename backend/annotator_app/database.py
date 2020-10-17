import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from sqlalchemy import Column, Integer, String, Float, Date, Time, DateTime, Boolean, Enum, LargeBinary

import json
import enum
import datetime
import os

from annotator_app.extensions import db

class User(db.Model):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String)
    password = Column(LargeBinary)
    verified_email = Column(Boolean)

    active = False
    authenticated = False

    def is_authenticated(self):
        return self.authenticated

    def is_active(self):
        return self.active

    def is_anonymous(self):
        return False

    def get_id(self):
        return self.id

class Document(db.Model):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    url = Column(String)
    hash = Column(String)
    title = Column(String)
    author = Column(String)
    bibtex = Column(String)

    def to_dict(self):
        return {
                'id': self.id,
                'user_id': self.user_id,
                'url': self.url,
                'title': self.title
        }

class Annotation(db.Model):
    __tablename__ = 'annotations'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    doc_id = Column(Integer)
    page = Column(String)
    type = Column(String)
    blob = Column(String)
    parser = Column(String)
    position = Column(String) # Coordinate for points, bounding box for rect. Format: json string.

    def to_dict(self):
        return {
                'id': self.id,
                'user_id': self.user_id,
                'doc_id': self.doc_id,
                'page': self.page,
                'type': self.type,
                'blob': self.blob,
                'position': json.loads(self.position),
                'parser': self.parser
        }
