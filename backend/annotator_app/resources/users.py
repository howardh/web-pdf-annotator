from flask import Blueprint
from flask import request
from flask_restful import Api, Resource
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from werkzeug.utils import secure_filename
from flasgger import SwaggerView
import flask_security
from flask_security import current_user

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
        user = user_datastore.find_user(email=data['email'])
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
        current_password = data.get('password')
        new_password = data.get('new_password')

        user = current_user
        if not bcrypt.checkpw(current_password.encode('utf-8'), user.password):
            return {
                    'error': 'Incorrect password'
            }, 403

        user.password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(12))

        db.session.flush()
        db.session.commit()
        return {
            'message': "Password updated successfully."
        }, 200

class UserUnlinkAccount(Resource):
    def post(self,name):
        data = request.get_json()
        current_password = data.get('password')

        # Make sure the user has another way to log in
        user = current_user
        if user.email is None:
            return {
                'error': "Must have a valid email before unlinking."
            }, 403
        if user.password is None:
            return {
                'error': "Must have a password set before unlinking."
            }, 403

        # Check password
        if current_password is None:
            return { 'error': 'No password supplied.' }, 403
        if not bcrypt.checkpw(current_password.encode('utf-8'), user.password):
            return { 'error': 'Incorrect password' }, 403

        # Check OAuth service name
        if name != 'github':
            return { 'error': 'Invalid service name: %s' % name }, 403

        # Unlink
        user.github_id = None
        db.session.flush()
        db.session.commit()

        return {
            'message': "Successfully unlinked from Github account"
        }, 200

api.add_resource(UserList, '/users')
api.add_resource(UserPassword, '/users/change_password')
api.add_resource(UserUnlinkAccount, '/users/unlink/<string:name>')
