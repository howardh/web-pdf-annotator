#!./ENV/bin/python

import sys

if len(sys.argv) == 2:
    if sys.argv[1] == 'create_db':
        print('Creating all tables')
        import annotator_app
        from annotator_app import db
        db.create_all()
    elif sys.argv[1] == 'drop_db':
        print('Dropping all tables')
        import annotator_app
        from annotator_app import db
        db.drop_all()
