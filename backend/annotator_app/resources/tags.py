from flask import current_app as app
from flask import Blueprint, send_file
from flask_restful import Api, Resource
from flask_security import current_user

import os
import requests

from annotator_app.extensions import db
from annotator_app.database import Tag
from annotator_app.resources.endpoint import ListEndpoint, EntityEndpoint

blueprint = Blueprint('tags', __name__)
api = Api(blueprint)

class TagList(ListEndpoint):
    class Meta:
        model = Tag
        filterable_params = ['id', 'user_id', 'name']

class TagEndpoint(EntityEndpoint):
    class Meta:
        model = Tag
        filterable_params = ['id', 'user_id', 'name']

api.add_resource(TagList, '/tags')
api.add_resource(TagEndpoint, '/tags/<int:entity_id>')
