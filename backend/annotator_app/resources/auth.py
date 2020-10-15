import flask
from flask import render_template
from flask import Blueprint
from flask import request
from flask import session
import flask_login
from flask_login import login_required, current_user, login_user

import json
import bcrypt

from annotator_app.database import User
from annotator_app.extensions import login_manager, db

auth_bp = Blueprint('auth', __name__)

@login_manager.user_loader
def load_user(user_id):
    return db.session.query(User).filter_by(id=user_id).first()

@login_manager.request_loader
def request_loader(request):
    email = request.form.get('email')
    password = request.form.get('password')
    if email is None or password is None:
        return

    user = db.session.query(User).filter_by(email=email)
    if user is None:
        return
    user.authenticated = password == user.password
    print(user.id)

    return user

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
    session.permanent = False
    if 'permanent' in data:
        permanent = data['permanent']
        session.permanent = permanent
    user = db.session.query(User).filter_by(email=email).first()
    if user is None:
        return json.dumps({'error': "Incorrect email/password"}), 403
    if bcrypt.checkpw(data['password'].encode('utf-8'), user.password):
        flask_login.login_user(user)
        print("successful login")
        return json.dumps(user.id), 200
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
        if current_user.get_id() is not None:
            return "%s" % current_user.get_id(), 200
    except:
        pass
    return "{}", 200

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
    flask_login.logout_user()
    return '{}', 200
