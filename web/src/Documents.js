import React from 'react';
import {useEffect, useState, useRef} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link, useHistory } from "react-router-dom";
import { createSelector } from 'reselect';

import { LabelledInput, Input } from 'atoms/Input.js';
import { Button, ButtonIcon } from 'atoms/Button.js';
import { TagSmall } from 'atoms/Tag.js';
import { Tooltip } from 'atoms/Tooltip.js';
import { TagSelect } from 'molecules/TagSelect.js';
import { GroupedInputs } from 'molecules/GroupedInput.js';
import { Table } from 'organisms/Table.js';
import {
  filterDict,formChangeHandler,generateClassNames,toRelativeDateString
} from 'Utils.js';
import { TagSelector } from './TagSelector.js';
import {documentActions,tagActions} from './actions/index.js';

import styles from './Documents.module.scss';

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
  const tags = useSelector(state => state.tags.entities);

  // Load documents and tags
  useEffect(() => {
    dispatch(documentActions['fetchMultiple']());
    dispatch(tagActions['fetchMultiple']());
  },[]);

  // Filters
  const [filterTags, setFilterTags] = useState(new Set());
  const [filteredDocs, setFilteredDocs] = useState({});
  const sortedDocs = Object.values(filteredDocs).sort(
    (doc1,doc2) => new Date(doc2.last_modified_at) - new Date(doc1.last_modified_at)
  );
  useEffect(() => {
    setFilteredDocs(
      filterDict(
        documents,
        doc => {
          for (let t of Array.from(filterTags)) {
            if (!doc.tag_ids.includes(t)) return false;
          }
          return true;
        }
      )
    )
  }, [filterTags, documents]);

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
    if (Array.isArray(doc)) {
      if (window.confirm('Are you sure you want to delete the '+doc.length+' selected documents?')) {
        //dispatch(documentActions['delete'](doc.id));
      }
    } else {
      if (window.confirm('Are you sure you want to delete document '+doc.url+'?')) {
        dispatch(documentActions['deleteSingle'](doc.id));
      }
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
          <TagSelectPopup docs={selectedDocs}
            tags={tags}
            updateEntity={doc=>dispatch(documentActions['update'](doc))} />
        );
      },
      renderCondition: selectedDocIds => selectedDocIds.size > 0,
    },
  ];
  return (<main className={styles['documents-page']}>
    <h1>Documents</h1>
    <div className={styles['table-container']}>
      <div className={styles['table-actions']}>
        <GroupedInputs>
          <Input />
          <ButtonIcon>
            <i className='material-icons'>search</i>
          </ButtonIcon>
        </GroupedInputs>
        <FilterPopup tags={tags} onChangeSelected={setFilterTags} />
        <NewDocumentPopup tagIds={filterTags} />
      </div>
      <DocumentTable
        entities={filteredDocs}
        deleteDoc={deleteDoc}
        tags={tags}
      />
    </div>
  </main>);
}

function NewDocumentPopup(props) {
  const {
    tagIds = null, // Set containing the IDs of the tags to apply to the new document.
  } = props;
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
    dispatch(documentActions['create']({
      ...values,
      tag_ids: Array.from(tagIds)
    })).then(
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

  const [expanded,setExpanded] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (expanded) {
      function listener(e) {
        if (ref.current.contains(e.target)) {
          return;
        }
        setExpanded(false);
      }
      document.addEventListener('click', listener);
      return () => {
        document.removeEventListener('click',listener);
      }
    }
  }, [expanded]);

  return (
    <div className={styles['new-doc']} ref={ref}>
      <Button onClick={()=>setExpanded(!expanded)}>New</Button>
      { expanded &&
      <div className={styles['new-doc__popup']}>
        From URL:
        <GroupedInputs>
          <LabelledInput name='url'
              label='URL'
              value={values['url']}
              onKeyPress={handleKeyPress}
              onChange={handleChange} />
          <Button onClick={createDoc}>Create</Button>
        </GroupedInputs>
        <hr />
        <label>
          From Upload:
          <input type='file' />
        </label>
      </div>
      }
    </div>
  );
}

