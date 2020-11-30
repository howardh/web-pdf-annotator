import React from 'react';
import {useEffect, useState, useRef, forwardRef, useMemo} from 'react';
import { generateClassNames } from '../Utils.js';
import axios from 'axios';

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

function isElementInViewport (el) {
  let rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /* or $(window).height() */
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
  );
}

export default function TextEditor(props) {
  const {
    text,
    onChangeText,
    historyLimit=30,
    onKeyDown=()=>null
  } = props;

  const border = 1; // Border of .text-editor element

  const lines = text.split('\n');
  const ref = useRef(null);
  const linesRef = useRef(null);
  const textareaRef = useRef(null);
  const caretRef = useRef(null);
  const autocompleteRef = useRef(null);
  window.r = ref.current;
  window.lr = linesRef.current;
  window.cr = caretRef.current;

  // Measure size of a character
  const sizeCheckRef = useRef(null);
  const [charDims,setCharDims] = useState({w:0,h:0});
  const linesPerPage = (linesRef.current && charDims.h > 0) 
    ? Math.max(Math.floor(linesRef.current.getBoundingClientRect().height/charDims.h)-2,1)
    : 1;
  useEffect(()=>{
    if (!sizeCheckRef.current) {
      return;
    }
    let rect = sizeCheckRef.current.getBoundingClientRect();
    setCharDims({w:rect.width, h:rect.height});
  },[sizeCheckRef.current]);

  // Caret coordinates
  const [caretXYCoords,setCaretXYCoords] = useState([0,0]); // [x,y] in pixels of top-left
  const [caretTextCoords,setCaretTextCoords] = useState([0,0]); // [line num, col]
  const [selectionStart,setSelectionStart] = useState([0,0]); // [line num, col]

  // Caret (X,Y) pixel coordinates
  function textToXYCoords(lineNum,col) {
    if (col >= lines[lineNum].length) {
      col = lines[lineNum].length;
    }
    let textOffset = [
      linesRef.current.children[2].getBoundingClientRect().left-linesRef.current.getBoundingClientRect().left-border+linesRef.current.scrollLeft,
      linesRef.current.children[2].getBoundingClientRect().top-linesRef.current.getBoundingClientRect().top-border+linesRef.current.scrollTop
    ];
    return [
      textOffset[0]+col*charDims.w,
      textOffset[1]+lineNum*charDims.h
    ];
  }
  function updateCaretXYFromCoords(caretPos) {
    setCaretXYCoords(textToXYCoords(caretPos[0],caretPos[1]));
  }
  useEffect(()=>{
    updateCaretXYFromCoords(caretTextCoords);
  },[caretTextCoords]);
  useEffect(()=>{ // Scroll caret into view
    if (!caretRef.current) {
      return;
    }
    const {width,height} = linesRef.current.getBoundingClientRect();
    const scrollTop = linesRef.current.scrollTop;
    const scrollLeft = linesRef.current.scrollLeft;
    const [x,y] = caretXYCoords;
    const marginLeft = linesRef.current.scrollLeft+linesRef.current.children[2].getBoundingClientRect().left-linesRef.current.getBoundingClientRect().left;
    const marginTop = linesRef.current.scrollTop+linesRef.current.children[2].getBoundingClientRect().top-linesRef.current.getBoundingClientRect().top;
    let st = scrollTop;
    let sl = scrollLeft;
    if (x > width+scrollLeft-marginLeft) {
      sl += x-(width+scrollLeft)+marginLeft;
    } else if (x < scrollLeft+marginLeft) {
      sl = x-marginLeft;
    }
    if (y > height+scrollTop-marginTop*2+charDims.h) {
      st += y-(height+scrollTop)+marginTop*2+charDims.h;
    } else if (y < scrollTop+marginTop) {
      st = y-marginTop;
    }
    linesRef.current.scroll(sl,st);
  }, [caretXYCoords]);

  function selectionToTextCoords(node,offset) {
    let line = null;
    if (!node) {
      return null;
    }
    if (node.nodeName === '#text') {
      line = node.parentNode.closest('.line');
    } else if (node === linesRef.current) {
      return [0,0];
    } else if (node.matches('.selected')) {
      line = node.parentNode;
    } else if (node.classList.contains('line')) {
      line = node;
      if (offset === 1) {
        offset = node.textContent.length;
      }
    } else {
      line = node.closest('.line');
    }
    if (!line) {
      console.error('Unable to find selected line');
      return null;
    }
    let lineNum = Array.from(linesRef.current.children).indexOf(line);
    if (lineNum === -1) {
      // This should never happen
      console.error('Line not found in DOM');
      return null;
    }
    lineNum -= 2; // First two elements are the size check divs and the caret
    return [lineNum,offset];
  }
  function updateCoordsFromSelection() {
    if (!linesRef.current) {
      return;
    }
    let sel = window.getSelection();
    if (sel.rangeCount === 0) {
      return;
    }
    for (let i = 0; i < sel.rangeCount; i++) {
      const range = sel.getRangeAt(i);
      window.ran = range;
      // Make sure that there is a selection and it is within the text editor
      if (!linesRef.current.contains(range.startContainer)) {
        continue;
      }
      if (!range.endContainer) {
        console.error('I don\'t think this should happen anymore');
        continue;
      }
      // Selection start
      let startPos = selectionToTextCoords(range.startContainer,range.startOffset);
      if (selectionStart === null ||
          startPos[0] !== selectionStart[0] ||
          startPos[1] !== selectionStart[1]) {
        setSelectionStart(startPos);
      }
      // Selection end
      let endPos;
      if (linesRef.current.contains(range.endContainer)) {
        endPos = selectionToTextCoords(range.endContainer,range.endOffset);
      } else if (range.intersectsNode(linesRef.current.children[0])) {
        endPos = [0,0];
      } else {
        endPos = [lines.length-1,lines[lines.length-1].length];
      }
      if (endPos[0] !== caretTextCoords[0] ||
          endPos[1] !== caretTextCoords[1]) {
        setCaretTextCoords(endPos);
      }
      sel.removeAllRanges();
      break;
    }
  }

  // Autocomplete
  const [currentWord, setCurrentWord] = useState(null);
  const [autocompleteXYCoords,setAutocompleteXYCoords] = useState([0,0]);
  const [autocompleteSuggestions,setAutocompleteSuggestions] = useState([]);
  const [autocompleteSelection,setAutocompleteSelection] = useState(null);
  function updateAutocompleteXYCoords() {
    if (!linesRef.current || !autocompleteRef.current) {
      return;
    }
    // top-left corner of div corresponds to bottom of the caret
    let left = caretXYCoords[0]-linesRef.current.scrollLeft;
    let top = caretXYCoords[1]+charDims.h-linesRef.current.scrollTop;
    // Check if the div is outside of the viewport
    let {
      width: vpWidth,
      height: vpHeight
    } = document.body.getBoundingClientRect();
    let {
      width: acWidth,
      height: acHeight
    } = autocompleteRef.current.getBoundingClientRect();
    if (left+acWidth > window.scrollX+vpWidth) {
      /*
       * left+acWidth = window.scrollX+vpWidth
       * left = window.scrollX+vpWidth-acWidth
       * Then subtract 1 so the border isn't cut off
       */
      left = window.scrollX+vpWidth-acWidth-1;
    }
    if (top+acHeight > window.scrollY+vpHeight) {
      // If it goes offscreen from below, then move the div above the caret
      top = caretXYCoords[1]-acHeight;
    }
    
    // Update coordinates only if they've changed
    if (left !== autocompleteXYCoords[0] || top !== autocompleteXYCoords[1]) {
      setAutocompleteXYCoords([left,top]);
    }
  }
  function handleScroll(e) {
    updateAutocompleteXYCoords();
  }
  useEffect(()=>{ // Update suggestions
    if (!currentWord) {
      setAutocompleteSuggestions([]);
      setAutocompleteSelection(null);
    } else {
      fetchAutocompleteSuggestions(currentWord.before).then(sug => {
        setAutocompleteSuggestions(sug);
        setAutocompleteSelection(0);
      });
    }
  },[currentWord]);
  updateAutocompleteXYCoords();
  function computeCurrentWord(caretPos,lines) {
    const [lineNum,col2] = caretPos;
    let line = lines[lineNum];
    // Find closest preceeding space
    let col1 = col2;
    while (line[col1] !== ' ' && col1 > 0) {
      col1 -= 1;
    }
    if (line[col1] === ' ') {
      col1 += 1;
    }
    // Find closest following space
    let col3 = col2;
    while (line[col3] !== ' ' && col3 < line.length) {
      col3 += 1;
    }

    if (col1 === col2) {
      return null;
    }

    return {
      before: line.slice(col1,col2),
      after: line.slice(col2,col3),
      startPos: [lineNum,col1],
      endPos: [lineNum,col3]
    };
  }
  function updateCurrentWord(caretPos,lines) {
    setCurrentWord(computeCurrentWord(caretPos,lines));
  }
  function selectSuggestion(suggestion) {
    execute(addText, {
      startPos: currentWord.startPos,
      caretPos: caretTextCoords,
      addedText: suggestion,
      lines: lines
    });
    setAutocompleteSelection([]);
    setCurrentWord(null);
  }
  function autocompleteOnKeyDown(e) {
    if (autocompleteSuggestions.length === 0) {
      return;
    }
    switch(e.key) {
      case 'Enter':
        selectSuggestion(autocompleteSuggestions[autocompleteSelection]);
        e.stopPropagation();
        break;
      case 'ArrowUp':
        setAutocompleteSelection(
          (autocompleteSelection-1+autocompleteSuggestions.length)%autocompleteSuggestions.length
        );
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'ArrowDown':
        setAutocompleteSelection(
          (autocompleteSelection+1)%autocompleteSuggestions.length
        );
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Escape':
        setAutocompleteSelection(null);
        setAutocompleteSuggestions([])
        break;
      default:
        break;
    }
  }

  // Event handlers
  const [past,setPast] = useState([]);
  const [future,setFuture] = useState([]);
  function addUndoCommand(command) {
    setPast([
      command,
      ...past
    ].slice(0,historyLimit));
    setFuture([]);
  }
  function addRedoCommand(command) {
    setFuture([
      command,
      ...future
    ]);
    setPast(past.slice(1));
  }
  function processCommandOutput(output) {
    const {
      startPos,
      caretPos,
      lines: newLines,
      undo=null
    } = output;
    if (newLines !== lines) {
      onChangeText(newLines.join('\n'));
      updateCurrentWord(caretPos,newLines);
    } else {
      setCurrentWord(null);
    }
    setCaretTextCoords(caretPos);
    setSelectionStart(startPos);
    return output;
  }
  const processCommandOutput2 = {
    execute: function(output) {
      if (!output.undo) {
        return;
      }
      setPast([
        output.undo,
        ...past
      ]);
      setFuture([]);
    },
    undo: function(output) {
      setFuture([
        output.undo,
        ...future
      ]);
      setPast(past.slice(1));
    },
    redo: function(output) {
      setPast([
        output.undo,
        ...past
      ]);
      setFuture(future.slice(1));
    }
  };
  function execute(func,params,commandType='execute') {
    let output = func({...params,lines});
    if ('then' in output) {
      output
        .then(processCommandOutput)
        .then(processCommandOutput2[commandType]);
    } else {
      processCommandOutput(output);
      processCommandOutput2[commandType](output);
    }
  }
  function undo() {
    if (past.length === 0) {
      return;
    }
    execute(past[0].func,past[0].params,'undo');
  }
  function redo() {
    if (future.length === 0) {
      return;
    }
    execute(future[0].func,future[0].params,'redo');
  }
  const editorEventHandlers = {
    onKeyDown: function(e) {
      onKeyDown(e);
      if (e.nativeEvent.cancelBubble) {
        return;
      }

      autocompleteOnKeyDown(e);
      if (e.nativeEvent.cancelBubble) {
        return;
      }

      if (e.key.length === 1) {
        if (!e.ctrlKey) {
          textareaRef.current.focus();
        } else { // Ctrl + ...
          switch (e.key) {
            case 'a':
              execute(selectAll, {
                startPos: selectionStart,
                caretPos: caretTextCoords,
                lines: lines
              });
              e.preventDefault();
              break;
            case 'v':
              textareaRef.current.focus();
              break;
            case 'x':
              execute(cut, {
                startPos: selectionStart,
                caretPos: caretTextCoords,
                lines: lines
              });
              break;
            case 'y':
              redo();
              break;
            case 'z':
              undo();
              break;
          }
        }
      } else {
        switch(e.key) {
          case 'Escape':
            setCurrentWord(null);
            break;
          case 'Backspace':
            execute(backspace, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines
            });
            break;
          case 'Delete':
            execute(del, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines
            });
            break;
          case 'Enter':
            textareaRef.current.focus();
            break;
          case 'Tab':
            execute(addText, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              addedText: '  '
            });
            e.preventDefault();
            break;
          case 'ArrowUp':
            execute(moveCaretLine, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
              dLine: -1,
              shift: e.shiftKey,
            });
            window.getSelection().removeAllRanges();
            e.preventDefault();
            break;
          case 'ArrowDown':
            execute(moveCaretLine, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
              dLine: 1,
              shift: e.shiftKey,
            });
            window.getSelection().removeAllRanges();
            e.preventDefault();
            break;
          case 'ArrowLeft':
            execute(moveCaretCol, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
              dCol: -1,
              shift: e.shiftKey,
              ctrl: e.ctrlKey,
            });
            window.getSelection().removeAllRanges();
            e.preventDefault();
            e.stopPropagation();
            break;
          case 'ArrowRight':
            execute(moveCaretCol, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
              dCol: 1,
              shift: e.shiftKey,
              ctrl: e.ctrlKey,
            });
            window.getSelection().removeAllRanges();
            e.preventDefault();
            e.stopPropagation();
            break;
          case 'PageUp':
            execute(moveCaretLine, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
              dLine: -linesPerPage,
              shift: e.shiftKey,
            });
            e.preventDefault();
            break;
          case 'PageDown':
            execute(moveCaretLine, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
              dLine: linesPerPage,
              shift: e.shiftKey,
            });
            e.preventDefault();
            break;
          case 'Home':
            execute(home, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
            });
            e.preventDefault();
            break;
          case 'End':
            execute(end, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
            });
            e.preventDefault();
            break;
          default:
            console.log(e.key);
            break;
        }
      }
    },
    onMouseUp: function(e) {
      updateCoordsFromSelection();
    },
    onMouseEnter: function(e) {
      if (e.buttons === 0) { // Left moues button down
        updateCoordsFromSelection();
      } else {
        // Put focus back onto the text area
      }
    },
  }
  const textareaEventHandlers = {
    onChange: function(e) {
      if (e.target.value.length === 0) {
        return;
      }
      execute(addText, {
        startPos: selectionStart,
        caretPos: caretTextCoords,
        addedText: e.target.value,
        lines: lines
      });
    },
  }

  const caretStyle = {
    top: caretXYCoords[1]+'px',
    left: caretXYCoords[0]+'px',
    width: 0,
    height: charDims.h,
  };
  const textareaStyle = {
    top: caretXYCoords[1]+'px',
    left: caretXYCoords[0]+'px',
  };
  const autocompleteStyle = {
    top: autocompleteXYCoords[1]+'px',
    left: autocompleteXYCoords[0]+'px',
    display: autocompleteSuggestions.length > 0 ? 'block' : 'none',
  };
  return (<div className='text-editor' ref={ref} tabIndex={-1} {...editorEventHandlers}>
    <div className='hidden'>
      <pre className='size-check' ref={sizeCheckRef}>a</pre>
    </div>
    <div className='lines-container' ref={linesRef} onScroll={handleScroll} >
      <div className='caret' style={caretStyle} ref={caretRef}></div>
      <textarea ref={textareaRef} style={textareaStyle} value={''} {...textareaEventHandlers}/>
      <Lines lines={lines}
          selectionStart={selectionStart}
          caretPos={caretTextCoords} />
    </div>
    <div className='autocomplete-container' style={autocompleteStyle}
      ref={autocompleteRef}>
      {
        autocompleteSuggestions.map((sug,i) => {
          let cn = generateClassNames({
            suggestion: true,
            selected: autocompleteSelection === i
          });
          return (<div key={i} className={cn} onClick={()=>selectSuggestion(sug)}>
            {sug}
          </div>);
        })
      }
    </div>
  </div>);
}

