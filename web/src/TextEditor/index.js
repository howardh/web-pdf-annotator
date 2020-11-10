import React from 'react';
import {useEffect, useState, useRef, forwardRef} from 'react';

import './TextEditor.scss';

export default function TextEditor(props) {
  const {
    text,
    onChangeText
  } = props;

  const border = 1; // Border of .text-editor element

  const lines = text.split('\n');
  const ref = useRef(null);
  window.r = ref.current;

  // Measure size of a character
  const sizeCheckRef = useRef(null);
  const [charDims,setCharDims] = useState({w:0,h:0});
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
  // Both the selections (from window.getSelection()) and the coordinates (i.e. caretTextCoords and selectionStart) can be updated programmatically, and they're both kept in sync. If the coordinates are updated programmatically to sync up with the selection, then this is set to `true` so that the selections don't try to update again to sync up with the coordinates.
  const [skipSelectionUpdate,setSkipSelectionUpdate] = useState(false);
  function textToXYCoords(lineNum,col) {
    let textOffset = [
      ref.current.children[0].getBoundingClientRect().left-ref.current.getBoundingClientRect().left-border,
      ref.current.children[0].getBoundingClientRect().top-ref.current.getBoundingClientRect().top-border
    ]
    return [
      textOffset[0]+col*charDims.w,
      textOffset[1]+lineNum*charDims.h
    ];
  }
  useEffect(()=>{
    setCaretXYCoords(textToXYCoords(caretTextCoords[0],caretTextCoords[1]));
  },[caretTextCoords]);
  function updateSelectionFromCoords(startPos,caretPos) {
    let sel = window.getSelection();
    let endNode = ref.current.children[caretPos[0]+1].childNodes[0];
    let endOffset = caretPos[1];
    let startNode = ref.current.children[startPos[0]+1].childNodes[0];
    let startOffset = startPos[1];
    // Check if selection actually changed
    if (sel.anchorNode === startNode && sel.anchorOffset === startOffset &&
        sel.focusNode === endNode && sel.focusOffset === endOffset) {
      return;
    }
    // I don't know when this happens. It seems to just work when I put this in. Investigate this line if something breaks.
    if (!startNode || !endNode) {
      return; // Is this right?
    }
    // If the selection is length 0, remove all ranges. Otherwise, we get buggy interactions where adding text at the "selected" region causes the new text to become selected.
    if (startNode === endNode && startOffset === endOffset) {
      // FIXME: This also interfered with mouse selection. Upon mouse down, the start and end of the selection are equal, so this will remove the range, but removing the range prevents the user from being able to select anything with the mouse.
      sel.removeAllRanges();
      return;
    }
    // Update selection accordingly
    let range = document.createRange();
    range.setStart(startNode,startOffset);
    //range.setEnd(endNode,endOffset);
    //window.range = range;
    sel.removeAllRanges();
    sel.addRange(range);
    sel.extend(endNode,endOffset);
  }
  useEffect(()=>{
    if (skipSelectionUpdate) {
      setSkipSelectionUpdate(false);
    }
    //updateSelectionFromCoords(selectionStart,caretTextCoords);
  },[selectionStart,caretTextCoords]);

  // Selection change
  function selectionToTextCoords(node,offset) {
    let line = null;
    if (!node) {
      return null;
    }
    if (node.nodeName === '#text') {
      line = node.parentNode;
    } else {
      line = node.closest('.line');
    }
    if (!line) {
      console.error('Unable to find selected line');
      return null;
    }
    let lineNum = Array.from(ref.current.children).indexOf(line)-1;
    return [lineNum,offset];
  }
  function updateCoordsFromSelection() {
    console.log('updating coords');
    if (!ref.current) {
      return;
    }
    let sel = window.getSelection();
    // Make sure that there is a selection and it is within the text editor
    if (!sel.anchorNode || !ref.current.contains(sel.anchorNode)) {
      return;
    }
    if (!sel.focusNode || !ref.current.contains(sel.focusNode)) {
      return;
    }
    // Selection start
    let startPos = selectionToTextCoords(sel.anchorNode,sel.anchorOffset);
    if (selectionStart === null ||
        startPos[0] !== selectionStart[0] ||
        startPos[1] !== selectionStart[1]) {
      setSelectionStart(startPos);
    }
    // Caret follows the end of the selection [XXX: What did I mean by this comment?]
    let endPos = selectionToTextCoords(sel.focusNode,sel.focusOffset);
    if (endPos[0] !== caretTextCoords[0] ||
        endPos[1] !== caretTextCoords[1]) {
      setCaretTextCoords(endPos);
    }
    setSkipSelectionUpdate(true);
  }
  useEffect(()=>{
    function callback(e) {
      updateCoordsFromSelection();
      let sel = window.getSelection();
    }
    document.addEventListener('selectionchange', callback);
    return () => {
      document.removeEventListener('selectionchange', callback);
    };
  },[]);

  // Event handlers
  function execute(func,params) {
    let output = func(params);
    if ('then' in output) {
      output.then(o => {
        const {
          startPos=selectionStart,
          caretPos=caretTextCoords,
          lines=lines
        } = o;
        onChangeText(lines.join('\n'));
        setCaretTextCoords(caretPos);
        setSelectionStart(startPos);
        updateSelectionFromCoords(startPos,caretPos);
      });
    } else {
      const {
        startPos=selectionStart,
        caretPos=caretTextCoords,
        lines=lines
      } = output;
      onChangeText(lines.join('\n'));
      setCaretTextCoords(caretPos);
      setSelectionStart(startPos);
      updateSelectionFromCoords(startPos,caretPos);
    }
  }
  const editorEventHandlers = {
    onKeyDown: function(e) {
      if (e.key.length === 1) {
        if (!e.ctrlKey) {
          execute(addText, {
            startPos: selectionStart,
            caretPos: caretTextCoords,
            addedText: e.key,
            lines: lines
          });
        } else { // Ctrl + ...
          switch (e.key) {
            case 'a':
              execute(selectAll, {
                startPos: selectionStart,
                caretPos: caretTextCoords,
                lines: lines
              });
              e.preventDefault();
              e.stopPropagation();
              break;
            case 'v':
              execute(paste, {
                startPos: selectionStart,
                caretPos: caretTextCoords,
                lines: lines
              });
              break;
          }
        }
      } else {
        switch(e.key) {
          case 'Backspace':
            execute(backspace, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines
            });
            break;
          case 'Delete':
            execute(deleteKey, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines
            });
            break;
          case 'Enter':
            execute(enter, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines
            });
            break;
          case 'ArrowUp':
            execute(moveCaretLine, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
              dLine: -1,
              shift: e.shiftKey,
            });
            break;
          case 'ArrowDown':
            execute(moveCaretLine, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
              dLine: 1,
              shift: e.shiftKey,
            });
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
            break;
          default:
            console.log(e.key);
            break;
        }
      }
    },
    onPaste: function(e) {
      console.log('paste');
    }
  }

  const caretStyle = {
    top: caretXYCoords[1]+'px',
    left: caretXYCoords[0]+'px',
    width: 0,
    height: charDims.h,
  };
  return (<div className='text-editor' ref={ref} tabIndex={-1} {...editorEventHandlers}>
    <div className='hidden'>
      <pre className='size-check' ref={sizeCheckRef}>a</pre>
    </div>
    {
      lines.map((line,lineNum) =>
        <pre className='line' key={lineNum}>
          {line}
        </pre>
      )
    }
    <div className='caret' style={caretStyle}></div>
  </div>);
}

