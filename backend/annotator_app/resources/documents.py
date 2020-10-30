from flask import current_app as app
from flask import Blueprint, send_file, request
from flask_restful import Api, Resource
from flask_security import current_user

from bs4 import BeautifulSoup
import os
import requests
import uuid
import json
import re

from annotator_app.extensions import db
from annotator_app.database import Document
from annotator_app.resources.endpoint import ListEndpoint, EntityEndpoint, entities_to_dict

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

def fetch_pdf(document, max_bytes):
    response = requests.get(document.url)
    content_bytes = response.headers.get('content-length', None)
    if content_bytes is None:
        return {
            'error': 'No file found at %s' % document.url,
            'code': 404
        }
    if len(content_bytes) > max_bytes:
        return {
            'error': 'File too large.',
            'code': 413
        }

    file_name = os.path.join(app.config['UPLOAD_DIRECTORY'],'%d.pdf'%document.id)
    with open(file_name,'wb') as f:
        f.write(response.content)
    return { 'file_name': file_name }

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
        output = fetch_pdf(entity, max_bytes)
        if 'error' in output:
            return {
                'error': output['error']
            }, output['code']
        file_name = output['file_name']
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

class DocumentAutoFillEndpoint(Resource):
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

        url = entity.url
        match = re.search("^https://arxiv.org/pdf/(\d+\.\d+)", url)
        if match is not None:
            arxiv_abs_url = 'https://arxiv.org/abs/%s' % match.group(1)

            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '3600',
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0'
            }
            response = requests.get(arxiv_abs_url, headers)
            soup = BeautifulSoup(response.content, 'html.parser')

            title = soup.find_all('h1', class_='title')[0].text
            if title.startswith('Title:'):
                title = title[len('Title:'):]
                if entity.title is None:
                    entity.title = title
            authors = soup.find_all('div', class_='authors')[0].text
            if authors.startswith('Authors:'):
                authors = authors[len('Authors:'):]
                #if entity.author is None:
                entity.author = authors

        db.session.flush()
        db.session.commit()

        return json.dumps({
            'entities': entities_to_dict([entity]),
        }), 200

api.add_resource(DocumentList, '/documents')
api.add_resource(DocumentEndpoint, '/documents/<int:entity_id>')
api.add_resource(DocumentPdfEndpoint, '/documents/<int:entity_id>/pdf')
api.add_resource(DocumentAccessCodeEndpoint, '/documents/<int:entity_id>/access_code')
api.add_resource(DocumentAutoFillEndpoint, '/documents/<int:entity_id>/autofill')
