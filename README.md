# Web PDF Annotation Tool

Deployment: Create config file in `backend/instance/config.py`

# DB Migration

## Making Changes

- `flask db migrate -m "Message"`
- Verify that the generated migration script is correct, and make changes if necessary.
- `flask db upgrade`

## Deploying Changes

- Pull changes
- `flask db upgrade`