function Lines(props) {
  const {
    lines = [],
    selectionStart,
    caretPos
  } = props;

  let {
    lineNum1, col1,
    lineNum2, col2
  } = orderCoordinates(selectionStart,caretPos);

  function lineHasSelection(lineNum) {
    if (lineNum1 === lineNum2 && col1 === col2) return false;
    if (lineNum < lineNum1) return false;
    if (lineNum > lineNum2) return false;
    return true;
  }

  return (<>
    {
      lines.map((line,lineNum) => {
        if (lineHasSelection(lineNum)) {
          if (lineNum1 === lineNum2) {
            return (
              <pre className='line' key={lineNum}>
                {line.slice(0,col1)}
                <span className='selected'>{line.slice(col1,col2)}</span>
                {line.slice(col2)}
              </pre>
            );
          } else if (lineNum === lineNum1) {
            return (
              <pre className='line' key={lineNum}>
                {line.slice(0,col1)}
                <span className='selected'>{line.slice(col1)}</span>
              </pre>
            );
          } else if (lineNum === lineNum2) {
            return (
              <pre className='line' key={lineNum}>
                <span className='selected'>{line.slice(0,col2)}</span>
                {line.slice(col2)}
              </pre>
            );
          } else {
            return (
              <pre className='line' key={lineNum}>
                <span className='selected'>{line}</span>
              </pre>
            );
          }
        } else {
          return (
            <pre className='line' key={lineNum}>
              {line}
            </pre>
          );
        }
      })
    }
  </>)
}

