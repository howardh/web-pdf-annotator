from flask import Flask

from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

from annotator_app.extensions import cors, db, security, mail, migrate
from annotator_app.database import user_datastore

app = Flask(__name__,instance_relative_config=True)
app.config.from_pyfile('config.py')
cors.init_app(app, supports_credentials=True)
db.init_app(app)
security.init_app(app,user_datastore)
mail.init_app(app)
migrate.init_app(app,db)
app.app_context().push()

from annotator_app.resources.auth import auth_bp
from annotator_app.resources.users import blueprint as user_bp
from annotator_app.resources.documents import blueprint as doc_bp
from annotator_app.resources.annotations import blueprint as ann_bp
from annotator_app.resources.tags import blueprint as tag_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(user_bp, url_prefix='/api/data')
app.register_blueprint(doc_bp, url_prefix='/api/data')
app.register_blueprint(ann_bp, url_prefix='/api/data')
app.register_blueprint(tag_bp, url_prefix='/api/data')

#db.drop_all()
#db.create_all()
