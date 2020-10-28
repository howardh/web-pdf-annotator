from flask import current_app as app
from flask import Blueprint, send_file
from flask_restful import Api, Resource
from flask_security import current_user

import os
import requests

from annotator_app.extensions import db
from annotator_app.database import Tag, documents_tags
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
    def delete(self, entity_id):
        # Check if tag is in use before deleting
        entity = db.session.query(documents_tags) \
                .filter_by(tag_id=entity_id) \
                .all()
        if len(entity) > 0:
            return {
                "error": "Unable to delete tag. It is still in use by %d documents" % len(entity)
            }, 400

        # Not in use. Safe to delete.
        return super().delete(entity_id)

api.add_resource(TagList, '/tags')
api.add_resource(TagEndpoint, '/tags/<int:entity_id>')