export function textCoordToSelection(startPos,caretPos,lines,lineNodes) {
  let [startLine,startCol] = startPos;
  let [caretLine,caretCol] = caretPos;
  // If start or end coordinate is on an empty line, then move that selection over to the next non-empty line, since we can't select an empty line
  while (lines[startLine].length === 0) { // Starting line is empty
    if (startLine > caretLine) { // Selecting upwards
      startLine -= 1;
      startCol = lines[startLine].length;
    } else if (startLine < caretLine) { // Selecting downwards
      startLine += 1;
      startCol = 0;
    } else {
      return null;
    }
  }
  while (lines[caretLine].length === 0) {
    if (startLine > caretLine) {
      caretLine += 1;
      caretCol = 0;
    } else if (startLine < caretLine) {
      caretLine -= 1;
      caretCol = lines[caretLine].length;
    }
  }

  caretCol = Math.min(lines[caretLine].length, caretCol);
  startCol = Math.min(lines[startLine].length, startCol);

  // Nodes may not have updated yet. Check if they have.
  if (!lineNodes[caretLine] || !lineNodes[startLine]) {
    return null;
  }

  // Compute range
  let endNode = lineNodes[caretLine].childNodes[0];
  let endOffset = caretCol;
  let startNode = lineNodes[startLine].childNodes[0];
  let startOffset = startCol;

  return {
    startNode, startOffset,
    endNode, endOffset
  };
}

