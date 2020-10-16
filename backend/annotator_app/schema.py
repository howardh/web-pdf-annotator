import graphene
from graphene import relay
from graphene_sqlalchemy import SQLAlchemyObjectType, SQLAlchemyConnectionField
from graphql_relay.node.node import from_global_id

import json
import jwt
import bcrypt

from annotator_app.extensions import db
from annotator_app.database import User as UserModel, Document as DocumentModel, Annotation as AnnotationModel

# See tutorial at: https://github.com/alexisrolland/flask-graphene-sqlalchemy/wiki/Flask-Graphene-SQLAlchemy-Tutorial

class ActiveSQLAlchemyObjectType(SQLAlchemyObjectType):
    class Meta:
        abstract = True

    @classmethod
    def get_node(cls, info, id):
        return None
        return cls.get_query(info).filter(
            and_(cls._meta.model.deleted_at==None,
                 cls._meta.model.id==id)
            ).first()

##################################################
# Authentication
##################################################

def create_token(user):
    payload = {
            'id': str(user.id)
    }
    secret = 'some secret'
    token = jwt.encode(payload,secret,algorithm='HS256')
    token = token.decode("utf-8") # Turn byte string into string
    return token

def get_current_user_id(info):
    secret = 'some secret'
    headers = info.context.headers
    auth_header = headers.get('Authorization')
    if auth_header is None:
        return None
    token = auth_header.split()[1]
    payload = jwt.decode(token,secret,algorithm='HS256')
    return payload['id']

def get_current_user(info):
    user_id = get_current_user_id(info)
    user = db.session.query(UserModel).filter_by(id=user_id).one()
    return user

class Login(graphene.Mutation):
    ok = graphene.Boolean()
    token = graphene.String()
    error = graphene.String()
    class Arguments:
        email = graphene.String()
        password = graphene.String()
    def mutate(self, info, **data):
        user = UserModel()
        email = data['email']
        user = db.session.query(UserModel).filter_by(email=email).first()
        if user is None:
            return Login(ok=False,token=None,error='Incorrect email/password')
        if bcrypt.checkpw(data['password'].encode('utf-8'), user.password):
            token = create_token(user)
            return Login(ok=True,token=token,error=None)
        return Login(ok=False,token=None,error='Incorrect email/password')

##################################################
# Users
##################################################

class User(ActiveSQLAlchemyObjectType):
    class Meta:
        model = UserModel
        interfaces = (relay.Node, )
    password = graphene.String()
    def resolve_password(self, info):
        return '...'

class CreateUser(graphene.Mutation):
    user = graphene.Field(lambda: User, description="User created by this mutation.")
    class Arguments:
        email = graphene.String()
        password = graphene.String()
    def mutate(self, info, **data):
        user = UserModel()
        user.email = data['email']
        user.password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt(12))
        db.session.add(user)
        db.session.commit()
        return CreateUser(user=user)

class UserConnection(graphene.Connection):
    class Meta:
        node = User

##################################################
# Documents
##################################################

class Document(ActiveSQLAlchemyObjectType):
    class Meta:
        model = DocumentModel
        interfaces = (relay.Node, )
    #user = SQLAlchemyConnectionField(User.connection)
    #user = relay.ConnectionField(UserConnection)
    #def resolve_user(self, info):
    #    return []

class CreateDocument(graphene.Mutation):
    document = graphene.Field(lambda: Document, description="Document created by this mutation.")
    class Arguments:
        url = graphene.String()
    def mutate(self, info, **data):
        user_id = get_current_user_id(info)
        doc = DocumentModel()
        doc.user_id = user_id
        doc.url = data['url']
        db.session.add(doc)
        db.session.commit()
        return CreateDocument(document=doc)

##################################################
# Annotations
##################################################

class Annotation(ActiveSQLAlchemyObjectType):
    class Meta:
        model = AnnotationModel
        interfaces = (relay.Node, )

class CreateAnnotation(graphene.Mutation):
    annotation = graphene.Field(lambda: Annotation, description="Annotation created by this mutation.")
    class Arguments:
        doc_id = graphene.String()
        type = graphene.String()
        blob = graphene.String()
        parser = graphene.String()
        position = graphene.String()
    def mutate(self, info, **data):
        user_id = get_current_user_id(info)
        ann = AnnotationModel()
        ann.user_id = user_id
        ann.type = data['type']
        ann.blob = data['blob']
        ann.parser = data['parser']
        ann.position = data['position']
        db.session.add(ann)
        db.session.commit()
        return CreateAnnotation(annotation=ann)

##################################################
# Query/Mutation Object
##################################################

class Query(graphene.ObjectType):
    node = relay.Node.Field()
    # Allows sorting over multiple columns, by default over the primary key
    all_users = SQLAlchemyConnectionField(User.connection)
    all_documents = SQLAlchemyConnectionField(Document.connection)
    all_Annotation = SQLAlchemyConnectionField(Annotation.connection)

    users = graphene.List(User)
    documents = graphene.List(Document)
    annotations = graphene.List(Annotation)

    def resolve_users(self, info):
        #current_user_id = get_current_user_id(info)
        #if current_user_id is None:
        #    return []

        query = User.get_query(info)  # SQLAlchemy query
        #query = query.filter_by(id=current_user.id)
        results = query.all()
        return results

    def resolve_documents(self, info):
        current_user_id = get_current_user_id(info)
        if current_user_id is None:
            return []

        print('User ID',current_user_id)

        query = Document.get_query(info)
        query = query.filter_by(user_id=current_user_id)
        results = query.all()
        return results

    def resolve_annotations(self, info):
        current_user_id = get_current_user_id(info)
        if current_user_id is None:
            return []

        query = Annotation.get_query(info)
        query = query.filter_by(user_id=current_user_id)
        results = query.all()
        return results

class Mutation(graphene.ObjectType):
    create_user = CreateUser.Field()
    create_document = CreateDocument.Field()
    create_annotation = CreateAnnotation.Field()
    login = Login.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)

# Save schema to file
introspection_dict = schema.introspect()
with open('schema.json', 'w') as f:
    json.dump({"data": introspection_dict}, f)
