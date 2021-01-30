# Web PDF Annotation Tool

Deployment: Create config file in `backend/instance/config.py`

|Config Name                     |Description|
|--------------------------------|-----------|
|`UPLOAD_DIRECTORY`              |Directory where user uploads can be stored temporarily.|
|`BASE_WEBSITE_URL`              |URL to access the front end (Dev only)|
|`BASE_SERVER_URL`               |URL to access the Flask back end (Dev only)|
|`DEBUG`                         |`True`=debug mode. Otherwise `False`.|
|`SECRET_KEY`                    ||
|`SQLALCHEMY_TRACK_MODIFICATIONS`||
|`SQLALCHEMY_DATABASE_URI`       |Database URI in the format `postgresql://<user>:<password>@<address>:<port>/<database>`.|
|`SECURITY_REGISTERABLE`         ||
|`SECURITY_REGISTER_URL`         ||
|`SECURITY_CONFIRMABLE`          ||
|`SECURITY_CONFIRM_URL`          ||
|`MAIL_SERVER`                   ||
|`MAIL_PORT`                     ||
|`MAIL_USE_TLS`                  ||
|`MAIL_USERNAME`                 ||
|`MAIL_PASSWORD`                 ||
|`GITHUB_CLIENT_ID`              |OAuth2 Client ID|
|`GITHUB_CLIENT_SECRET`          |OAuth2 Client Secret|

# DB Migration

## Making Changes

- `flask db migrate -m "Message"`
- Verify that the generated migration script is correct, and make changes if necessary.
- `flask db upgrade`

## Deploying Changes

- Pull changes
- `flask db upgrade`