export function orderCoordinates(pos1,pos2) {
  let [lineNum1,col1] = pos1;
  let [lineNum2,col2] = pos2;
  if (lineNum2 < lineNum1 || (lineNum2 === lineNum1 && col2 < col1)) {
    [lineNum1,col1] = pos2;
    [lineNum2,col2] = pos1;
  }
  return {
    lineNum1,lineNum2,col1,col2
  };
}

function computeSelectedLines(startPos,caretPos,lines) {
  let {
    lineNum1, col1,
    lineNum2, col2
  } = orderCoordinates(startPos,caretPos);

  if (lineNum1 === lineNum2) {
    return [lines[lineNum1].slice(col1,col2)];
  } else {
    return [
      lines[lineNum1].slice(col1),
      ...lines.slice(lineNum1+1,lineNum2),
      lines[lineNum2].slice(0,col2)
    ];
  }
}

export function selectAll({startPos=null,caretPos,lines}) {
  return {
    lines,
    startPos: [0,0],
    caretPos: [lines.length-1,lines[lines.length-1].length]
  };
}

export function addText({startPos=null,caretPos,addedText,lines}) {
  let {
    lineNum1, col1,
    lineNum2, col2
  } = orderCoordinates(startPos,caretPos);
  startPos = [lineNum1,col1];
  caretPos = [lineNum2,col2];

  // Undo/redo commands
  let removedText = computeSelectedLines(startPos,caretPos,lines).join('\n');
  let undo = {
    func: addText,
    params: {
      startPos: [lineNum1, col1],
      caretPos: null, // Filled below
      addedText: removedText
    }
  }

  // Check for autoindent
  if (addedText === '\n' && lines[lineNum1].startsWith(' ')) {
    // Count the number of spaces
    for (let i = 0; i < col1; i++) {
      if (lines[lineNum1][i] !== ' ') {
        break;
      }
      addedText = addedText+' ';
    }
  }

  // Make changes
  if (startPos[0] !== caretPos[0] || startPos[1] !== caretPos[1]) {
    let output = backspace({ startPos,caretPos,lines });
    startPos = output.startPos;
    caretPos = output.caretPos;
    lines = output.lines;
  }
  let [lineNum,col] = caretPos;
  const newLines = [
    ...lines.slice(0,lineNum),
    ...(lines[lineNum].slice(0,col)+addedText+lines[lineNum].slice(col)).split('\n'),
    ...lines.slice(lineNum+1),
  ];
  let addedLines = addedText.split('\n');
  let newLineNum = lineNum+addedLines.length-1;
  let newCol = addedLines.length === 1
    ? col+addedText.length
    : addedLines[addedLines.length-1].length;

  undo.params.caretPos = [newLineNum,newCol];
  return {
    lines: newLines,
    startPos: [newLineNum,newCol],
    caretPos: [newLineNum,newCol],
    undo
  };
}

