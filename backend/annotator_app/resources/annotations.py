from flask import Blueprint
from flask_restful import Api
from flask_security import current_user

import datetime
import json

from annotator_app.database import Annotation
from annotator_app.resources.endpoint import ListEndpoint, EntityEndpoint

blueprint = Blueprint('annotations', __name__)
api = Api(blueprint)

def to_object(data):
    entity = Annotation(**data)
    entity.user_id = current_user.get_id()
    entity.position = json.dumps(data['position'])
    return entity

def update_object(entity,data):
    for k in ['doc_id','page','type','blob','parser']:
        if k in data:
            entity.__setattr__(k,data[k])
    if 'position' in data:
        entity.position = json.dumps(data['position'])
    if 'deleted_at' in data and data['deleted_at'] is not None:
        entity.deleted_at = datetime.datetime.strptime(data['deleted_at'], "%Y-%m-%d").date()
    return entity

class AnnotationList(ListEndpoint):
    class Meta:
        model = Annotation
        to_object = to_object
        update_object = update_object

class AnnotationEndpoint(EntityEndpoint):
    class Meta:
        model = Annotation
        to_object = to_object
        update_object = update_object

api.add_resource(AnnotationList, '/annotations')
api.add_resource(AnnotationEndpoint, '/annotations/<int:entity_id>')
