from flask import request
from flask_restful import Resource
import flask_login
from flask_login import login_required, current_user
from flasgger import SwaggerView

from collections import defaultdict

from annotator_app.extensions import db

def entities_to_dict(entities):
    output = defaultdict(lambda: {})
    for entity in entities:
        entity_dict = entity.to_dict()
        output[entity.__tablename__][entity.id] = entity_dict
    return output

class ListEndpoint(Resource):
    def get(self):
        # Get filters from query parameters
        filterable_params = ['id', 'user_id', 'title']
        filter_params = {}
        for p in filterable_params:
            val = request.args.get(p)
            if val is not None:
                filter_params[p] = val
        # Query database
        entities = db.session.query(self.Meta.model) \
                .filter_by(user_id=current_user.get_id()) \
                .filter_by(**filter_params) \
                .all()
        print(entities)
        return {
            'entities': entities_to_dict(entities)
        }, 200
    def post(self):
        data = request.get_json() 
        if getattr(self.Meta,'to_object',None) is not None:
            entity = self.Meta.to_object(data)
        else:
            entity = self.Meta.model(**data)
        entity.user_id = current_user.get_id()

        db.session.add(entity)
        db.session.flush()
        db.session.commit()

        return {
            'message': 'Document created',
            'entities': entities_to_dict([entity])
        }, 200

class EntityEndpoint(Resource):
    def get(self, entity_id):
        entity = db.session.query(self.Meta.model) \
                .filter_by(user_id=current_user.get_id()) \
                .filter_by(id=entity_id) \
                .one()
        if entity is None:
            return {
                'error': 'ID not found'
            }, 404
        return {
            'entities': entities_to_dict([entity])
        }, 200
    def put(self, entity_id):
        data = request.get_json()
        entity = db.session.query(self.Meta.model) \
                .filter_by(id=entity_id) \
                .filter_by(user_id=current_user.get_id()) \
                .first()

        if getattr(self.Meta,'update_object',None) is not None:
            entity = self.Meta.update_object(entity,data)
        else:
            for k,v in data.items():
                entity.__setattr__(k,v)

        if entity is None:
            return {'error': 'No entity found with this ID.'}, 404

        db.session.flush()
        db.session.commit()

        return {
            'message': 'Updated successfully',
            'entities': entities_to_dict([entity])
        }, 200
    def delete(self, entity_id):
        entity = db.session.query(self.Meta.model) \
                .filter_by(id=entity_id) \
                .filter_by(user_id=current_user.get_id()) \
                .one()
        if entity is None:
            return {
                "error": "Unable to find entity with ID %d." % entity_id
            }, 404

        db.session.delete(entity)
        db.session.flush()
        db.session.commit()

        return {
            "message": "Deleted successfully",
            "entities": {
                self.Meta.model.__tablename__: {
                    entity_id: None
                }
            }
        }, 200
