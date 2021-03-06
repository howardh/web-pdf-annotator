import React from 'react';
import {useEffect, useState, useRef} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link, useHistory } from "react-router-dom";
import { createSelector } from 'reselect';

import {
  filterDict,formChangeHandler,generateClassNames,removeFromList,toRelativeDateString
} from './Utils.js';
import {
  Checkbox, TextField, Button, GroupedInputs, Tooltip
} from './Inputs.js';
import { EntityTable } from './EntityTable.js';
import { TagEditor, TagFilter, TagSelector } from './TagSelector.js';
import {documentActions,tagActions,autofillDocumentInfo} from './actions/index.js';

import './Documents.scss';

const docSelector = createSelector(
  [state => state.documents.entities],
  (docs) => filterDict(docs, e => e && !e.deleted_at)
);

export default function DocumentsPage(props) {
  const dispatch = useDispatch();
  const history = useHistory();
  const {
    userId
  } = props;

  // All documents, including those owned by someone else
  const documents = useSelector( docSelector );

  // Load documents and tags
  useEffect(() => {
    dispatch(documentActions['fetchMultiple']());
    dispatch(tagActions['fetchMultiple']());
  },[]);

  // Filters
  const [filteredDocs, setFilteredDocs] = useState({});
  const sortedDocs = Object.values(filteredDocs).sort(
    (doc1,doc2) => new Date(doc2.last_modified_at) - new Date(doc1.last_modified_at)
  );

  // Selected documents
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const selectedDocs = filterDict(filteredDocs,
    doc=>selectedDocIds.has(doc.id));
  const selectedAllDocs = Object.keys(selectedDocs).length > 0 && 
      Object.keys(selectedDocs).length === Object.keys(documents).length;
  function toggleSelectDoc(id) {
    let temp = new Set(selectedDocIds);
    if (temp.has(id)) {
      temp.delete(id);
    } else {
      temp.add(id);
    }
    setSelectedDocIds(temp);
  }
  function toggleSelectAllDocs() {
    if (selectedDocIds.size > 0) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(Object.keys(documents).map(id => parseInt(id))));
    }
  }

  // Callbacks
  function deleteSelectedDocs() {
    console.log(['delete',selectedDocIds]);
    for (let id of selectedDocIds) {
      dispatch(documentActions['deleteSingle'](id));
    }
  }
  function deleteDoc(doc) {
    if (window.confirm('Are you sure you want to delete document '+doc.url+'?')) {
      dispatch(documentActions['deleteSingle'](doc.id));
    }
  }

  // Render
  if (!userId) {
    return (<main className='documents-page'>
      <h1>Page not found</h1>
    </main>);
  }

  let columns = [
    {
      heading: 'Title',
      render: doc => {
        return <>
          <span className='tags'>
            {doc.tag_names.length > 0 && '['+doc.tag_names.join('][')+'] '}
          </span>
          <span className={generateClassNames({title:true,read:doc.read})}>
            {doc.title || doc.url}
          </span>
        </>;
      },
      className: 'title'
    },{
      heading: 'Last Modified',
      render: doc => toRelativeDateString(new Date(doc.last_modified_at)),
      className: 'lastmodified'
    }
  ];
  function renderActionsColumn(doc) {
    return <>
      <Link to={'/annotate/'+doc.id}>
        <i className='material-icons'>create</i>
      </Link>
      <i className='material-icons' onClick={()=>deleteDoc(doc)}>
        delete
      </i>
    </>;
  }
  let actions = [
    {
      render: () => {
        let id = Array.from(selectedDocIds)[0];
        return (
          <Button onClick={()=>history.push('/annotate/'+id)}>
            <i className='material-icons'>create</i>
            <Tooltip>Open Document</Tooltip>
          </Button>
        );
      },
      renderCondition: selectedDocIds => selectedDocIds.size === 1,
    },{
      render: () => {
        return (
          <Button onClick={deleteSelectedDocs}>
            <i className='material-icons'>delete</i>
            <Tooltip>Delete Document</Tooltip>
          </Button>
        );
      },
      renderCondition: selectedDocIds => selectedDocIds.size > 0,
    },{
      render: () => {
        return (
          <TagEditor entities={selectedDocs}
            updateEntity={doc=>dispatch(documentActions['update'](doc))} />
        );
      },
      renderCondition: selectedDocIds => selectedDocIds.size > 0,
    },
  ];
  return (<main className='documents-page'>
    <h1>Documents</h1>
    <NewDocumentForm />
    <div className='document-list-container'>
      <DocFilterMenu documents={documents} onChangeFilteredDocs={setFilteredDocs} />
      <EntityTable entities={sortedDocs}
        selectedIds={selectedDocIds}
        onChangeSelectedIds={setSelectedDocIds}
        columns={columns}
        renderActionsColumn={renderActionsColumn}
        actions={actions}
      />
    </div>
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
    if (!values.url) {
      return;
    }
    dispatch(documentActions['create'](values)).then(
      response => {
        setValues(initialValues);
      }
    );
  }
  function handleKeyPress(e) {
    if (e.key === 'Enter') {
      createDoc();
    }
  }

  return (
    <div className='new-doc-form-container'>
      <label>
        URL: 
        <GroupedInputs>
          <TextField name='url'
              value={values['url']}
              onKeyPress={handleKeyPress}
              onChange={handleChange} />
          <Button onClick={createDoc}>Create</Button>
        </GroupedInputs>
      </label>
    </div>
  );
}

function DocFilterMenu(props) {
  const {
    documents,
    onChangeFilteredDocs
  } = props;
  const dispatch = useDispatch();

  const tags = useSelector(state => state.tags.entities);

  const [tagFilters, setTagFilters] = useState(new Set());

  function toggleTag(tagId) {
    let temp = new Set(tagFilters);
    let tagName = tags[tagId].name;
    if (tagFilters.has(tagName)) {
      temp.delete(tagName);
    } else {
      temp.add(tagName);
    }
    setTagFilters(temp);
  }

  useEffect(() => {
    dispatch(tagActions['fetchMultiple']());
  },[]);

  useEffect(() => {
    onChangeFilteredDocs(filterDict(
      documents,
      doc => {
        for (let t of tagFilters) {
          if (doc.tag_names.indexOf(t) === -1) {
            return false;
          }
        }
        return true;
      }
    ));
  }, [documents, tagFilters]);

  return (<div className='document-filter-container'>
    <h2>Filters</h2>
    <h3>Tag Filters</h3>
    <TagSelector tags={tags} selectedTags={tagFilters} onToggleTagId={toggleTag}/>
  </div>);
}