export function del({startPos=null,caretPos,lines}) {
  if (startPos[0] === caretPos[0] && startPos[1] === caretPos[1]) { // No selection
    let [lineNum,col] = caretPos;
    // Handle the possibility that the selection is beyond the end of the line 
    col = Math.min(col, lines[lineNum].length);

    if (col === lines[lineNum].length) { // Deleting linebreak
      if (lineNum === lines.length-1) {
        return { lines, startPos, caretPos };
      } else {
        const newLines = [
          ...lines.slice(0,lineNum),
          lines[lineNum]+lines[lineNum+1],
          ...lines.slice(lineNum+2)
        ];
        const newPos = [lineNum,col];

        let undo = {
          func: addText,
          params: {
            startPos: newPos,
            caretPos: newPos,
            addedText: '\n'
          }
        }
        return {
          lines: newLines,
          startPos: newPos,
          caretPos: newPos,
          undo
        };
      }
    } else { // Deleting non-linebreak character
      const newLines = [...lines];
      newLines[lineNum] = lines[lineNum].slice(0,col)+lines[lineNum].slice(col+1);
      let newPos = [lineNum,col];

      let undo = {
        func: addText,
        params: {
          startPos: newPos,
          caretPos: newPos,
          addedText: lines[lineNum][col]
        }
      }
      return {
        lines: newLines,
        startPos: newPos,
        caretPos: newPos,
        undo
      };
    }
  } else { // Deleting selected text
    let {
      lineNum1, col1,
      lineNum2, col2
    } = orderCoordinates(startPos,caretPos);

    const newLines = [
      ...lines.slice(0,lineNum1),
      lines[lineNum1].slice(0,col1)+lines[lineNum2].slice(col2),
      ...lines.slice(lineNum2+1)
    ];
    const newPos = [lineNum1,col1];

    let undo = {
      func: addText,
      params: {
        startPos: newPos,
        caretPos: newPos,
        addedText: computeSelectedLines(
          startPos,caretPos,lines
        ).join('\n')
      }
    }
    return {
      lines: newLines,
      startPos: newPos,
      caretPos: newPos,
      undo
    };
  }
}

