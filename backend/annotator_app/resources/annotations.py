from flask import Blueprint, send_file, make_response
from flask_restful import Api, Resource
from flask_security import current_user

from pdf2image import convert_from_path
import datetime
import json
from io import BytesIO

from annotator_app.extensions import db
from annotator_app.database import Annotation, Document
from annotator_app.resources.endpoint import ListEndpoint, EntityEndpoint
from annotator_app.resources.documents import fetch_pdf

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
    def after_update(self,entity):
        doc = db.session.query(Document) \
                .filter_by(id=entity.doc_id) \
                .first()
        if doc is None:
            print('Error: Unable to find document associated with annotation %d' % entity.id)

        print('Annotation update',doc)
        doc.last_modified_at = datetime.datetime.now()
        return entity

class AnnotationImageEndpoint(Resource):
    def get(self, entity_id):
        # Get annotation
        annotation = db.session.query(Annotation) \
                .filter_by(user_id=current_user.get_id()) \
                .filter_by(id=entity_id) \
                .first()
        if annotation is None:
            return json.dumps({
                'error': 'Annotation not found'
            }), 404
        # Check if annotation is rect
        if annotation.type != 'rect':
            return json.dumps({
                'error': 'Annotation of type %s cannot be converted to image.' % annotation.type
            }), 404
        # Get document
        document = db.session.query(Document) \
                .filter_by(user_id=current_user.get_id()) \
                .filter_by(id=annotation.doc_id) \
                .first()
        # Get PDF
        max_bytes = 1024*1024*5 # 5MB
        output = fetch_pdf(document, max_bytes)
        if 'error' in output:
            return {
                'error': output['error']
            }, output['code']
        # Render relevant page to image
        file_name = output['file_name']
        # Extract relevant portion of image
        scale = 3
        images = convert_from_path(file_name,
                # FIXME: Hacky solution. I got the dpi from trial and error.
                dpi=72*scale,
                first_page=int(annotation.page),
                last_page=int(annotation.page)
        )
        position = json.loads(annotation.position)
        box = position['box'] # top, right, bottom, left
        box = [box[3],box[0],box[1],box[2]] # left, top, right, bottom
        box = [x*scale for x in box] # rescale
        cropped_image = images[0].crop(box)
        # Return image
        img_io = BytesIO()
        cropped_image.save(img_io, 'JPEG', quality=70)
        img_io.seek(0)
        response = make_response(send_file(img_io, mimetype='image/jpeg'))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache' # If cached, user won't see changes when the annotation is changed
        return response

api.add_resource(AnnotationList, '/annotations')
api.add_resource(AnnotationEndpoint, '/annotations/<int:entity_id>')
api.add_resource(AnnotationImageEndpoint, '/annotations/<int:entity_id>/img')
