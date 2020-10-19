from flask import Blueprint
from flask_restful import Api

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

api.add_resource(DocumentList, '/documents')
api.add_resource(DocumentEndpoint, '/documents/<int:entity_id>')
