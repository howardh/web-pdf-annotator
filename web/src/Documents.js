import React from 'react';
import {useEffect, useState} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link } from "react-router-dom";

import {documentActions} from './actions/index.js';

import './Documents.scss';

function useDocuments(uid) {
}

export default function DocumentsPage(props) {
  const dispatch = useDispatch();
  const {
    uid
  } = props;
  // All documents, including those owned by someone else
  const documents = useSelector(state => state.documents.entities);

  // Load documents
  useEffect(() => {
    dispatch(documentActions['fetchMultiple']());
  },[]);

  return (<div className='documents-page'>
    <h1>Documents Page</h1>
    <NewDocumentForm />
    <DocumentsTable documents={documents} />
  </div>);
}

function formChangeHandler(state,setState) {
  return function(event) {
    setState({
      ...state,
      [event.target.name]: event.target.value
    });
  }
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
      New Doc
      <label>
        URL
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

  if (documents.length === 0) {
    return null;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>URL</th>
        </tr>
      </thead>
      <tbody>
        {
          Object.values(documents).map(doc=>{
            return (<tr key={doc.id}>
              <td> {doc.title} </td>
              <td><Link to={'/annotate/'+doc.id}>{doc.url}</Link></td>
            </tr>);
          })
        }
      </tbody>
    </table>
  );
}
