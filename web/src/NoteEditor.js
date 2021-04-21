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
  const [selectedLines, setSelectedLines] = useState(null);

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
      <TextEditor text={note.body} onChangeText={updateBody} onScroll={handleScroll} selectedLines={selectedLines} />
    </div>
    <div className='preview-container'>
      <NoteViewer note={note} editorScrollPos={editorScrollPos} onChangeSelectedLines={setSelectedLines} />
    </div>
  </main>);
}

function immediateChild(parent, elem) {
  // Find the immediate child element of `parent` containing `elem`.
  if (!parent.contains(elem)) {
    return;
  }
  if (!elem) {
    return;
  }
  while (elem.parentElement !== parent) {
    elem = elem.parentNode; // Not sure if node or elem is more appropriate
    if (!parent.contains(elem)) {
      return; // Does this ever happen?
    }
  }
  return elem;
}

export function NoteViewer(props) {
  const {
    note,
    editorScrollPos, // Line number
    onChangeSelectedLines,
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

  // Map selection to line number
  const [selectionLines, setSelectionLines] = useState(null);
  function updateSelectionLines() {
    if (!onChangeSelectedLines) {
      return; // Don't bother with the computations if we're not using the results.
    }
    let sel = window.getSelection();
    if (sel.rangeCount === 0) {
      setSelectionLines(null);
    }
    let [startLineNumber,endLineNumber] = new Array(sel.rangeCount).fill(null).map(
      (_,i) => sel.getRangeAt(i)
    ).map(
      range => {
        if (!range.intersectsNode(ref.current)) {
          return null; // Ignore selections that aren't in the rendered markdown
        }
        let startElem = immediateChild(ref.current, range.startContainer);
        let endElem = immediateChild(ref.current, range.endContainer);
        let children = Array.from(ref.current.children);
        let startIndex = children.indexOf(startElem);
        let endIndex = children.indexOf(endElem);
        window.x = {startElem, endElem, children, startIndex, endIndex, range};
        // We want startIndex < endIndex
        if (endIndex < startIndex) {
          // Swap values
          endIndex ^= startIndex;
          startIndex ^= endIndex;
          endIndex ^= startIndex;
        }
        // Handle selections endpoints out of range
        if (range.intersectsNode(children[0])) {
          startIndex = 0;
        }
        if (range.intersectsNode(children[children.length-1])) {
          endIndex = children.length-1;
        }
        // Find nearest line numbers
        let startLineNumber = [null,null];
        let endLineNumber = [null,null];
        for (let j = startIndex; j >= 0; j--) {
          let child = children[j];
          if (!child) {
            return null; // XXX: Can't reproduce this consistently enough to fix properly.
          }
          let ln = child.getAttribute('data-line');
          if (ln) {
            startLineNumber[0] = ln;
            endLineNumber[0] = ln;
            break;
          }
        }
        for (let j = startIndex; j < children.length; j++) {
          let child = children[j];
          if (!child) {
            return null; // XXX: Can't reproduce this consistently enough to fix properly.
          }
          let ln = child.getAttribute('data-line');
          if (ln) {
            if (!startLineNumber[1]) {
              startLineNumber[1] = ln;
            }
            if (j <= endIndex) {
              endLineNumber[0] = ln;
            }
            if (j >= endIndex) {
              endLineNumber[1] = ln;
              break;
            }
          }
        }
        return [startLineNumber, endLineNumber];
      }
    ).filter(
      x => x // Remove null values
    ).reduce(
      ([start, end], [newStart, newEnd]) => {
        if (!start[0]) {
          return [newStart,newEnd];
        }
        return[[
          Math.min(start[0], parseInt(newStart[0])),
          Math.min(start[1], parseInt(newStart[1])),
        ],[
          Math.max(end[0], parseInt(newEnd[0])),
          Math.max(end[1], parseInt(newEnd[1])),
        ]];
      }, [[null,null],[null,null]]
    )
    if (startLineNumber[0] && startLineNumber[1] && endLineNumber[0] && endLineNumber[1]) {
      onChangeSelectedLines([startLineNumber,endLineNumber]);
    }
  }

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
      let env = {}; // Pass data to the custom parsers with this
      let parsedBody = md.render(note.body, env);
      return (<div ref={ref} className='rendered-note' onMouseUp={updateSelectionLines} dangerouslySetInnerHTML={{__html: parsedBody}} />);
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
