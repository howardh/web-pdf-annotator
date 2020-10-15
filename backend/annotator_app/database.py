import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from sqlalchemy import Column, Integer, String, Float, Date, Time, DateTime, Boolean, Enum, LargeBinary

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
    __tablename__ = 'document'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    url = Column(String)
    hash = Column(String)

class Annotation(db.Model):
    __tablename__ = 'annotation'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    type = Column(String)
    blob = Column(String)
    parser = Column(String)
    position = Column(String) # Coordinate for points, bounding box for rect. Format: json string.
