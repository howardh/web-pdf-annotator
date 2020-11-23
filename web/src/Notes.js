import React from 'react';
import {useEffect, useState, useRef} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { Link, useHistory } from "react-router-dom";

import {
  filterDict,formChangeHandler,generateClassNames,removeFromList
} from './Utils.js';
import {
  Checkbox, TextField, Button
} from './Inputs.js';
import {
  EntityTable
} from './EntityTable.js';
import {noteActions,tagActions} from './actions/index.js';

import './Notes.scss';

export default function NotesPage(props) {
  const {
    userId
  } = props;
  const dispatch = useDispatch();
  const history = useHistory();

  // All notes, including those owned by someone else but shared with me
  const notes = filterDict(
    useSelector(state => state.notes.entities),
    e => e && !e.deleted_at
  );
  const sortedNotes = Object.values(notes).sort(
    (a,b) => new Date(b.last_modified_at) - new Date(a.last_modified_at)
  );

  // Load notes
  useEffect(() => {
    dispatch(noteActions['fetchMultiple']());
  },[]);

  // Selected notes
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());

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
          return <span className='title'>{note.body.split('\n')[0].slice(1)}</span>
        } else {
          return <span>{note.body.slice(0,100)+'...'}</span>;
        }
      },
    },{
      heading: 'Last Modified',
      render: note => new Date(note.last_modified_at).toLocaleString(),
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
    },{
      render: () => {
        return (
          <Button onClick={deleteSelectedNotes}>
            <i className='material-icons'>delete</i>
          </Button>
        );
      },
      renderCondition: selectedNoteIds => selectedNoteIds.size > 0,
    },
  ];
  return (<main className='notes-page'>
    <h1>Notes</h1>
    <EntityTable entities={Object.values(sortedNotes)} 
      selectedIds={selectedNoteIds}
      onChangeSelectedIds={setSelectedNoteIds}
      columns={columns}
      renderActionsColumn={renderActionsColumn}
      actions={actions}
    />
  </main>);
}

