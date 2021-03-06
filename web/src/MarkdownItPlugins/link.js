// See example: https://github.com/markdown-it/markdown-it/blob/master/lib/rules_inline/autolink.js
// State source code: https://github.com/markdown-it/markdown-it/blob/master/lib/rules_inline/state_inline.js

const OPEN_BRACKET = 0x5B; // [
const CLOSE_BRACKET = 0x5D; // ]
const NEW_LINE = 0x0A // \n

const NOTE_REGEXP = new RegExp(/^note(\d+): (.+)$/)
const DOC_REGEXP = new RegExp(/^doc(\d+): (.+)$/)
const ANN_REGEXP = new RegExp(/^ann(\d+): (.+)$/)

function createOnClickHandler(href) {
  // See https://ncoughlin.com/posts/react-navigation-without-react-router/
  return function(e) {
    e.preventDefault();
    window.history.pushState({}, "", href);
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
  }
}

window.hhixl = window.hhixl || {};
window.hhixl.createOnClickHandler = createOnClickHandler;

function createHTML(state, type, id, text) {
  let token;

  token = state.push('bracket_link_open','a',1);
  token.attrPush(['href','/'+type+'/'+id]);

  token = state.push('text', '', 0);
  token.content = text;

  token = state.push('bracket_link_close','a',-1);
}

function link(state,silent) {
  let pos = state.pos;

  // Check for [[
  if (state.src.charCodeAt(pos)   !== OPEN_BRACKET) { return false; }
  if (state.src.charCodeAt(pos+1) !== OPEN_BRACKET) { return false; }
  let start = pos+2;

  // Scan until end of line for closing ]]
  let end = null;
  pos += 1; // Skip first [. The increment in the loop will skip the next one.
  while (true) {
    pos += 1;
    let c = state.src.charCodeAt(pos);
    if (!c) { return false; }
    if (c === NEW_LINE) { return false; }
    if (state.src.charCodeAt(pos)   !== CLOSE_BRACKET) { continue; }
    if (state.src.charCodeAt(pos+1) !== CLOSE_BRACKET) { continue; }
    end = pos;
    break;
  }
  let content = state.src.slice(start,end);

  // Parse contents of [[]]
  let type = null;
  let id = null;
  let text = null;
  let match;
  if (match = NOTE_REGEXP.exec(content)) {
    id = match[1];
    text = match[2];

    // Create corresponding HTML
    createHTML(state, 'notes', id, text);

    // Update state
    state.pos = end+2;

    return true;
  }

  if (match = DOC_REGEXP.exec(content)) {
    id = match[1];
    text = match[2];

    // Create corresponding HTML
    createHTML(state, 'annotate', id, text);

    // Update state
    state.pos = end+2;

    return true;
  }

  if (match = ANN_REGEXP.exec(content)) {
    id = match[1];
    text = match[2];

    // Create corresponding HTML
    let token;

    token = state.push('bracket_link_open','a',1);
    token.attrPush(['href','#']);
    token.attrPush(['onClick',"hhixl.createOnClickHandler('?annotation="+id+"')(event)"]); // TODO: How can I pass a function here instead of referencing a global function?

    token = state.push('text', '', 0);
    token.content = text;

    token = state.push('bracket_link_close','a',-1);

    // Update state
    state.pos = end+2;

    return true;
  }

  return false;
}

function plugin(options) {
  return function (md) {
    md.inline.ruler.push('bracket_link',link)
  }
}

export default plugin;
