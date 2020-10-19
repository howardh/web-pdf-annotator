from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_security import Security

cors = CORS()
db = SQLAlchemy()
security = Security()
