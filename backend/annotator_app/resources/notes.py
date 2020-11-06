from flask import current_app as app
from flask import Blueprint, send_file
from flask_restful import Api, Resource
from flask_security import current_user

import os
import requests

from annotator_app.extensions import db
from annotator_app.database import Note
from annotator_app.resources.endpoint import ListEndpoint, EntityEndpoint

blueprint = Blueprint('notes', __name__)
api = Api(blueprint)

class NoteList(ListEndpoint):
    class Meta:
        model = Note
        filterable_params = ['id', 'user_id']

class NoteEndpoint(EntityEndpoint):
    class Meta:
        model = Note
        filterable_params = ['id', 'user_id']

api.add_resource(NoteList, '/notes')
api.add_resource(NoteEndpoint, '/notes/<int:entity_id>')
