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

export default function TextEditor(props) {
  const {
    text,
    onChangeText,
    onKeyDown=()=>null,
    onSave=()=>null
  } = props;

  const monaco = useMonaco();
  const editorRef = useRef(null);

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

  useEffect(()=>{
    if (!editorRef.current || !monaco) {
      return;
    }
    editorRef.current.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      onSave
    ); // FIXME: Is there a way to remove this if ever `onSave` changes? This could cause a memory leak otherwise.
  },[editorRef.current, monaco, onSave]);

  return (<div className='text-editor'>
    <Editor
      height="100%"
      width="100%"
      defaultLanguage="my-markdown"
      defaultValue={text}
      onChange={onChangeText}
      onMount={(editor,m) => { editorRef.current=editor; }}
    />
  </div>);
}
