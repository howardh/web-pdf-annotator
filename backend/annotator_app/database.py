import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from sqlalchemy import Column, Integer, String, Float, Date, Time, DateTime, Boolean, Enum, LargeBinary
from sqlalchemy.dialects.postgresql import UUID

import enum
import datetime
import os
import uuid

from annotator_app.extensions import db

class User(db.Model):
    __tablename__ = 'users'
    id = Column(UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, unique=True, nullable=False)
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
    __tablename__ = 'document'
    id = Column(UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=True))
    url = Column(String)
    hash = Column(String)

class Annotation(db.Model):
    __tablename__ = 'annotation'
    id = Column(UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=True))
    doc_id = Column(UUID(as_uuid=True))
    type = Column(String)
    blob = Column(String)
    parser = Column(String)
    position = Column(String) # Coordinate for points, bounding box for rect. Format: json string.
