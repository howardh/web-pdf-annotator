import React from 'react';
import {useEffect, useState, useRef, forwardRef} from 'react';

import './TextEditor.scss';

function isElementInViewport (el) {

    var rect = el.getBoundingClientRect();

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
    historyLimit=30
  } = props;

  const border = 1; // Border of .text-editor element

  const lines = text.split('\n');
  const ref = useRef(null);
  const caretRef = useRef(null);
  window.r = ref.current;
  window.cr = caretRef.current;

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

  // Caret (X,Y) pixel coordinates
  function textToXYCoords(lineNum,col) {
    if (col >= lines[lineNum].length) {
      col = lines[lineNum].length;
    }
    let textOffset = [
      ref.current.children[0].getBoundingClientRect().left-ref.current.getBoundingClientRect().left-border+ref.current.scrollLeft,
      ref.current.children[0].getBoundingClientRect().top-ref.current.getBoundingClientRect().top-border+ref.current.scrollTop
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
    const {width,height} = ref.current.getBoundingClientRect();
    const scrollTop = ref.current.scrollTop;
    const scrollLeft = ref.current.scrollLeft;
    const [x,y] = caretXYCoords;
    const marginLeft = ref.current.scrollLeft+ref.current.children[0].getBoundingClientRect().left;
    const marginTop = ref.current.scrollTop+ref.current.children[0].getBoundingClientRect().top;
    let st = scrollTop;
    let sl = scrollLeft;
    if (x > width+scrollLeft-marginLeft*2) {
      sl += x-(width+scrollLeft)+marginLeft*2;
    } else if (x < scrollLeft+marginLeft*2) {
      sl = x-marginLeft*2;
    }
    if (y > height+scrollTop-marginTop*4) {
      st += y-(height+scrollTop)+marginTop*4;
    } else if (y < scrollTop+marginTop*2) {
      st = y-marginTop*2;
    }
    ref.current.scroll(sl,st);
  });

  const [preventCoordUpdate,setPreventCoordUpdate] = useState(0);
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
  function updateSelectionFromCoords(startPos,caretPos,lines=lines) {
    let sel = window.getSelection();

    let newSel = textCoordToSelection(
      startPos,caretPos,lines,
      Array.from(ref.current.children).slice(1,-1)
    );

    if (!newSel) {
      sel.removeAllRanges();
      return;
    }

    let {
      startNode,
      startOffset,
      endNode,
      endOffset
    } = newSel;

    // Check if selection actually changed
    if (sel.anchorNode === startNode && sel.anchorOffset === startOffset &&
        sel.focusNode === endNode && sel.focusOffset === endOffset) {
      return;
    }
    // If the selection is length 0, remove all ranges. Otherwise, we get buggy interactions where adding text at the "selected" region causes the new text to become selected.
    if (startNode === endNode && startOffset === endOffset) {
      sel.removeAllRanges();
      return;
    }
    // Update selection accordingly
    let range = document.createRange();
    range.setStart(startNode,startOffset);
    sel.removeAllRanges();
    sel.addRange(range);
    sel.extend(endNode,endOffset);
    setPreventCoordUpdate(2); // `addRange` and `extend` each trigger their own change events. We want to stop both.
  }
  function updateCoordsFromSelection() {
    if (preventCoordUpdate) {
      setPreventCoordUpdate(preventCoordUpdate-1);
      return;
    }
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
  }
  useEffect(()=>{
    // No dependencies. The callbacks need to be replaced on every render so it has access to the most up to date state.
    function callback(e) {
      updateCoordsFromSelection();
    }
    document.addEventListener('selectionchange', callback);
    return () => {
      document.removeEventListener('selectionchange', callback);
    };
  });

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
    }
    setCaretTextCoords(caretPos);
    setSelectionStart(startPos);
    updateSelectionFromCoords(startPos,caretPos,newLines);
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
      if (e.key.length === 1) {
        if (!e.ctrlKey) {
          execute(addText, {
            startPos: selectionStart,
            caretPos: caretTextCoords,
            addedText: e.key,
            lines: lines
          });
          e.preventDefault();
          e.stopPropagation();
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
            e.preventDefault();
            e.stopPropagation();
            break;
          case 'ArrowDown':
            execute(moveCaretLine, {
              startPos: selectionStart,
              caretPos: caretTextCoords,
              lines: lines,
              dLine: 1,
              shift: e.shiftKey,
            });
            e.preventDefault();
            e.stopPropagation();
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
            e.preventDefault();
            e.stopPropagation();
            break;
          default:
            console.log(e.key);
            break;
        }
      }
    },
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
    <div className='caret' style={caretStyle} ref={caretRef}></div>
  </div>);
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

  // Undo/redo commands
  let removedText = computeSelectedLines(startPos,caretPos,lines).join('\n');
  let undo = {
    func: addText,
    params: {
      startPos: startPos,
      caretPos: null, // Filled below
      addedText: removedText
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
  let newCol = col+dCol;
  let newLineNum = lineNum;
  // Go to next space if ctrl key is held
  if (ctrl) {
    if (dCol === -1) {
      while (lines[lineNum][newCol-1] !== ' ' && newCol > 0) {
        newCol += dCol;
      }
    } else if (dCol === 1) {
      while (lines[lineNum][newCol] !== ' ' &&
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
}