export function selectAll({startPos=null,caretPos,lines}) {
  return {
    lines,
    startPos: [0,0],
    caretPos: [lines.length-1,lines[lines.length-1].length]
  };
}

export function addText({startPos=null,caretPos,addedText,lines}) {
  if (startPos[0] !== caretPos[0] || startPos[1] !== caretPos[1]) {
    let output = backspace({ startPos,caretPos,lines });
    startPos = output.startPos;
    caretPos = output.caretPos;
    lines = output.lines;
  }
  let [lineNum,col] = caretPos;
  const newLines = [
    ...lines.slice(0,lineNum),
    lines[lineNum].slice(0,col)+addedText+lines[lineNum].slice(col),
    ...lines.slice(lineNum+1),
  ];
  return {
    lines: newLines,
    startPos: [lineNum,col+addedText.length],
    caretPos: [lineNum,col+addedText.length]
  };
}

export function deleteKey({startPos=null,caretPos,lines}) {
  if (startPos[0] === caretPos[0] && startPos[1] === caretPos[1]) {
    let [lineNum,col] = caretPos;
    if (col === 0) {
      if (lineNum === 0) {
        return { lines, startPos, caretPos };
      } else {
        const newLines = [
          ...lines.slice(0,lineNum-1),
          lines[lineNum-1]+lines[lineNum],
          ...lines.slice(lineNum+1)
        ];
        const newCol = lines[lineNum-1].length;
        return {
          lines: newLines,
          startPos: [lineNum-1,newCol],
          caretPos: [lineNum-1,newCol]
        };
      }
    } else {
      const newLines = [...lines];
      newLines[lineNum] = lines[lineNum].slice(0,col)+lines[lineNum].slice(col+1);
      return {
        lines: newLines,
        startPos: caretPos,
        caretPos: caretPos
      };
    }
  } else {
    let [lineNum1,col1] = startPos;
    let [lineNum2,col2] = caretPos;
    if (col2 < col1 || lineNum2 < lineNum1) { // Flip if needed
      [lineNum1,col1] = caretPos;
      [lineNum2,col2] = startPos;
    }

    const newLines = [
      ...lines.slice(0,lineNum1),
      lines[lineNum1].slice(0,col1)+lines[lineNum2].slice(col2),
      ...lines.slice(lineNum2+1)
    ];
    return {
      lines: newLines,
      startPos: [lineNum1,col1],
      caretPos: [lineNum1,col1]
    };
  }
}

