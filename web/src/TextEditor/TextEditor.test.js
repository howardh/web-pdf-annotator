import {
  addText, backspace,
  moveCaretCol, moveCaretLine
} from './index.js';
import each from 'jest-each';

describe('addText', () => {
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
});
