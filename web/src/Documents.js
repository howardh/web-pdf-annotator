import React from 'react';
import {useEffect, useState} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link } from "react-router-dom";

import {formChangeHandler} from './Utils.js';
import {documentActions} from './actions/index.js';

import './Documents.scss';

function useDocuments(uid) {
}

export default function DocumentsPage(props) {
  const dispatch = useDispatch();
  const {
    userId
  } = props;
  // All documents, including those owned by someone else
  const documents = useSelector(state => state.documents.entities);

  // Load documents
  useEffect(() => {
    dispatch(documentActions['fetchMultiple']());
  },[]);

  if (!userId) {
    return (<main className='documents-page'>
      <h1>Page not found</h1>
    </main>);
  }

  return (<main className='documents-page'>
    <h1>Documents</h1>
    <NewDocumentForm />
    <DocumentsTable documents={documents} />
  </main>);
}

function NewDocumentForm(props) {
  const dispatch = useDispatch();
  const initialValues = {
    url: ''
  };
  const [values,setValues] = useState(initialValues);
  const handleChange = formChangeHandler(values,setValues);
  function createDoc() {
    dispatch(documentActions['create'](values)).then(
      response => {
        setValues(initialValues);
      }
    );
  }
  function handleKeyPress(e) {
    if (e.which === 13) {
      createDoc();
    }
  }

  return (
    <div className='new-doc-form-container'>
      <label>
        URL: 
        <input type='text' name='url'
            value={values['url']}
            onKeyPress={handleKeyPress}
            onChange={handleChange} />
      </label>
      <input type='submit' value='Create' onClick={createDoc} />
    </div>
  );
}

function DocumentsTable(props) {
  const {
    documents
  } = props;
  const dispatch = useDispatch();

  if (documents.length === 0) {
    return null;
  }

  function deleteDoc(doc) {
    if (window.confirm('Are you sure you want to delete document '+doc.url+'?')) {
      dispatch(documentActions['deleteSingle'](doc.id));
    }
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>URL</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {
          Object.values(documents).map(doc=>{
            if (!doc) {
              return null;
            }
            return (<tr key={doc.id}>
              <td> {doc.title} </td>
              <td><Link to={'/annotate/'+doc.id}>{doc.url}</Link></td>
              <td>
                <Link to={'/annotate/'+doc.id}>
                  <i className='material-icons'>create</i>
                </Link>
                <i className='material-icons' onClick={()=>deleteDoc(doc)}>
                  delete
                </i>
              </td>
            </tr>);
          })
        }
      </tbody>
    </table>
  );
}
