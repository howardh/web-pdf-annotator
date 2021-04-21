import React from 'react';
import {useEffect, useState, useRef, forwardRef, useMemo} from 'react';
import { generateClassNames } from '../Utils.js';
import axios from 'axios';

import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";

import './TextEditor.scss';

function fetchAutocompleteSuggestions(prefix,suffix){
  return axios.post(
    process.env.REACT_APP_SERVER_ADDRESS+"/data/notes/suggestions",
    {prefix,suffix},
    {withCredentials: true}
  ).then(function(response){
    return response.data.suggestions;
  }).catch(error => {
    console.error(error);
    return [];
  });
}

const DEFAULT_MONACO_OPTIONS = {
  wordWrap: 'on',
  wrappingIndent: 'same',
};

export default function TextEditor(props) {
  const {
    text,
    onChangeText,
    selectedLines,
    scrollToSelectedLines = true,
    onScroll,
    onKeyDown=()=>null,
    onSave=()=>null,
    options={}, // Monaco IEditorOptions
    debounce=500, // Milliseconds
  } = props;

  const monaco = useMonaco();
  const editorRef = useRef(null);

  // Initialize Monaco editor
  useEffect(()=>{
    if (!monaco) {
      return;
    }

    monaco.languages.register({ id: 'my-markdown' });

    monaco.languages.registerCompletionItemProvider('my-markdown',{
      provideCompletionItems: (model, position, context, token)=>{
        let line = model.getLinesContent()[position.lineNumber-1];
        let prefix = line.slice(0,position.column-1);
        let suffix = line.slice(position.column-1);
        let nearestSpaceIndex = prefix.lastIndexOf(' ');
        let wordFromSpace = prefix.slice(nearestSpaceIndex+1);
        return fetchAutocompleteSuggestions(wordFromSpace,suffix).then(
          response=>{
            return {
              suggestions: response.map(val => {
                return {
                  label: val,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: val,
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: nearestSpaceIndex+2, // XXX: Why do I need +2?
                    endLineNumber: position.lineNumber,
                    endColumn: position.column-1,
                  },
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                };
              }),
              incomplete: true
            }
          }
        )
      },
      triggerCharacters: ['\\','[']
    });
  },[monaco]);

  // Highlight selected lines and scroll to it
  const oldDecorationRef = useRef([]);
  const ignoreNextScrollRef = useRef(0);
  useEffect(() => {
    if (!selectedLines) { return; }
    if (!editorRef.current) { return; }
    let startLine = parseInt(selectedLines[0][0]);
    let endLine = parseInt(selectedLines[1][1]);
    oldDecorationRef.current = editorRef.current.deltaDecorations(oldDecorationRef.current, [
      { range: new monaco.Range(startLine,1,endLine,1), options: { isWholeLine: true, linesDecorationsClassName: 'selected-lines' } }
    ]);

    if (scrollToSelectedLines) {
      ignoreNextScrollRef.current = 2;
      editorRef.current.revealRange(new monaco.Range(startLine,1,endLine,1));
    }
  }, [selectedLines]);

  // Custom keybindings and event handlers
  useEffect(()=>{
    if (!editorRef.current || !monaco) {
      return;
    }
    const dispSave = editorRef.current.addAction({
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: onSave,
      id: 'save_text',
      label: 'Save Text',
    });
    const dispScroll= editorRef.current.onDidScrollChange((e) => {
      if (!e.scrollTopChanged) {
        return;
      }
      if (!onScroll) {
        return;
      }
      const visibleRanges = editorRef.current.getVisibleRanges();
      console.log(['scrolling to', visibleRanges,e]);
      let data = {
        visibleRanges
      };
      onScroll(data);
    });
    return () => {
      dispSave.dispose();
      dispScroll.dispose();
    };
  },[editorRef.current, onSave]);

  // Debounce
  const timeoutRef = useRef(null);
  function handleChange(val) {
    if (debounce > 0) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => onChangeText(val), debounce);
    } else {
      onChangeText(val);
    }
  }

  return (<div className='text-editor'>
    <Editor
      height="100%"
      width="100%"
      defaultLanguage="my-markdown"
      defaultValue={text}
      options={{...DEFAULT_MONACO_OPTIONS, ...options}}
      onChange={handleChange}
      onMount={(editor,m) => { editorRef.current=editor; }}
    />
  </div>);
}