export function backspace({startPos=null,caretPos,lines}) {
  if (startPos[0] === caretPos[0] && startPos[1] === caretPos[1]) { // No selection
    let [lineNum,col] = caretPos;
    // Handle the possibility that the selection is beyond the end of the line 
    col = Math.min(col, lines[lineNum].length);

    if (col === 0) { // Deleting linebreak
      if (lineNum === 0) {
        return { lines, startPos, caretPos };
      } else {
        const newLines = [
          ...lines.slice(0,lineNum-1),
          lines[lineNum-1]+lines[lineNum],
          ...lines.slice(lineNum+1)
        ];
        const newCol = lines[lineNum-1].length;
        const newPos = [lineNum-1,newCol];

        let undo = {
          func: addText,
          params: {
            startPos: newPos,
            caretPos: newPos,
            addedText: '\n'
          }
        }
        return {
          lines: newLines,
          startPos: newPos,
          caretPos: newPos,
          undo
        };
      }
    } else { // Deleting non-linebreak character
      const newLines = [...lines];
      newLines[lineNum] = lines[lineNum].slice(0,col-1)+lines[lineNum].slice(col);
      let newPos = [lineNum,col-1];

      let undo = {
        func: addText,
        params: {
          startPos: newPos,
          caretPos: newPos,
          addedText: lines[lineNum][col-1]
        }
      }
      return {
        lines: newLines,
        startPos: newPos,
        caretPos: newPos,
        undo
      };
    }
  } else { // Deleting selected text
    let {
      lineNum1, col1,
      lineNum2, col2
    } = orderCoordinates(startPos,caretPos);

    const newLines = [
      ...lines.slice(0,lineNum1),
      lines[lineNum1].slice(0,col1)+lines[lineNum2].slice(col2),
      ...lines.slice(lineNum2+1)
    ];
    const newPos = [lineNum1,col1];

    let undo = {
      func: addText,
      params: {
        startPos: newPos,
        caretPos: newPos,
        addedText: computeSelectedLines(
          startPos,caretPos,lines
        ).join('\n')
      }
    }
    return {
      lines: newLines,
      startPos: newPos,
      caretPos: newPos,
      undo
    };
  }
}

