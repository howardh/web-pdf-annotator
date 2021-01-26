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
    onKeyDown=()=>null
  } = props;

  const monaco = useMonaco();
  useEffect(()=>{
    if (!monaco) {
      return;
    }

    monaco.languages.registerCompletionItemProvider('markdown',{
      provideCompletionItems: (model, position, context, token)=>{
        let prefix = model.getWordAtPosition(position).word;
        return fetchAutocompleteSuggestions(prefix,'').then(
          response=>{
            return {
              suggestions: response.map(val => {
                return {
                  label: val,
                  kind: monaco.languages.CompletionItemKind.Text,
                  insertText: val,
                };
              })
            }
          }
        )
      }
    });
  },[monaco]);

  return (<div className='text-editor'>
    <Editor
      height="100%"
      width="100%"
      defaultLanguage="markdown"
      defaultValue={text}
      onChange={onChangeText}
    />
  </div>);
}
