from flask import Flask

from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

from annotator_app.extensions import login_manager, cors, db
#import annotator_app.database # Import to initialize databases

app = Flask(__name__)
app.config.from_pyfile('config.py')
cors.init_app(app, supports_credentials=True)
login_manager.init_app(app)
db.init_app(app)
app.app_context().push()

@app.route('/')
def hello_world():
    return 'Hello, World!'

from annotator_app.resources.auth import auth_bp
from annotator_app.resources.users import blueprint as user_bp
from annotator_app.resources.documents import blueprint as doc_bp
from annotator_app.resources.annotations import blueprint as ann_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(user_bp, url_prefix='/api/data')
app.register_blueprint(doc_bp, url_prefix='/api/data')
app.register_blueprint(ann_bp, url_prefix='/api/data')

#db.drop_all()
#db.create_all()
