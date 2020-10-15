from flask import Blueprint
from flask import request
from flask_restful import Api, Resource
import flask_login
from flask_login import login_required, current_user
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from werkzeug.utils import secure_filename
from flasgger import SwaggerView

import datetime
import os
import base64
import bcrypt

from annotator_app.database import User
from annotator_app.extensions import db

blueprint = Blueprint('users', __name__)
api = Api(blueprint)

class UserList(Resource):
    def post(self):
        """ Create a new user
        ---
        tags:
          - users
        parameters:
          - in: body
            required: true
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
                  example: 'name@email.com'
                password:
                  type: string
        responses:
          200:
            schema:
              type: object
              properties:
                message:
                  type: string
          400:
            schema:
              type: object
              properties:
                error:
                  type: string
        """
        data = request.get_json()

        user = User()
        user.email = data['email']
        user.password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt(12))

        existing_user = db.session.query(User)\
                .filter_by(email=user.email) \
                .all()
        if len(existing_user) == 0:
            db.session.add(user)
            db.session.flush()
            db.session.commit()
            flask_login.login_user(user)
        else:
            return {
                'error': "User already exists"
            }, 400

        return {
            'message': "User created"
        }, 200

class UserPassword(Resource):
    def post(self):
        """ Change Password
        ---
        tags:
          - users
        parameters:
          - in: body
            required: true
            schema:
              type: object
              properties:
                password:
                  type: string
                new_password:
                  type: string
        responses:
          200:
            schema:
              type: object
              properties:
                message:
                  type: string
          403:
            schema:
              type: object
              properties:
                error:
                  type: string
        """
        data = request.get_json()

        user = db.session.query(User)\
                .filter_by(id=current_user.get_id()) \
                .one()
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user.password):
            return {
                    'error': 'Incorrect password'
            }, 403

        user.password = bcrypt.hashpw(data['new_password'].encode('utf-8'), bcrypt.gensalt(12))

        db.session.flush()
        db.session.commit()
        return {
            'message': "Password updated successfully."
        }, 200

api.add_resource(UserList, '/users')
api.add_resource(UserPassword, '/users/change_password')
