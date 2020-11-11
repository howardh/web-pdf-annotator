import {
  addText, backspace,
  moveCaretCol, moveCaretLine,
  textCoordToSelection
} from './index.js';
import each from 'jest-each';

describe('addText', () => {
  // Typing
  each(Object.entries({
    '1 line document, position: start':[0,'xasdf'],
    '1 line document, position: middle':[1,'axsdf'],
    '1 line document, position: end':[4,'asdfx'],
  })).it('%s', (_,[col,expected]) => {
    const output = addText({
      lines: ['asdf'],
      addedText: 'x',
      caretPos: [0,col],
      startPos: [0,col]
    })
    expect(output.lines[0]).toBe(expected);
    expect(output.caretPos[0]).toBe(0);
    expect(output.caretPos[1]).toBe(col+1);
  });
  each(Object.entries({
    '3 line document, add to line 0, position: start': [0,'*asdf\nqwer\nzxcv'],
    '3 line document, add to line 0, position: middle': [1,'a*sdf\nqwer\nzxcv'],
    '3 line document, add to line 0, position: end': [4,'asdf*\nqwer\nzxcv'],
  })).it('%s', (_,[col,expected]) => {
    const output = addText({
      lines: ['asdf','qwer','zxcv'],
      addedText: '*',
      caretPos: [0,col],
      startPos: [0,col]
    })
    expect(output.lines.join('\n')).toBe(expected);
    expect(output.caretPos[0]).toBe(0);
    expect(output.caretPos[1]).toBe(col+1);
  });
  each(Object.entries({
    '3 line document, add to line 1, position: start': [0,'asdf\n*qwer\nzxcv'],
    '3 line document, add to line 1, position: middle': [1,'asdf\nq*wer\nzxcv'],
    '3 line document, add to line 1, position: end': [4,'asdf\nqwer*\nzxcv'],
  })).it('%s', (_,[col,expected]) => {
    const output = addText({
      lines: ['asdf','qwer','zxcv'],
      addedText: '*',
      caretPos: [1,col],
      startPos: [1,col]
    })
    expect(output.lines.join('\n')).toBe(expected);
    expect(output.caretPos[0]).toBe(1);
    expect(output.caretPos[1]).toBe(col+1);
  });
  each(Object.entries({
    '3 line document, add to line 2, position: start': [0,'asdf\nqwer\n*zxcv'],
    '3 line document, add to line 2, position: middle': [1,'asdf\nqwer\nz*xcv'],
    '3 line document, add to line 2, position: end': [4,'asdf\nqwer\nzxcv*'],
  })).it('%s', (_,[col,expected]) => {
    const output = addText({
      lines: ['asdf','qwer','zxcv'],
      addedText: '*',
      caretPos: [2,col],
      startPos: [2,col]
    })
    expect(output.lines.join('\n')).toBe(expected);
    expect(output.caretPos[0]).toBe(2);
    expect(output.caretPos[1]).toBe(col+1);
  });

  // Overwriting selection
  each(Object.entries({
    '1 char selection, position: start': [0,'*sdf\nqwer\nzxcv'],
    '1 char selection, position: middle': [1,'a*df\nqwer\nzxcv'],
    '1 char selection, position: end': [3,'asd*\nqwer\nzxcv'],
  })).it('%s', (_,[col,expected]) => {
    const output = addText({
      lines: ['asdf','qwer','zxcv'],
      addedText: '*',
      caretPos: [0,col+1],
      startPos: [0,col]
    })
    expect(output.lines.join('\n')).toBe(expected);
    expect(output.caretPos[0]).toBe(0);
    expect(output.caretPos[1]).toBe(col+1);
  });
  test('Full line selected (line 0)', ()=>{
    const output = addText({
      lines: ['asdf','qwer','zxcv'],
      addedText: '*',
      caretPos: [1,0],
      startPos: [0,0]
    })
    expect(output.lines).toStrictEqual(['*qwer','zxcv']);
    expect(output.caretPos[0]).toBe(0); // Line num
    expect(output.caretPos[1]).toBe(1); // Col
  });
  test('mulitple lines selected (line 1-2)', ()=>{
    const output = addText({
      lines: ['asdf','qwer','zxcv'],
      addedText: '*',
      caretPos: [2,3],
      startPos: [1,2]
    })
    expect(output.lines).toStrictEqual(['asdf','qw*v']);
    expect(output.caretPos[0]).toBe(1); // Line num
    expect(output.caretPos[1]).toBe(3); // Col
  });
  test('mulitple lines selected (line 1-2), flipped selection', ()=>{
    const output = addText({
      lines: ['asdf','qwer','zxcv'],
      addedText: '*',
      caretPos: [1,2],
      startPos: [2,3]
    })
    expect(output.lines).toStrictEqual(['asdf','qw*v']);
    expect(output.caretPos[0]).toBe(1); // Line num
    expect(output.caretPos[1]).toBe(3); // Col
  });
  
  // Adding longer strings (e.g. pasting)
  test('Paste single line', ()=>{
    const output = addText({
      lines: ['asdf','qwer','zxcv'],
      addedText: '***',
      caretPos: [1,1],
      startPos: [1,1]
    })
    expect(output.lines).toStrictEqual(['asdf','q***wer','zxcv']);
    expect(output.caretPos[0]).toBe(1); // Line num
    expect(output.caretPos[1]).toBe(4); // Col
  });
  test('Paste multiple lines', ()=>{
    const output = addText({
      lines: ['asdf','qwer','zxcv'],
      addedText: '***\n***',
      caretPos: [1,1],
      startPos: [1,1]
    })
    expect(output.lines).toStrictEqual(['asdf','q***','***wer','zxcv']);
    expect(output.caretPos[0]).toBe(2); // Line num
    expect(output.caretPos[1]).toBe(3); // Col
  });
});

