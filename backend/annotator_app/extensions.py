from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_security import Security
from flask_mail import Mail

cors = CORS()
db = SQLAlchemy()
security = Security()
mail = Mail()
