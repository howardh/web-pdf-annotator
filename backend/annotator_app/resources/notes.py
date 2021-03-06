from flask import request
from flask import current_app as app
from flask import Blueprint, send_file
from flask_restful import Api, Resource
from flask_security import current_user

import os
import requests
import datetime

from annotator_app.extensions import db
from annotator_app.database import Note, Annotation, Document
from annotator_app.resources.endpoint import ListEndpoint, EntityEndpoint

blueprint = Blueprint('notes', __name__)
api = Api(blueprint)

class NoteList(ListEndpoint):
    class Meta:
        model = Note
        filterable_params = ['id', 'user_id']
    def after_create(self,entity,data):
        entity.created_at = datetime.datetime.utcnow()
        entity.last_modified_at = datetime.datetime.utcnow()
        if 'annotation_id' in data:
            ann = db.session.query(Annotation) \
                    .filter_by(id=data['annotation_id']) \
                    .filter_by(user_id=current_user.id) \
                    .first()
            if ann is not None:
                print('new note id',entity.id)
                ann.note_id = entity.id
                return [entity,ann]
        elif 'document_id' in data:
            doc = db.session.query(Document) \
                    .filter_by(id=data['document_id']) \
                    .filter_by(user_id=current_user.id) \
                    .first()
            if doc is not None:
                doc.note_id = entity.id
                return [entity,doc]
        return [entity]

class NoteEndpoint(EntityEndpoint):
    class Meta:
        model = Note
        filterable_params = ['id', 'user_id']
    def after_update(self,entity,data):
        entity.last_modified_at = datetime.datetime.utcnow()
        if 'annotation_id' in data:
            ann = db.session.query(Annotation) \
                    .filter_by(id=data['annotation_id']) \
                    .filter_by(user_id=current_user.id) \
                    .first()
            if ann is not None:
                print('new note id',entity.id)
                ann.note_id = entity.id
                return [entity,ann]
        elif 'document_id' in data:
            doc = db.session.query(Document) \
                    .filter_by(id=data['document_id']) \
                    .filter_by(user_id=current_user.id) \
                    .first()
            if doc is not None:
                doc.note_id = entity.id
                return [entity,doc]
        return [entity]
    def after_delete(self,entity):
        for model in [Annotation,Document]:
            # Check for associated annotation
            entity2 = db.session.query(model) \
                    .filter_by(note_id=entity.id) \
                    .filter_by(user_id=current_user.id) \
                    .first()
            if entity2 is not None:
                entity2.note_id = None
                return [entity,entity2]
        return [entity]

class NoteSuggestionsEndpoint(Resource):
    def post(self):
        data = request.get_json()
        prefix = data.pop('prefix','')

        vocabulary = [
            'hello','world', 'horse', 'battery', 'staple',
            '\\begin{equation}\n\t${1:eqn}\n\\end{equation}',
            '\\begin{bmatrix}\n\t${1:eqn}\n\\end{bmatrix}',
            '\\begin{align*}\n\t${1:eqn}\n\\end{align*}',
            '[[example]]'
        ]

        return {
                'suggestions': [w for w in vocabulary if w.startswith(prefix)]
        }, 200

api.add_resource(NoteList, '/notes')
api.add_resource(NoteEndpoint, '/notes/<int:entity_id>')
api.add_resource(NoteSuggestionsEndpoint, '/notes/suggestions')
