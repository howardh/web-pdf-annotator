import React from 'react';
import {useEffect, useState, useRef} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link, useHistory } from "react-router-dom";

import {
  filterDict,formChangeHandler,generateClassNames,removeFromList,toRelativeDateString
} from './Utils.js';
import {
  Checkbox, TextField, Button, GroupedInputs
} from './Inputs.js';
import {
  EntityTable
} from './EntityTable.js';
import {documentActions,tagActions,autofillDocumentInfo} from './actions/index.js';

import './Documents.scss';

function useDocuments(uid) {
}

export default function DocumentsPage(props) {
  const dispatch = useDispatch();
  const history = useHistory();
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
          </Button>
        );
      },
      renderCondition: selectedDocIds => selectedDocIds.size === 1,
    },{
      render: () => {
        return (
          <Button onClick={deleteSelectedDocs}>
            <i className='material-icons'>delete</i>
          </Button>
        );
      },
      renderCondition: selectedDocIds => selectedDocIds.size > 0,
    },{
      render: () => {
        return (
          <TagEditor documents={selectedDocs} />
        );
      },
      renderCondition: selectedDocIds => selectedDocIds.size > 0,
    },{
      render: () => {
        return (
          <TagFilter selectedTags={tagFilters}
            onChangeSelectedTags={setTagFilters}/>
        );
      },
      renderCondition: () => true,
    },
  ];
  return (<main className='documents-page'>
    <h1>Documents</h1>
    <NewDocumentForm />
    <EntityTable entities={sortedDocs}
      selectedIds={selectedDocIds}
      onChangeSelectedIds={setSelectedDocIds}
      columns={columns}
      renderActionsColumn={renderActionsColumn}
      actions={actions}
    />
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


function TagSelector(props) {
  const {
    tags,
    selectedTags=new Set(), partiallySelectedTags=new Set(),
    onToggleTagId,
    allowCreation,
  } = props;
  const dispatch = useDispatch();

  const [tagSearchValue,setTagSearchValue] = useState('');
  const filteredTags = filterDict(tags, t => t.name.includes(tagSearchValue));
  const exactMatch = Object.values(filteredTags).filter(t => t.name === tagSearchValue);

  function createTag() {
    let tag = {
      name: tagSearchValue
    };
    dispatch(tagActions['create'](tag)).then(()=>{
      setTagSearchValue('');
    });
  }

  return (<div className='tag-selector'>
    <div className='selector'>
      <div className='selected-tags'></div>
      <input type='text' name='search' value={tagSearchValue} onChange={e=>setTagSearchValue(e.target.value)}/>
    </div>
    <div className='dropdown'>
      {
        exactMatch.length === 0 &&
        tagSearchValue.trim().length > 0 &&
        (
          allowCreation &&
          <Button onClick={createTag}>
            Create Tag: {tagSearchValue}
          </Button>
        )
      }
      {
        Object.values(filteredTags).map(tag => {
          const classNames = generateClassNames({
            tag: true,
            selected: selectedTags.has(tag.name),
            partial: partiallySelectedTags.has(tag.name)
          })
          return (
            <div className={classNames} key={tag.id}
                onClick={()=>onToggleTagId(tag.id)}>
              {tag.name}
            </div>
          );
        })
      }
    </div>
  </div>);
}

function TagEditor(props) {
  const {
    documents, // Documents whose tags are being modified
  } = props;

  const dispatch = useDispatch();

  const [visible,setVisible] = useState(false);

  const numDocs = Object.keys(documents).length;
  const tags = useSelector(state => state.tags.entities);
  const ref = useRef(null);

  useEffect(()=>{
    if (!visible) {
      return;
    }
    if (setVisible) {
      function handleClick(e) {
        if (ref.current && !ref.current.contains(e.target)) {
          setVisible(false);
        }
      }
      document.addEventListener('click',handleClick);
      return () => {
        document.removeEventListener('click',handleClick);
      }
    }
  },[visible]);

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

  let selectedTags = new Set(Object.entries(tagSelectionCount).filter(
    ([k,v]) => v === numDocs
  ).map( ([k,v]) => k ));
  let partiallySelectedTags = new Set(Object.entries(tagSelectionCount).filter(
    ([k,v]) => v > 0 && v < numDocs
  ).map( ([k,v]) => k ));
  return (
    <div className='tag-editor-container' ref={ref}>
      <Button onClick={()=>setVisible(!visible)}>
        <i className='material-icons'>label</i>
      </Button>
      { visible &&
        <TagSelector
          tags={tags}
          selectedTags={selectedTags}
          partiallySelectedTags={partiallySelectedTags}
          onToggleTagId={toggleTag}
          allowCreation={true}
        />
      }
    </div>
  );
}

function TagFilter(props) {
  const {
    selectedTags,
    onChangeSelectedTags,
  } = props;

  const dispatch = useDispatch();

  const [visible,setVisible] = useState(false);

  const tags = useSelector(state => state.tags.entities);
  const ref = useRef(null);

  useEffect(()=>{
    if (!visible) {
      return;
    }
    if (setVisible) {
      function handleClick(e) {
        if (ref.current && !ref.current.contains(e.target)) {
          setVisible(false);
        }
      }
      document.addEventListener('click',handleClick);
      return () => {
        document.removeEventListener('click',handleClick);
      }
    }
  },[visible]);

  function toggleTag(tagId) {
    const tagName = tags[tagId].name;
    if (selectedTags.has(tagName)) {
      let temp = new Set(selectedTags);
      temp.delete(tagName);
      onChangeSelectedTags(temp);
    } else {
      onChangeSelectedTags(new Set(selectedTags).add(tagName));
    }
  }

  return (
    <div className='tag-filter-container' ref={ref}>
      <Button onClick={()=>setVisible(!visible)}>
        <i className='material-icons'>filter_list</i>
      </Button>
      { visible &&
        <TagSelector
          tags={tags}
          selectedTags={selectedTags}
          onToggleTagId={toggleTag}
          allowCreation={false}
        />
      }
    </div>
  );
}
