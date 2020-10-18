import flask
from flask import render_template
from flask import Blueprint
from flask import request
from flask import session
import flask_security
from flask_security import current_user, login_required

import bcrypt
import json

from annotator_app.database import User
from annotator_app.extensions import login_manager, db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """ Log in.
    ---
    tags:
      - auth
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
              example: 'name@email.com'
            password:
              type: string
            permanent:
              type: boolean
    responses:
      200:
        schema:
          type: number
      403:
        schema:
          type: object
          properties:
            error:
              type: string
    """
    data = request.get_json()
    email = data['email']
    session.permanent = True
    if 'permanent' in data:
        permanent = data['permanent']
        session.permanent = permanent
    user = db.session.query(User).filter_by(email=email).first()
    if user is None:
        return json.dumps({'error': "Incorrect email/password"}), 403
    if bcrypt.checkpw(data['password'].encode('utf-8'), user.password):
        flask_security.utils.login_user(user, remember=permanent)
        print("successful login")
        return json.dumps({'id': user.id}), 200
    print("failed login")
    return json.dumps({'error': 'Bad login'}), 403

@auth_bp.route('/current_session', methods=['GET'])
def get_current_session():
    """ Log in.
    ---
    tags:
      - auth
    responses:
      200:
        schema:
          type: object
    """
    try:
        print(current_user)
        if current_user.id is not None:
            return json.dumps({'id': current_user.id}), 200
    except:
        pass
    return "{id: null}", 200

@auth_bp.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    """ Log out.
    ---
    tags:
      - auth
    responses:
      200:
        schema:
          type: object
    """
    flask_security.utils.logout_user()
    return '{}', 200
