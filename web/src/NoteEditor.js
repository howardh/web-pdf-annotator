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
    </div>
  </main>);
}