export function enter({startPos=null,caretPos,lines}) {
  return addText({startPos,caretPos,lines,addedText:'\n'});
}

export function moveCaretLine({startPos=null,caretPos,lines,dLine,shift}) {
  let [lineNum,col] = caretPos;
  let newLineNum = lineNum+dLine;
  // Check bounds
  let newCol = col;
  if (newLineNum < 0) {
    newLineNum = 0;
    newCol = 0;
  } else if (newLineNum >= lines.length) {
    newLineNum = lines.length-1;
    newCol = lines[newLineNum].length;
  }
  //if (newCol > lines[newLineNum].length) {
  //  newCol = lines[newLineNum].length;
  //}
  const newCaretPos = [newLineNum,newCol];
  return {
    startPos: shift ? startPos || caretPos : newCaretPos,
    caretPos: newCaretPos,
    lines
  };
}

export function moveCaretCol({startPos=null,caretPos,lines,dCol,shift,ctrl}) {
  let [lineNum,col] = caretPos;
  // Check bounds (in case the caret starts beyond the line length)
  if (col > lines[lineNum].length) {
    col = lines[lineNum].length;
  }
  // Move caret
  let newCol = col+dCol;
  let newLineNum = lineNum;
  // Go to next non-alphanumeric if ctrl key is held
  function isAlphanumeric(c) {
    if ('a' <= c && c <= 'z') return true;
    if ('A' <= c && c <= 'Z') return true;
    if ('0' <= c && c <= '9') return true;
    return false;
  }
  if (ctrl) {
    if (dCol === -1) {
      while (isAlphanumeric(lines[lineNum][newCol-1]) && newCol > 0) {
        newCol += dCol;
      }
    } else if (dCol === 1) {
      while (isAlphanumeric(lines[lineNum][newCol]) &&
             newCol < lines[lineNum].length) {
        newCol += dCol;
      }
    }
  }
  // Check bounds
  if (newCol < 0) {
    if (lineNum > 0) {
      newLineNum = lineNum-1;
      newCol = lines[newLineNum].length
    } else {
      newCol = 0;
    }
  } else if (newCol > lines[lineNum].length) {
    if (lineNum < lines.length-1) {
      newLineNum = lineNum+1;
      newCol = 0;
    } else {
      newCol = lines[newLineNum].length;
    }
  }
  const newCaretPos = [newLineNum,newCol];
  return {
    startPos: shift ? startPos || caretPos : newCaretPos,
    caretPos: newCaretPos,
    lines
  };
}

