import React from 'react';
import {useEffect, useState} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link, useHistory } from "react-router-dom";

import {
  filterDict,formChangeHandler,generateClassNames,removeFromList
} from './Utils.js';
import {
  Checkbox, TextField, Button
} from './Inputs.js';
import {documentActions,tagActions,autofillDocumentInfo} from './actions/index.js';

import './Documents.scss';

function useDocuments(uid) {
}

export default function DocumentsPage(props) {
  const dispatch = useDispatch();
  const {
    userId
  } = props;

  // All documents, including those owned by someone else
  const documents = filterDict(
    useSelector(state => state.documents.entities),
    e => e && !e.deleted_at
  );

  // Load documents and tags
  useEffect(() => {
    dispatch(documentActions['fetchMultiple']());
    dispatch(tagActions['fetchMultiple']());
  },[]);

  // Filters
  const [tagFilters,setTagFilters] = useState(new Set());
  const filteredDocs = filterDict(
    documents,
    doc => { // Must be tagged by all selected filters
      for (let t of tagFilters) {
        if (doc.tag_names.indexOf(t) === -1) {
          return false;
        }
      }
      return true;
    }
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

  // Render
  if (!userId) {
    return (<main className='documents-page'>
      <h1>Page not found</h1>
    </main>);
  }

  return (<main className='documents-page'>
    <h1>Documents</h1>
    <NewDocumentForm />
    <DocumentsTableActions
        selectedDocs={selectedDocs}
        selectedDocIds={selectedDocIds}
        tagFilters={tagFilters} setTagFilters={setTagFilters}
        deleteSelectedDocs={deleteSelectedDocs}/>
    <DocumentsTable documents={filteredDocs} 
        selectedDocIds={selectedDocIds}
        selectedAllDocs={selectedAllDocs}
        toggleSelectDoc={toggleSelectDoc}
        toggleSelectAllDocs={toggleSelectAllDocs}/>
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
        for (let docId of Object.keys(response.data.new_entities.documents)) {
          dispatch(autofillDocumentInfo(docId));
        }
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
        <TextField name='url'
            value={values['url']}
            onKeyPress={handleKeyPress}
            onChange={handleChange} />
      </label>
      <Button onClick={createDoc}>Create</Button>
    </div>
  );
}

function DocumentsTableActions(props) {
  const {
    selectedDocs,
    selectedDocIds,
    tagFilters, setTagFilters,
    deleteSelectedDocs
  } = props;

  const history = useHistory();
  const [tagEditorVisible,setTagEditorVisible] = useState(false);
  const [tagFilterVisible,setTagFilterVisible] = useState(false);

  if (selectedDocIds.size === 0) {
    return (<div className='documents-table-actions'>
      <div className='tag-filter-container'>
        <button onClick={()=>setTagFilterVisible(!tagFilterVisible)}>
          <i className='material-icons'>filter_list</i>
        </button>
        <TagFilter visible={tagFilterVisible} selectedTags={tagFilters}
            onChangeSelectedTags={setTagFilters} />
      </div>
    </div>);
  }

  if (selectedDocIds.size === 1) {
    const id = selectedDocIds.values().next().value;
    return (<div className='documents-table-actions'>
      <button onClick={()=>history.push('/annotate/'+id)}>
        <i className='material-icons'>create</i>
      </button>
      <button onClick={deleteSelectedDocs}>
        <i className='material-icons'>delete</i>
      </button>
      <div className='tag-editor-container'>
        <button onClick={()=>setTagEditorVisible(!tagEditorVisible)}>
          <i className='material-icons'>label</i>
        </button>
        <TagEditor documents={selectedDocs} visible={tagEditorVisible} />
      </div>
    </div>);
  }

  return (<div className='documents-table-actions'>
    <button onClick={deleteSelectedDocs}>
      <i className='material-icons'>delete</i>
    </button>
    <div className='tag-editor-container'>
      <button onClick={()=>setTagEditorVisible(!tagEditorVisible)}>
        <i className='material-icons'>label</i>
      </button>
      <TagEditor documents={selectedDocs} visible={tagEditorVisible} />
    </div>
  </div>);
}

function DocumentsTable(props) {
  const {
    documents,
    selectedDocIds,
    selectedAllDocs,
    toggleSelectDoc,
    toggleSelectAllDocs
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

  const sortedDocs = Object.values(documents).sort(
    (doc1,doc2) => new Date(doc2.last_modified_at) - new Date(doc1.last_modified_at)
  )
  return (
    <table>
      <thead>
        <tr>
          <th><Checkbox checked={selectedAllDocs} onChange={toggleSelectAllDocs}/></th>
          <th>Title</th>
          <th>Last Modified</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {
          sortedDocs.map(doc=>{
            if (!doc) {
              return null;
            }
            return (<tr key={doc.id}>
              <td>
                <Checkbox checked={selectedDocIds.has(doc.id)}
                    onChange={()=>toggleSelectDoc(doc.id)}/>
              </td>
              <td>
                {doc.tag_names.length > 0 && '['+doc.tag_names.join('][')+'] '}
                {doc.title || doc.url}
              </td>
              <td>
                {new Date(doc.last_modified_at).toLocaleString()}
              </td>
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

function TagEditor(props) {
  const {
    documents, // Documents whose tags are being modified
    visible,
    setVisible = () => null
  } = props;

  const dispatch = useDispatch();

  const numDocs = Object.keys(documents).length;
  const [tagSearchValue,setTagSearchValue] = useState('');
  const tags = useSelector(state => state.tags.entities);
  const filteredTags = filterDict(tags, t => t.name.includes(tagSearchValue));
  const exactMatch = Object.values(filteredTags).filter(t => t.name === tagSearchValue);

  const tagSelectionCount = Object.values(
    documents
  ).map(
    doc => doc.tag_names
  ).reduce((acc,tagNames) => {
    for (let name of tagNames) {
      if (!acc[name]) {
        acc[name] = 1;
      } else {
        acc[name] += 1;
      }
    }
    return acc;
  }, {});

  function createTag() {
    let tag = {
      name: tagSearchValue
    };
    dispatch(tagActions['create'](tag)).then(()=>{
      setTagSearchValue('');
    });
  }
  function toggleTag(tagId) {
    const name = tags[tagId].name;
    if (tagSelectionCount[name] > 0) {
      // Remove
      for (let doc of Object.values(documents)) {
        let newDoc = {
          ...doc,
          tag_names: removeFromList(doc.tag_names,name)
        }
        dispatch(documentActions['update'](newDoc));
      }
    } else {
      // Add
      for (let doc of Object.values(documents)) {
        let newDoc = {
          ...doc,
          tag_names: doc.tag_names.indexOf(name) === -1 ? 
                [...doc.tag_names, name] : doc.tag_names
        }
        dispatch(documentActions['update'](newDoc));
      }
    }
  }

  if (!visible) {
    return null;
  }

  return (<div className='tag-editor'>
    <div className='editor'>
      <div className='selected-tags'>
      </div>
      <input type='text' name='search' value={tagSearchValue} onChange={e=>setTagSearchValue(e.target.value)}/>
    </div>
    <div className='dropdown'>
      {
        exactMatch.length === 0 &&
        tagSearchValue.trim().length > 0 &&
        (
          <button onClick={createTag}>
            Create Tag: {tagSearchValue}
          </button>
        )
      }
      {
        Object.values(filteredTags).map(tag => {
          const classNames = generateClassNames({
            tag: true,
            selected: tagSelectionCount[tag.name] === numDocs,
            partial: tagSelectionCount[tag.name] > 0 &&
                     tagSelectionCount[tag.name] < numDocs
          })
          return (
            <div className={classNames} key={tag.id}
                onClick={()=>toggleTag(tag.id)}>
              {tag.name}
            </div>
          );
        })
      }
    </div>
  </div>);
}

function TagFilter(props) {
  const {
    visible,
    setVisible = () => null,
    selectedTags,
    onChangeSelectedTags,
  } = props;

  const dispatch = useDispatch();

  const [tagSearchValue,setTagSearchValue] = useState('');
  const tags = useSelector(state => state.tags.entities);
  const filteredTags = filterDict(tags, t => t.name.includes(tagSearchValue));

  function toggleTag(tagName) {
    if (selectedTags.has(tagName)) {
      let temp = new Set(selectedTags);
      temp.delete(tagName);
      onChangeSelectedTags(temp);
    } else {
      onChangeSelectedTags(new Set(selectedTags).add(tagName));
    }
  }

  if (!visible) {
    return null;
  }

  return (<div className='tag-editor'>
    <div className='editor'>
      <div className='selected-tags'>
      </div>
      <input type='text' name='search' value={tagSearchValue} onChange={e=>setTagSearchValue(e.target.value)}/>
    </div>
    <div className='dropdown'>
      {
        Object.values(filteredTags).map(tag => {
          const classNames = generateClassNames({
            tag: true,
            selected: selectedTags.has(tag.name),
          })
          return (
            <div className={classNames} key={tag.id}
                onClick={()=>toggleTag(tag.name)}>
              {tag.name}
            </div>
          );
        })
      }
    </div>
  </div>);
}