export function DocumentTable(props) {
  const {
    entities={},
    deleteDoc=(doc)=>null,
    updateDoc=(doc)=>null,
    tags={},
  } = props;
  const history = useHistory();
  const [selected, setSelected] = useState(new Set());
  const selectedDocs = Array.from(selected).map(key => entities[key]);

  const cols = [
    {
      heading: 'Title',
      classNameHeading: styles['doc-table__title-heading'],
      classNameContent: styles['doc-table__title-content'],
      render: x => {
        return (<div>
          <div><Link to={'/annotate/'+x.id}>{x['title']||'(Untitled)'}</Link></div>
          <div>{x['author']}</div>
          <div>
            {
              x['tag_ids']
                .map(id => tags[id])
                .filter(tag => tag)
                .map(tag =>
                  <TagSmall key={tag.id}>{tag.name}</TagSmall>
                )
            }
          </div>
        </div>);
      },
    },{
      heading: 'Last Modified',
      classNameHeading: styles['doc-table__lastmod-heading'],
      classNameContent: styles['doc-table__lastmod-content'],
      render: x => toRelativeDateString(new Date(x.last_modified_at)),
    },
  ];
  const actions = [
    {
      condition: () => true,
      render: doc => <ButtonIcon to={'/annotate/'+doc.id} key='create'>
        <i className='material-icons'>create</i>
      </ButtonIcon>
      
    },{
      condition: () => true,
      render: doc => <ButtonIcon onClick={()=>deleteDoc(doc)} key='delete'>
        <i className='material-icons'>delete</i>
      </ButtonIcon>
    }
  ];
  const batchActions = [
    {
      // Edit a single document
      render: () => {
        let id = Array.from(selected)[0];
        return (
          <ButtonIcon onClick={()=>history.push('/annotate/'+id)} key='open'>
            <i className='material-icons'>create</i>
            <Tooltip>Open Document</Tooltip>
          </ButtonIcon>
        );
      },
      renderCondition: selected => selected.size === 1,
    },{
      // Delete selected documents
      render: () => {
        return (
          <ButtonIcon onClick={()=>deleteDoc(selectedDocs)} key='delete'>
            <i className='material-icons'>delete</i>
            <Tooltip>Delete Document</Tooltip>
          </ButtonIcon>
        );
      },
      renderCondition: selected => selected.size > 0,
    },{
      render: () => {
        // Change tags of selected documents
        return (
          <TagSelectPopup key='tag'
            docs={selectedDocs}
            tags={tags}
            updateEntity={updateDoc} />
        );
      },
      renderCondition: selectedDocIds => selectedDocIds.size > 0,
    },
  ];
  return (
    <Table
      className={styles['doc-table']}
      cols={cols}
      actions={actions}
      batchActions={batchActions}
      data={entities}
      selectable={true}
      onChangeSelected={setSelected}
      selected={selected}
    />
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

function FilterPopup(props) {
  const {
    tags = {},
    onChangeSelected = () => null,
  } = props;
  const [value,setValue] = useState('');
  const [selected,setSelected] = useState(new Set());

  const [expanded,setExpanded] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (expanded) {
      function listener(e) {
        if (!document.contains(e.target)) { // If a tag is clicked, the tag is removed from the DOM before this conditional is evaluated.
          return;
        }
        if (ref.current.contains(e.target)) {
          return;
        }
        setExpanded(false);
      }
      document.addEventListener('click', listener);
      return () => {
        document.removeEventListener('click',listener);
      }
    }
  }, [expanded]);

  function handleChange(selectedIds) {
    setSelected(selectedIds);
    onChangeSelected(selectedIds);
  }

  return (
    <div className={styles['filter']} ref={ref}>
      <ButtonIcon onClick={()=>setExpanded(!expanded)}>
        <i className='material-icons'>
          filter_list
        </i>
      </ButtonIcon>
      { expanded &&
        <div className={styles['filter__popup']}>
          Only show selected tags:
          <TagSelect tags={tags}
            value={value} onChangeValue={setValue}
            selected={selected} onChangeSelected={handleChange}/>
        </div>
      }
    </div>
  );
}

function TagSelectPopup(props) {
  const {
    tags = {},
    docs = {},
  } = props;
  const dispatch = useDispatch();
  const [value,setValue] = useState('');

  const selectedTags = Object.values(docs).reduce(
    (acc, doc) => {
      doc.tag_ids.forEach(id => acc.add(id));
      return acc;
    },
    new Set()
  );
  console.log(docs);

  const [expanded,setExpanded] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (expanded) {
      function listener(e) {
        if (ref.current.contains(e.target)) {
          return;
        }
        setExpanded(false);
      }
      document.addEventListener('click', listener);
      return () => {
        document.removeEventListener('click',listener);
      }
    }
  }, [expanded]);

  function handleCreateTag(tagName) {
    console.log(['Creating new tag', tagName]);
    dispatch(tagActions['create']({name: tagName}));
  }

  function handleChangeSelected(sel) {
    console.log('Updating docs with tags');
    docs.forEach(doc => {
      dispatch(documentActions['update']({
        ...doc,
        tag_ids: Array.from(sel),
        tag_names: Array.from(sel).map(id => tags[id].name),
      }));
    })
  }

  return (
    <div className={styles['tag-select']} ref={ref}>
      <ButtonIcon onClick={()=>setExpanded(!expanded)}><i className='material-icons'>label</i></ButtonIcon>
      { expanded &&
        <div className={styles['tag-select__popup']}>
          <TagSelect tags={tags}
            selected={selectedTags}
            onChangeSelected={handleChangeSelected}
            value={value} onChangeValue={setValue}
            onCreateNewTag={handleCreateTag} />
        </div>
      }
    </div>
  );
}