describe('backspace', () => {
  each(Object.entries({
    '1 line document, position: start':[0,'asdf'],
    '1 line document, position: middle':[1,'sdf'],
    '1 line document, position: end':[4,'asd'],
  })).it('%s', (_,[col,expected]) => {
    const output = backspace({
      lines: ['asdf'],
      caretPos: [0,col],
      startPos: [0,col]
    })
    expect(output.lines[0]).toBe(expected);
    expect(output.caretPos[0]).toBe(0);
  });

  test('Full line selected (line 0)', ()=>{
    const output = backspace({
      lines: ['asdf','qwer','zxcv'],
      caretPos: [1,0],
      startPos: [0,0]
    })
    expect(output.lines).toStrictEqual(['qwer','zxcv']);
    expect(output.caretPos[0]).toBe(0); // Line num
    expect(output.caretPos[1]).toBe(0); // Col
  });

  test('mulitple lines selected (line 1-2)', ()=>{
    const output = backspace({
      lines: ['asdf','qwer','zxcv'],
      caretPos: [2,3],
      startPos: [1,2]
    })
    expect(output.lines).toStrictEqual(['asdf','qwv']);
    expect(output.caretPos[0]).toBe(1); // Line num
    expect(output.caretPos[1]).toBe(2); // Col
  });

  test('mulitple lines selected (line 1-2), flipped selection', ()=>{
    const output = backspace({
      lines: ['asdf','qwer','zxcv'],
      caretPos: [1,2],
      startPos: [2,3]
    })
    expect(output.lines).toStrictEqual(['asdf','qwv']);
    expect(output.caretPos[0]).toBe(1); // Line num
    expect(output.caretPos[1]).toBe(2); // Col
  });
});

