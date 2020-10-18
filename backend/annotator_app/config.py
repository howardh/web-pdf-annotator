import bcrypt 

DEBUG = True
SECRET_KEY = 'super secret key'
SQLALCHEMY_TRACK_MODIFICATIONS = False
SQLALCHEMY_DATABASE_URI='postgresql://howardh:verysecurepassword@localhost:5432/annotator'
SECURITY_PASSWORD_HASH='bcrypt'
SECURITY_PASSWORD_SALT=bcrypt.gensalt(12)
