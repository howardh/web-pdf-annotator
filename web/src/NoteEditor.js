import React from 'react';
import { useEffect, useState, useRef } from 'react';
import {useDispatch,useSelector} from 'react-redux';
import { useParams, useLocation, useHistory } from "react-router-dom";
import * as commonmark from 'commonmark';
import * as MarkdownIt from 'markdown-it';
import * as MarkdownItMathjax from 'markdown-it-mathjax';
import MarkdownItLineNumber from './MarkdownItPlugins/linenumber.js';
import MarkdownItLink from './MarkdownItPlugins/link.js';
import * as pdfjsLib from 'pdfjs-dist/webpack';

import { noteActions } from './actions';
import TextEditor from './TextEditor';

import './NoteEditor.scss';

const md = MarkdownIt()
  .use(MarkdownItMathjax())
  .use(MarkdownItLineNumber())
  .use(MarkdownItLink());

export default function NoteEditorPage(props) {
  const dispatch = useDispatch();
  const {
    userId,
    noteId
  } = props;

  const note = useSelector(state => state.notes.entities[noteId]);
  const [editorScrollPos, setEditorScrollPos] = useState(null);

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
  function handleScroll({visibleRanges}) {
    setEditorScrollPos(visibleRanges[0].startLineNumber);
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
      <TextEditor text={note.body} onChangeText={updateBody} onScroll={handleScroll}/>
    </div>
    <div className='preview-container'>
      <NoteViewer note={note} editorScrollPos={editorScrollPos} />
    </div>
  </main>);
}

export function NoteViewer(props) {
  const {
    note,
    editorScrollPos // Line number
  } = props;

  const ref = useRef(null);

  // Mathjax
  useEffect(()=>{
    // Redo typesetting whenever the annotation changes
    if (!ref.current) { return; }
    try {
      window.MathJax.typeset([ref.current]);
    } catch (error) {
      console.error(error);
    }
  }, [note, ref.current]);

  // Parse Markdown
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

  // Force rerenders
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

  // Scrolling sync with editor
  useEffect(() => {
    // Look for closest line number in rendered markdown and scroll to it
    const elems = ref.current.getElementsByTagName('p'); // Only <p> tags have the `data-line` attribute currently.
    if (elems.length === 0) {
      return;
    }
    let lastElem = elems[0];
    for (let elem of elems) {
      let lineNum = parseInt(elem.getAttribute('data-line'));
      if (lineNum > editorScrollPos) {
        lastElem.scrollIntoView({behaviour: 'smooth'});
        break;
      }
      lastElem = elem;
    }
  }, [editorScrollPos]);

  if (!note) {
    return <div></div>;
  }
  if (refreshing) {
    return <div></div>;
  }

  let parsedBodyDiv = null;
  switch (note.parser) {
    case 'plaintext': {
      return (<pre ref={ref} className='rendered-note'>{note.body}</pre>);
      break;
    } case 'markdown-it': {
      let parsedBody = md.render(note.body);
      return (<div ref={ref} className='rendered-note' dangerouslySetInnerHTML={{__html: parsedBody}} />);
    } case 'commonmark': {
      let reader = new commonmark.Parser();
      let writer = new commonmark.HtmlRenderer({safe: true});
      let parsed = reader.parse(note.body); // parsed is a 'Node' tree
      let parsedBody = writer.render(parsed);
      return (<div ref={ref} className='rendered-note' dangerouslySetInnerHTML={{__html: parsedBody}} />);
    } default: {
      return null;
    }
  }
  return parsedBodyDiv;
}
