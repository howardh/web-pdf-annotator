from flask import Flask

from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

from annotator_app.extensions import cors, db, security, mail, migrate, oauth
from annotator_app.database import user_datastore

app = Flask(__name__,
        instance_relative_config=True,
        static_url_path='/ignorethis' # Need to set this so we can handle /<path>.
)
app.config.from_pyfile('config.py')
cors.init_app(app, supports_credentials=True)
db.init_app(app)
security.init_app(app,user_datastore)
mail.init_app(app)
migrate.init_app(app,db)
oauth.init_app(app)
app.app_context().push()

oauth.register(
    name='github',
    access_token_url='https://github.com/login/oauth/access_token',
    access_token_params=None,
    authorize_url='https://github.com/login/oauth/authorize',
    authorize_params=None,
    api_base_url='https://api.github.com/',
    client_kwargs={},
)

from annotator_app.resources.auth import auth_bp
from annotator_app.resources.users import blueprint as user_bp
from annotator_app.resources.documents import blueprint as doc_bp
from annotator_app.resources.annotations import blueprint as ann_bp
from annotator_app.resources.notes import blueprint as note_bp
from annotator_app.resources.tags import blueprint as tag_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(user_bp, url_prefix='/api/data')
app.register_blueprint(doc_bp, url_prefix='/api/data')
app.register_blueprint(ann_bp, url_prefix='/api/data')
app.register_blueprint(note_bp, url_prefix='/api/data')
app.register_blueprint(tag_bp, url_prefix='/api/data')

# Below for dev purposes only
import os
from flask import Response, send_from_directory
from functools import wraps

def debug_only(f):
    @wraps(f)
    def wrapped(**kwargs):
        if not app.debug:
            abort(404)
        return f(**kwargs)
    return wrapped

def root_dir():
    return os.path.abspath('../web/build')

@debug_only
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
@app.route('/<string:path>')
def send_file(path):
    print(os.path.join(root_dir(), path))
    if not os.path.isfile(os.path.join(root_dir(), path)):
        path = 'index.html'
    return send_from_directory(root_dir(), path)
