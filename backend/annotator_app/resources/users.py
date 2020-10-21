from flask import Blueprint
from flask import request
from flask_restful import Api, Resource
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from werkzeug.utils import secure_filename
from flasgger import SwaggerView
import flask_security

import re
import datetime
import os
import base64
import bcrypt

from annotator_app.database import User, user_datastore
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

        # Validate email
        r = re.compile("[^@]+@[^@]+\.[^@]+")
        if not r.match(data['email']):
            return {
                'error': "Invalid email"
            }, 400

        # Check if already in use
        user = user_datastore.get_user(data['email'])
        if user is not None:
            return {
                'error': "User already exists"
            }, 400

        email = data['email']
        password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt(12))

        user = user_datastore.create_user(email=email,password=password)

        db.session.flush()
        db.session.commit()

        flask_security.login_user(user)

        return {
            'message': "User created"
        }, 200

class UserPassword(Resource):
    def post(self):
        data = request.get_json()

        user = current_user
        if not flask_security.verify_password(data['password'].encode('utf-8'),user.password):
            return {
                    'error': 'Incorrect password'
            }, 403

        user.password = flask_security.hash_password(data['new_password'].encode('utf-8'))

        db.session.flush()
        db.session.commit()
        return {
            'message': "Password updated successfully."
        }, 200

api.add_resource(UserList, '/users')
api.add_resource(UserPassword, '/users/change_password')
