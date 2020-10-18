from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_security import Security

cors = CORS()
login_manager = LoginManager()
db = SQLAlchemy()
security = Security()
