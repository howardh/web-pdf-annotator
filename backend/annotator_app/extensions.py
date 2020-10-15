from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

cors = CORS()
login_manager = LoginManager()
db = SQLAlchemy()
