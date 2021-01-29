from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_security import Security
from flask_mail import Mail
from flask_migrate import Migrate
from authlib.integrations.flask_client import OAuth

cors = CORS()
db = SQLAlchemy()
security = Security()
mail = Mail()
migrate = Migrate()
oauth = OAuth()
