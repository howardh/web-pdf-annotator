import React from 'react';
import { useEffect, useState, useRef } from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { useParams, useLocation, useHistory } from "react-router-dom";
import * as commonmark from 'commonmark';
import * as MarkdownIt from 'markdown-it';
import * as MarkdownItMathjax from 'markdown-it-mathjax';
import * as pdfjsLib from 'pdfjs-dist/webpack';

import { noteActions } from './actions';
import TextEditor from './TextEditor';

import './NoteEditor.scss';

const md = MarkdownIt().use(MarkdownItMathjax());

export default function NoteEditorPage(props) {
  const dispatch = useDispatch();
  const {
    userId,
    noteId
  } = props;

  const note = useSelector(state => state.notes.entities[noteId]);

  // Load Note
  useEffect(() => {
    if (!noteId) {
      return;
    }
    dispatch(noteActions['fetchSingle'](noteId));
  },[noteId]);

  // Callbacks
  function updateBody(text) {
    dispatch(noteActions['update']({
      ...note,
      body: text
    }));
  }

  // Render
  if (!userId) {
    return (<main className='note-editor-page'>
      <h1>Page not found</h1>
    </main>);
  }
  if (!note) {
    return (<main className='note-editor-page'>
      <h1>Loading...</h1>
    </main>);
  }
  return (<main className='note-editor-page'>
    <div className='editor-container'>
      <TextEditor text={note.body} onChangeText={updateBody}/>
    </div>
    <div className='preview-container'>
      <NoteViewer note={note} />
    </div>
  </main>);
}

export function NoteViewer(props) {
  const {
    note,
  } = props;

  // Mathjax
  useEffect(()=>{
    // Redo typesetting whenever the annotation changes
    window.MathJax.typeset();
  }, [note]);

  function parseBody(note) {
    switch (note.parser) {
      case 'plaintext': {
        return note.body;
      } case 'commonmark': {
        let reader = new commonmark.Parser();
        let writer = new commonmark.HtmlRenderer({safe: true});
        let parsed = reader.parse(note.body); // parsed is a 'Node' tree
        let parsedBody = writer.render(parsed);
        return parsedBody;
      } case 'markdown-it': {
        let parsedBody = md.render(note.body);
        return parsedBody;
      } default:
        return 'Error: Invalid Parser ('+(note.parser)+')';
    }
  }

  const [refreshing,setRefreshing] = useState(false);
  function refresh() {
    // Momentarily hide the div to force a rerender
    setRefreshing(true);
  }
  useEffect(()=>{
    if (!refreshing) {
      return;
    }
    setRefreshing(false);
  },[refreshing]);

  if (!note) {
    return <div></div>;
  }
  if (refreshing) {
    return <div></div>;
  }

  let parsedBodyDiv = null;
  switch (note.parser) {
    case 'plaintext': {
      return (<pre>{note.body}</pre>);
      break;
    } case 'markdown-it': {
      let parsedBody = md.render(note.body);
      return (<div dangerouslySetInnerHTML={{__html: parsedBody}} />);
    } case 'commonmark': {
      let reader = new commonmark.Parser();
      let writer = new commonmark.HtmlRenderer({safe: true});
      let parsed = reader.parse(note.body); // parsed is a 'Node' tree
      let parsedBody = writer.render(parsed);
      return (<div dangerouslySetInnerHTML={{__html: parsedBody}} />);
    } default: {
      return null;
    }
  }
  return parsedBodyDiv;
}
