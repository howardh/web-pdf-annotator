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
import datetime
import hashlib

from annotator_app.extensions import db
from annotator_app.database import Document
from annotator_app.resources.endpoint import ListEndpoint, EntityEndpoint, entities_to_dict

blueprint = Blueprint('documents', __name__)
api = Api(blueprint)

class DocumentList(ListEndpoint):
    class Meta:
        model = Document
        filterable_params = ['id', 'user_id', 'title']
    def after_create(self,entity,data):
        entity.created_at = datetime.datetime.now()
        entity.last_modified_at = datetime.datetime.now()
        entity = autofill_document_details(entity)
        return [entity]

class DocumentEndpoint(EntityEndpoint):
    class Meta:
        model = Document
        filterable_params = ['id', 'user_id', 'title']
    def after_update(self,entity,data):
        entity.last_modified_at = datetime.datetime.now()
        return [entity]

class DocumentRecursiveEndpoint(Resource):
    def get(self, entity_id):
        entity = db.session.query(Document) \
                .filter_by(user_id=current_user.get_id()) \
                .filter_by(id=entity_id) \
                .one()
        if entity is None:
            return {
                'error': 'ID not found'
            }, 404

        doc = entity
        # Document
        entities = [doc]
        # Annotations
        annotations = doc.annotations.filter_by(deleted_at=None).all()
        entities += annotations
        # Notes
        entities += [a.note for a in annotations if a.note_id is not None]
        if doc.note_id is not None:
            entities += [doc.note]
        return {
            'entities': entities_to_dict(entities)
        }, 200

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

def get_file_hash(file_name):
    BUF_SIZE = 1024*1024*1024 # 1GB at a time
    md5 = hashlib.md5()
    with open(file_name, 'rb') as f:
        while True:
            data = f.read(BUF_SIZE)
            if not data:
                break
            md5.update(data)
    return md5.hexdigest()

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
        
        # Check hash
        #file_hash = get_file_hash(file_name)
        #print('hash: %s' % file_hash)
        #if entity.hash is None:
        #    entity.hash = file_hash
        #    db.session.flush()
        #    db.session.commit()
        #elif entity.hash != file_hash:
        #    print('HASH MISMATCH! FILE CHANGED!\n\tOld hash: %s\n\tNew hash:%s' % (entity.hash, file_hash))

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

def autofill_document_details(entity):
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

    match = re.search("^https://proceedings.neurips.cc/paper/2020/file/([a-zA-Z0-9]+)-Paper.pdf", url)
    if match is not None:
        neurips_abs_url = 'https://proceedings.neurips.cc/paper/2020/hash/%s-Abstract.html' % match.group(1)

        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600',
            'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0'
        }
        response = requests.get(neurips_abs_url, headers)
        soup = BeautifulSoup(response.content, 'html.parser')

        # Title
        title = soup.select('.container-fluid .col h4')[0].text
        if entity.title is None:
            entity.title = title
        # Authors
        authors_header = soup.find('h4', string="Authors").parent
        authors_container = authors_header.find_next('p')
        if entity.author is None:
            entity.author = authors_container.text

    return entity

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

        entity = autofill_document_details(entity)

        db.session.flush()
        db.session.commit()

        return json.dumps({
            'entities': entities_to_dict([entity]),
        }), 200

api.add_resource(DocumentList, '/documents')
api.add_resource(DocumentEndpoint, '/documents/<int:entity_id>')
api.add_resource(DocumentRecursiveEndpoint, '/documents/<int:entity_id>/recursive')
api.add_resource(DocumentPdfEndpoint, '/documents/<int:entity_id>/pdf')
api.add_resource(DocumentAccessCodeEndpoint, '/documents/<int:entity_id>/access_code')
api.add_resource(DocumentAutoFillEndpoint, '/documents/<int:entity_id>/autofill')
