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

# Setup Dev Environment

- Back end
  - Create a virtualenv and install dependencies from requirements.txt
  - Create config file as outlined above
- Front end
  - `npm install`
  - Storybook: `npm run storybook`
- Database
  - Install postgres, create user and database
  - Set the `SQLALCHEMY_DATABASE_URI` config appropriately
  - Set up the database by running `flask db upgrade`

## Virtualbox setup

If you want to access the served pages on the host machine:
- Add port forwarding rules for ports 5000 (Flask), 3000 (React), and 6006 (Storybook)
- Run backend with `flask run --host=0.0.0.0`
- Add an entry to host machine's host file to point `localhost.localdomain` to `127.0.0.1`

# DB Migration

## Making Changes

- `flask db migrate -m "Message"`
- Verify that the generated migration script is correct, and make changes if necessary.
- `flask db upgrade`

## Deploying Changes

- Pull changes
- `flask db upgrade`