describe('moveCaretCol', () => {
  // Motion only
  each(Object.entries({
    '1 line document, move left from start':[[0,0],[0,0]],
    '1 line document, move left from middle':[[0,1],[0,0]],
    '1 line document, move left from end':[[0,4],[0,3]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretCol({
      lines: ['asdf'],
      caretPos,
      startPos: caretPos,
      dCol: -1
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(expected);
  });
  each(Object.entries({
    '1 line document, move right from start':[[0,0],[0,1]],
    '1 line document, move right from middle':[[0,1],[0,2]],
    '1 line document, move right from end':[[0,4],[0,4]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretCol({
      lines: ['asdf'],
      caretPos,
      startPos: caretPos,
      dCol: 1
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(expected);
  });

  // Deselect
  each(Object.entries({
    '1 line document, starting with selection, move left from start':[[0,0],[0,0]],
    '1 line document, starting with selection, move left from middle':[[0,1],[0,0]],
    '1 line document, starting with selection, move left from end':[[0,4],[0,3]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretCol({
      lines: ['asdf'],
      caretPos,
      startPos: [0,2],
      dCol: -1
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(expected);
  });

  // Select
  each(Object.entries({
    '1 line document, select left from start':[[0,0],[0,0]],
    '1 line document, select left from middle':[[0,1],[0,0]],
    '1 line document, select left from end':[[0,4],[0,3]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretCol({
      lines: ['asdf'],
      caretPos,
      startPos: caretPos,
      dCol: -1,
      shift: true
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(caretPos);
  });
  each(Object.entries({
    '1 line document, select right from start':[[0,0],[0,1]],
    '1 line document, select right from middle':[[0,1],[0,2]],
    '1 line document, select right from end':[[0,4],[0,4]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretCol({
      lines: ['asdf'],
      caretPos,
      startPos: caretPos,
      dCol: 1,
      shift: true
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(caretPos);
  });
  
  // Ctrl move
  each(Object.entries({
    'ctrl move left to previous line':[[1,0],[0,14]],
    'ctrl move left from middle of first word':[[1,2],[1,0]],
    'ctrl move left from start of word':[[1,5],[1,0]],
    'ctrl move left from middle of word':[[1,7],[1,5]],
    'ctrl move left from end of word':[[1,9],[1,5]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretCol({
      lines: ['asdf asdf asdf','asdf asdf asdf'],
      caretPos,
      startPos: caretPos,
      dCol: -1,
      ctrl: true
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(expected);
  });
  each(Object.entries({
    'ctrl move right to next line':[[0,14],[1,0]],
    'ctrl move right from middle of last word':[[0,12],[0,14]],
    'ctrl move right from start of word':[[0,0],[0,4]],
    'ctrl move right from middle of word #1':[[0,1],[0,4]],
    'ctrl move right from middle of word #2':[[0,7],[0,9]],
    'ctrl move right from end of word':[[0,5],[0,9]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretCol({
      lines: ['asdf asdf asdf','asdf asdf asdf'],
      caretPos,
      startPos: caretPos,
      dCol: 1,
      ctrl: true
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(expected);
  });
});

describe('moveCaretLine', () => {
  // 1 line docs
  each(Object.entries({
    '1 line document, move up from start':[[0,0],[0,0]],
    '1 line document, move up from middle':[[0,1],[0,0]],
    '1 line document, move up from end':[[0,4],[0,0]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretLine({
      lines: ['asdf'],
      caretPos,
      startPos: caretPos,
      dLine: -1,
      shift: false
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(expected);
  });
  each(Object.entries({
    '1 line document, move down from start':[[0,0],[0,4]],
    '1 line document, move down from middle':[[0,1],[0,4]],
    '1 line document, move down from end':[[0,4],[0,4]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretLine({
      lines: ['asdf'],
      caretPos,
      startPos: caretPos,
      dLine: 1,
      shift: false
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(expected);
  });

  // 3 line docs with selection
  each(Object.entries({
    '3 line document, select down from line 0 start':[[0,0],[1,0]],
    '3 line document, select down from line 0 middle':[[0,1],[1,1]],
    '3 line document, select down from line 0 end':[[0,4],[1,4]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretLine({
      lines: ['asdf','qwer','zxcv'],
      caretPos,
      startPos: caretPos,
      dLine: 1,
      shift: true
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(caretPos);
  });
  each(Object.entries({
    '3 line document, select up from line 0 start':[[0,0],[0,0]],
    '3 line document, select up from line 0 middle':[[0,1],[0,0]],
    '3 line document, select up from line 0 end':[[0,4],[0,0]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretLine({
      lines: ['asdf','qwer','zxcv'],
      caretPos,
      startPos: caretPos,
      dLine: -1,
      shift: true
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(caretPos);
  });
  each(Object.entries({
    '3 line document, select down from line 1 start':[[1,0],[2,0]],
    '3 line document, select down from line 1 middle':[[1,1],[2,1]],
    '3 line document, select down from line 1 end':[[1,4],[2,4]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretLine({
      lines: ['asdf','qwer','zxcv'],
      caretPos,
      startPos: caretPos,
      dLine: 1,
      shift: true
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(caretPos);
  });
  each(Object.entries({
    '3 line document, select up from line 1 start':[[1,0],[0,0]],
    '3 line document, select up from line 1 middle':[[1,1],[0,1]],
    '3 line document, select up from line 1 end':[[1,4],[0,4]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretLine({
      lines: ['asdf','qwer','zxcv'],
      caretPos,
      startPos: caretPos,
      dLine: -1,
      shift: true
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(caretPos);
  });

  // Selection with lines of different lengths
  each(Object.entries({
    '3 different line, select up from line 0 start':[[0,0],[0,0]],
    '3 different line, select up from line 0 middle':[[0,1],[0,0]],
    '3 different line, select up from line 0 end':[[0,4],[0,0]],
  })).it('%s', (_,[caretPos,expected]) => {
    const output = moveCaretLine({
      lines: ['asdf','qw','zxcv'],
      caretPos,
      startPos: caretPos,
      dLine: -1,
      shift: true
    })
    expect(output.caretPos).toStrictEqual(expected);
    expect(output.startPos).toStrictEqual(caretPos);
  });

  // Everything else
  test('select up into empty line', () => {
    const output = moveCaretLine({
      lines: ['','qwer'],
      caretPos: [1,2],
      startPos: [1,2],
      dLine: -1,
      shift: true
    })
    expect(output.caretPos).toStrictEqual([0,2]);
    expect(output.startPos).toStrictEqual([1,2]);
  });
  test('move down with selection', () => {
    const output = moveCaretLine({
      lines: ['asdf','qwer','zxcv'],
      caretPos: [0,2],
      startPos: [2,2],
      dLine: 1,
      shift: false
    })
    expect(output.caretPos).toStrictEqual([1,2]);
    expect(output.startPos).toStrictEqual([1,2]);
  });
  test('move down into empty line with selection', () => {
    const output = moveCaretLine({
      lines: ['asdf','','zxcv'],
      caretPos: [0,2],
      startPos: [2,2],
      dLine: 1,
      shift: false
    })
    expect(output.caretPos).toStrictEqual([1,2]);
    expect(output.startPos).toStrictEqual([1,2]);
  });
});

describe('textCoordToSelection', () => {
  function createDummyLineNodes(lines) {
    return lines.map((line,i) => {
      return {
        childNodes: lines.length > 0 ? [{i}] : []
      };
    });
  }

  // Selections with text
  test('1 line, start of line', () => {
    let startPos = [0,0];
    let caretPos = startPos;
    let lines = ['asdf'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.startOffset).toBe(0);
    expect(output.endOffset).toBe(0);
  })
  test('1 line, end of line', () => {
    let startPos = [0,4];
    let caretPos = startPos;
    let lines = ['asdf'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.startOffset).toBe(4);
    expect(output.endOffset).toBe(4);
  })
  test('1 line, empty', () => {
    let startPos = [0,0];
    let caretPos = startPos;
    let lines = [''];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output).toBe(null);
  });
  each([0,1,2]).it('3 lines, empty, Line %d', lineNum => {
    let startPos = [lineNum,0];
    let caretPos = startPos;
    let lines = ['','',''];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output).toBe(null);
  });

  // Selections with empty lines
  test('selection starting on empty line (forward)', () => {
    let startPos = [1,0];
    let caretPos = [2,2];
    let lines = ['asdf','','qwer'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[2].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[2].childNodes[0]);
    expect(output.startOffset).toBe(0);
    expect(output.endOffset).toBe(2);
  });
  test('selection starting on 2 empty lines (forward)', () => {
    let startPos = [1,0];
    let caretPos = [3,2];
    let lines = ['asdf','','','qwer'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[3].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[3].childNodes[0]);
    expect(output.startOffset).toBe(0);
    expect(output.endOffset).toBe(2);
  });
  test('selection starting on empty line (backward)', () => {
    let startPos = [1,0];
    let caretPos = [0,2];
    let lines = ['asdf','','qwer'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.startOffset).toBe(4);
    expect(output.endOffset).toBe(2);
  });
  test('selection starting on 2 empty lines (backward)', () => {
    let startPos = [2,0];
    let caretPos = [0,2];
    let lines = ['asdf','','','qwer'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.startOffset).toBe(4);
    expect(output.endOffset).toBe(2);
  });

  test('selection all empty lines (forward)', () => {
    let startPos = [1,0];
    let caretPos = [3,0];
    let lines = ['asdf','','',''];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output).toBe(null);
  });
  test('selection all empty lines (backward)', () => {
    let startPos = [3,0];
    let caretPos = [1,0];
    let lines = ['asdf','','',''];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output).toBe(null);
  });

  test('selection ending on empty line (forward)', () => {
    let startPos = [0,3];
    let caretPos = [1,0];
    let lines = ['asdf','','qwer'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.startOffset).toBe(3);
    expect(output.endOffset).toBe(4);
  });
  test('selection ending on 2 empty lines (forward)', () => {
    let startPos = [0,3];
    let caretPos = [2,0];
    let lines = ['asdf','','','qwer'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[0].childNodes[0]);
    expect(output.startOffset).toBe(3);
    expect(output.endOffset).toBe(4);
  });
  test('selection ending on empty line (backward)', () => {
    let startPos = [2,2];
    let caretPos = [1,0];
    let lines = ['asdf','','qwer'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[2].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[2].childNodes[0]);
    expect(output.startOffset).toBe(2);
    expect(output.endOffset).toBe(0);
  });
  test('selection ending on 2 empty lines (backward)', () => {
    let startPos = [3,2];
    let caretPos = [1,2];
    let lines = ['asdf','','','qwer'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[3].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[3].childNodes[0]);
    expect(output.startOffset).toBe(2);
    expect(output.endOffset).toBe(0);
  });

  // Selections beyond the the line length
  test('selection ending on empty line (backward)', () => {
    let startPos = [2,4];
    let caretPos = [1,4];
    let lines = ['asdf','zx','qwer'];
    let lineNodes = createDummyLineNodes(lines);
    let output = textCoordToSelection(startPos, caretPos, lines, lineNodes);
    expect(output.startNode).toBe(lineNodes[2].childNodes[0]);
    expect(output.endNode).toBe(lineNodes[1].childNodes[0]);
    expect(output.startOffset).toBe(4);
    expect(output.endOffset).toBe(2);
  });
});