export function home({startPos=null,caretPos,lines}) {
  const newPos = [caretPos[0],0];
  return {
    startPos: newPos,
    caretPos: newPos,
    lines,
  };
}

export function end({startPos=null,caretPos,lines}) {
  const newPos = [caretPos[0],lines[caretPos[0]].length];
  return {
    startPos: newPos,
    caretPos: newPos,
    lines,
  };
}

export function cut({startPos=null,caretPos,lines}) {
  let {
    lineNum1, col1,
    lineNum2, col2
  } = orderCoordinates(startPos,caretPos);

  let copiedText;
  if (lineNum1 === lineNum2) {
    copiedText = lines[lineNum1].slice(col1,col2);
  } else {
    copiedText = [
      lines[lineNum1].slice(col1),
      ...lines.slice(lineNum1+1,lineNum2),
      lines[lineNum2].slice(0,col2),
    ].join('\n');
  }
  return window.navigator.clipboard.writeText(copiedText).then(
    () => {
      return backspace({
        startPos,caretPos,lines
      });
    }
  ).catch(err => {
    console.error('Failed to read clipboard contents: ', err);
    return {
      startPos: startPos,
      caretPos: caretPos,
      lines
    };
  });
}

export function paste({startPos=null,caretPos,lines}) {
  if (window.navigator.clipboard.readText) {
    return window.navigator.clipboard.readText().then(
      text => {
        return addText({
          startPos,caretPos,lines,
          addedText: text
        });
      }
    ).catch(err => {
      console.error('Failed to read clipboard contents: ', err);
      return {
        startPos: startPos,
        caretPos: caretPos,
        lines
      };
    });
  } else {
    document.execCommand('paste');
  }
}
