from flask import Flask

from flask_graphql import GraphQLView

from annotator_app.extensions import login_manager, cors, db
from annotator_app.schema import schema # GraphQL Schema

app = Flask(__name__)
app.config.from_pyfile('config.py')
cors.init_app(app, supports_credentials=True)
#login_manager.init_app(app)
db.init_app(app)
app.app_context().push()

class AuthorizationMiddleware(object):
    def resolve(self, next, root, info, **args):
        output = next(root, info, **args)
        breakpoint()
        return output
        #if info.field_name == 'user':
        #    return None
        #return next(root, info, **args)

app.add_url_rule(
    '/graphql',
    view_func=GraphQLView.as_view(
        'graphql',
        schema=schema,
        graphiql=True, # for having the GraphiQL interface
        headers='foobar: asdf',
        header_editor_enabled=True,
        middleware=[AuthorizationMiddleware()]
    )
)

@app.route('/')
def hello_world():
    return 'Hello, World!'

from annotator_app.resources.auth import auth_bp
from annotator_app.resources.users import blueprint as user_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(user_bp, url_prefix='/api/data')

#db.drop_all()
#db.create_all()
