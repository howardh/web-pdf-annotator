import React from 'react';
import {useEffect, useState, useRef, useMemo} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link, useHistory } from "react-router-dom";
import { createSelector } from 'reselect';

import {
  filterDict,formChangeHandler,generateClassNames,removeFromList,toRelativeDateString
} from './Utils.js';
import {
  Checkbox, TextField, Button
} from './Inputs.js';
import {
  EntityTable
} from './EntityTable.js';
import {
  TagSelector, TagEditor
} from './TagSelector.js';
import {noteActions,tagActions} from './actions/index.js';

import './Notes.scss';

const noteSelector = createSelector(
  [state => state.notes.entities],
  (notes) => filterDict(notes, e => e && !e.deleted_at)
);

export default function NotesPage(props) {
  const {
    userId
  } = props;
  const dispatch = useDispatch();
  const history = useHistory();

  // All notes, including those owned by someone else but shared with me
  const notes = useSelector( noteSelector );
  const [filteredNotes,setFilteredNotes] = useState({});
  const sortedNotes = useMemo(() => 
    Object.values(filteredNotes)
      .sort(
        (a,b) => new Date(b.last_modified_at) - new Date(a.last_modified_at)
      ),
    [filteredNotes]
  );

  // Load notes
  useEffect(() => {
    dispatch(noteActions['fetchMultiple']());
  },[]);

  // Selected notes
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
  const selectedNotes = filterDict(filteredNotes,
    note=>selectedNoteIds.has(note.id));

  // Callbacks
  function deleteSelectedNotes() {
    console.log(['delete',selectedNoteIds]);
    for (let id of selectedNoteIds) {
      dispatch(noteActions['deleteSingle'](id));
    }
    setSelectedNoteIds(new Set());
  }
  function deleteNote(note) {
    if (window.confirm('Delete note '+note.id+'?')) {
      dispatch(noteActions['deleteSingle'](note.id));
      if (selectedNoteIds.has(note.id)) {
        let temp = new Set(selectedNoteIds);
        temp.delete(note.id);
        setSelectedNoteIds(temp);
      }
    }
  }
  function createNote() {
    dispatch(noteActions['create']({
      body: '# New Note',
      parser: 'markdown-it',
    }));
  }

  // Render
  if (!userId) {
    return (<main className='notes-page'>
      <h1>Page not found</h1>
    </main>);
  }

  let columns = [
    {
      heading: 'Note',
      render: note => {
        if (note.body.startsWith('#')) {
          return (<>
            <span className='tags'>
              {note.tag_names.length > 0 && '['+note.tag_names.join('][')+'] '}
            </span>
            <span className='title'>
              {note.body.split('\n')[0].slice(1)}
            </span>
          </>);
        } else {
          return <span>{note.body.slice(0,100)+'...'}</span>;
        }
      },
    },{
      heading: 'Last Modified',
      render: note => toRelativeDateString(new Date(note.last_modified_at)),
      className: 'lastmodified'
    }
  ];
  function renderActionsColumn(note) {
    return <>
      <Link to={'/notes/'+note.id}>
        <i className='material-icons'>create</i>
      </Link>
      <i className='material-icons' onClick={()=>deleteNote(note)}>
        delete
      </i>
      {
        note.document_id &&
        <Link to={'/annotate/'+note.document_id}>
          <i className='material-icons'>description</i>
        </Link>
      }
    </>;
  }
  let actions = [
    {
      render: () => {
        return (
          <Button onClick={createNote}>
            <i className='material-icons'>note_add</i>
          </Button>
        );
      },
      renderCondition: selectedNoteIds => selectedNoteIds.size === 0,
      tooltip: 'Create a new note',
    },{
      render: () => {
        let id = Array.from(selectedNoteIds)[0];
        return (
          <Button onClick={()=>history.push('/notes/'+id)}>
            <i className='material-icons'>create</i>
          </Button>
        );
      },
      renderCondition: selectedNoteIds => selectedNoteIds.size === 1,
      tooltip: 'Edit selected note',
    },{
      render: () => {
        return (
          <TagEditor entities={selectedNotes}
            updateEntity={e=>dispatch(noteActions['update'](e))} />
        );
      },
      renderCondition: selectedDocIds => selectedDocIds.size > 0,
      tooltip: 'Edit tags',
    },{
      render: () => {
        return (
          <Button onClick={deleteSelectedNotes}>
            <i className='material-icons'>delete</i>
          </Button>
        );
      },
      renderCondition: selectedNoteIds => selectedNoteIds.size > 0,
      tooltip: 'Delete selected note(s)',
    },
  ];
  return (<main className='notes-page'>
    <h1>Notes</h1>
    <div className='notes-list-container'>
      <NoteFilterMenu notes={notes} onChangeFilteredNotes={setFilteredNotes} />
      <EntityTable entities={Object.values(sortedNotes)} 
        selectedIds={selectedNoteIds}
        onChangeSelectedIds={setSelectedNoteIds}
        columns={columns}
        renderActionsColumn={renderActionsColumn}
        actions={actions}
      />
    </div>
  </main>);
}

function NoteFilterMenu(props) {
  const {
    notes,
    onChangeFilteredNotes
  } = props;
  const dispatch = useDispatch();

  const tags = useSelector(state => state.tags.entities);

  const [showStandalone, setShowStandalone] = useState(true);
  const [showAnn, setShowAnn] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const [showOrphan, setShowOrphan] = useState(false);
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
    onChangeFilteredNotes(filterDict(
      notes,
      note => {
        for (let t of tagFilters) {
          if (note.tag_names.indexOf(t) === -1) {
            return false;
          }
        }
        if (showStandalone && !note.document_id && !note.annotation_id && !note.orphaned) {
          return true;
        }
        if (showDoc && note.document_id && !note.annotation_id) {
          return true;
        }
        if (showAnn && note.annotation_id) {
          return true;
        }
        if (showOrphan && note.orphaned) {
          return true;
        }
        return false;
      }
    ));
  }, [notes, showStandalone, showAnn, showDoc, showOrphan, tagFilters]);

  return (<div className='note-filter-container'>
    <h2>Filters</h2>
    <h3>Note Types</h3>
    <label>
      <Checkbox checked={showStandalone} onChange={()=>setShowStandalone(!showStandalone)} />
      <span>Standalone</span>
    </label>
    <label>
      <Checkbox checked={showAnn} onChange={()=>setShowAnn(!showAnn)} />
      <span>Annotation</span>
    </label>
    <label>
      <Checkbox checked={showDoc} onChange={()=>setShowDoc(!showDoc)} />
      <span>Document</span>
    </label>
    <label>
      <Checkbox checked={showOrphan} onChange={()=>setShowOrphan(!showOrphan)} />
      <span>Orphaned</span>
    </label>
    <h3>Tag Filters</h3>
    <TagSelector tags={tags} selectedTags={tagFilters} onToggleTagId={toggleTag}/>
  </div>);
}
