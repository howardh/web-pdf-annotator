from flask import current_app as app
from flask import Blueprint, send_file
from flask_restful import Api, Resource
from flask_security import current_user

import os
import requests
import uuid

from annotator_app.extensions import db
from annotator_app.database import Document
from annotator_app.resources.endpoint import ListEndpoint, EntityEndpoint

blueprint = Blueprint('documents', __name__)
api = Api(blueprint)

class DocumentList(ListEndpoint):
    class Meta:
        model = Document
        filterable_params = ['id', 'user_id', 'title']

class DocumentEndpoint(EntityEndpoint):
    class Meta:
        model = Document
        filterable_params = ['id', 'user_id', 'title']

class DocumentPdfEndpoint(Resource):
    def get(self, entity_id):
        entity = db.session.query(Document) \
                .filter_by(user_id=current_user.get_id()) \
                .filter_by(id=entity_id) \
                .first()
        if entity is None:
            return {
                'error': 'Document not found'
            }, 404

        # Download file
        max_bytes = 1024*1024*5 # 5MB
        response = requests.get(entity.url)
        content_bytes = response.headers.get('content-length', None)
        if content_bytes is None:
            return {
                'error': 'No file found at %s' % entity.url
            }, 404
        if len(content_bytes) > max_bytes:
            return {
                'error': 'File too large.'
            }, 413

        file_name = os.path.join(app.config['UPLOAD_DIRECTORY'],'%d.pdf'%entity_id)
        with open(file_name,'wb') as f:
            f.write(response.content)
        return send_file(
                file_name,
                mimetype='application/pdf',
                attachment_filename='doc.pdf'
        )

class DocumentAccessCodeEndpoint(Resource):
    def post(self, entity_id):
        data = request.get_json() 
        entity = db.session.query(Document) \
                .filter_by(user_id=current_user.get_id()) \
                .filter_by(id=entity_id) \
                .first()

        if entity is None:
            return {
                'error': 'Document not found'
            }, 404

        code = db.session.query(DocumentAccessCode)\
                .filter_by(user_id=current_user.get_id()) \
                .filter_by(document_id=entity_id) \
                .first()

        if code is None:
            code = DocumentAccessCode(
                    user_id=current_user.get_id(),
                    document_id=entity_id,
                    code=str(uuid.uiud4()),
                    allow_read=data.get('read',False),
                    allow_write=data.get('write',False)
            )
            db.session.add(code)
            db.session.flush()
            db.session.commit()

        return json.dumps({
            'code': code.code
        }), 200

api.add_resource(DocumentList, '/documents')
api.add_resource(DocumentEndpoint, '/documents/<int:entity_id>')
api.add_resource(DocumentPdfEndpoint, '/documents/<int:entity_id>/pdf')
api.add_resource(DocumentAccessCodeEndpoint, '/documents/<int:entity_id>/access_code')
