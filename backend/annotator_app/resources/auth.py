import flask
from flask import current_app as app
from flask import render_template
from flask import Blueprint
from flask import request
from flask import session
import flask_security
from flask_security import current_user, login_required
from flask_mail import Message

import datetime
import bcrypt
import json
import uuid

from annotator_app.database import User, EmailConfirmationCode, user_datastore
from annotator_app.extensions import db, mail

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
      401:
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
        return json.dumps({'error': "Incorrect email/password"}), 401
    if bcrypt.checkpw(data['password'].encode('utf-8'), user.password):
        flask_security.utils.login_user(user, remember=permanent)
        print("successful login")
        return json.dumps({'id': user.id}), 200
    print("failed login")
    return json.dumps({'error': 'Bad login'}), 401

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
        if not current_user.is_anonymous:
            return json.dumps({
                'id': current_user.id,
                'confirmed': current_user.confirmed_at is not None,
                'github_id': current_user.github_id
            }), 200
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

@auth_bp.route('/resend_confirmation', methods=['POST'])
@login_required
def send_confirmation():
    user = current_user

    if user.confirmed_at is not None:
        success_message = '{message: "Email already confirmed"}'
        return success_message, 200 # Don't let anyone guess emails

    # Check if code already exists
    code = db.session.query(EmailConfirmationCode)\
            .filter_by(user_id=user.id)\
            .first()
    if code is None:
        # Create confirmation code
        code = EmailConfirmationCode(
                user_id = user.id,
                code = str(uuid.uuid4())
        )
        db.session.add(code)
        db.session.flush()
        db.session.commit()

    # Email code
    body = "Confirm email at {url}"
    body = body.format(url=app.config['BASE_SERVER_URL']+'api/auth/confirm/'+code.code)
    msg = Message("PDF Annotator Tool",
                  sender=app.config['MAIL_USERNAME'],
                  recipients=[user.email],
                  body=body)

    try:
        mail.send(msg)
    except:
        return '{message: "Invalid email"}', 400

    success_message = '{message: "Confirmation email has been sent"}'
    return success_message, 200

@auth_bp.route('/confirm/<token>', methods=['GET'])
def confirm(token):
    code = db.session.query(EmailConfirmationCode)\
                .filter_by(code=token)\
                .first()

    if code is None:
        return json.dumps({
            'error': 'Invalid code'
        }), 404

    user = code.user
    if user is None:
        return json.dumps({
            'error': 'Invalid code'
        }), 404

    user.confirmed_at = datetime.datetime.utcnow()

    db.session.flush()
    db.session.commit()

    return 'Email confirmed', 200

##################################################
# OAuth
##################################################

from flask import url_for, render_template, redirect
from annotator_app.extensions import oauth

@auth_bp.route('/login/github')
def login_github():
    redirect_uri = url_for('auth.authorize_github', _external=True)
    return oauth.github.authorize_redirect(redirect_uri)

@auth_bp.route('/login/github/link')
def login_github_link():
    redirect_uri = url_for('auth.link_github', _external=True)
    return oauth.github.authorize_redirect(redirect_uri)

@auth_bp.route('/authorize/github')
def authorize_github():
    token = oauth.github.authorize_access_token()
    resp = oauth.github.get('user', token=token)
    profile = resp.json()
    github_id = profile['id']

    # Check if user is already logged in
    if not current_user.is_anonymous:
        # If yes, then log out current user first
        flask_security.utils.logout_user()

    # Check if account exists
    user = db.session.query(User).filter_by(github_id=github_id).first()
    if user is None: # No user associated with this Github account
        # Create user
        user = user_datastore.create_user(email=None,password=None)
        user.github_id = github_id
        db.session.flush()
        db.session.commit()
    # Log in
    flask_security.login_user(user)

    return redirect('/')

@auth_bp.route('/authorize/github/link')
def link_github():
    token = oauth.github.authorize_access_token()
    resp = oauth.github.get('user', token=token)
    profile = resp.json()
    github_id = profile['id']

    # Make sure a user is logged in to link to this Github ID
    if current_user.is_anonymous:
        return {
                'error': 'Not currently logged in'
        }, 401

    # Check that there is not account made with this Github ID
    user = db.session.query(User).filter_by(github_id=github_id).first()
    if user is not None:
        return {
                'error': 'An account already exists with this Github ID. Delete the existing account before linking.'
        }, 403

    # Set Github ID
    user = db.session.query(User).filter_by(id=current_user.id).first()
    user.github_id = github_id
    db.session.flush()
    db.session.commit()

    return redirect('/')