export function backspace({startPos=null,caretPos,lines}) {
  if (startPos[0] === caretPos[0] && startPos[1] === caretPos[1]) {
    let [lineNum,col] = caretPos;
    if (col === 0) {
      if (lineNum === 0) {
        return { lines, startPos, caretPos };
      } else {
        const newLines = [
          ...lines.slice(0,lineNum-1),
          lines[lineNum-1]+lines[lineNum],
          ...lines.slice(lineNum+1)
        ];
        const newCol = lines[lineNum-1].length;
        return {
          lines: newLines,
          startPos: [lineNum-1,newCol],
          caretPos: [lineNum-1,newCol]
        };
      }
    } else {
      const newLines = [...lines];
      newLines[lineNum] = lines[lineNum].slice(0,col-1)+lines[lineNum].slice(col);
      return {
        lines: newLines,
        startPos: [lineNum,col-1],
        caretPos: [lineNum,col-1]
      };
    }
  } else {
    let [lineNum1,col1] = startPos;
    let [lineNum2,col2] = caretPos;
    if (col2 < col1 || lineNum2 < lineNum1) { // Flip if needed
      [lineNum1,col1] = caretPos;
      [lineNum2,col2] = startPos;
    }

    const newLines = [
      ...lines.slice(0,lineNum1),
      lines[lineNum1].slice(0,col1)+lines[lineNum2].slice(col2),
      ...lines.slice(lineNum2+1)
    ];
    return {
      lines: newLines,
      startPos: [lineNum1,col1],
      caretPos: [lineNum1,col1]
    };
  }
}

export function enter({startPos=null,caretPos,lines,shift}) {
  if (startPos[0] !== caretPos[0] || startPos[1] !== caretPos[1]) {
    let output = backspace({ startPos,caretPos,lines });
    startPos = output.startPos;
    caretPos = output.caretPos;
    lines = output.lines;
  }
  let [lineNum,col] = caretPos;
  const newLines = [
    ...lines.slice(0,lineNum),
    lines[lineNum].slice(0,col),
    lines[lineNum].slice(col),
    ...lines.slice(lineNum+1)
  ];
  const newCaretPos = [lineNum+1,0];
  return {
    startPos: newCaretPos,
    caretPos: newCaretPos,
    lines: newLines
  };
}

export function moveCaretLine({startPos=null,caretPos,lines,dLine,shift}) {
  let [lineNum,col] = caretPos;
  let newLineNum = lineNum+dLine;
  // Check bounds
  if (newLineNum < 0) {
    newLineNum = 0;
    col = 0;
  } else if (newLineNum >= lines.length) {
    newLineNum = lines.length-1;
    col = lines[newLineNum].length;
  }
  if (col > lines[newLineNum].length) {
    col = lines[newLineNum].length;
  }
  const newCaretPos = [newLineNum,col]
  return {
    startPos: shift ? startPos || caretPos : newCaretPos,
    caretPos: newCaretPos,
    lines
  };
}

export function moveCaretCol({startPos=null,caretPos,lines,dCol,shift,ctrl}) {
  let [lineNum,col] = caretPos;
  let newCol = col+dCol;
  let newLineNum = lineNum;
  // Go to next space if ctrl key is held
  if (ctrl) {
    while (lines[lineNum][newCol] !== ' ' &&
           newCol >= 0 && newCol <= lines[lineNum].length) {
      newCol += dCol;
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

export function paste({startPos=null,caretPos,lines}) {
  return window.navigator.clipboard.readText().then(
    text => {
      console.log('Pasted content: ', text);
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
}
