// See https://github.com/markdown-it/markdown-it.github.io/blob/9445f3ff4cec0cc913268463a780550239bc3994/index.js#L12303

function injectLineNumbers(tokens, idx, options, env, slf) {
  if (tokens[idx].map && tokens[idx].level === 0) {
    let line = tokens[idx].map[0];
    tokens[idx].attrJoin("class", "line");
    tokens[idx].attrSet("data-line", String(line));
  }
  return slf.renderToken(tokens, idx, options, env, slf);
}

function plugin(options) {
  return function (md) {
    md.renderer.rules.paragraph_open = injectLineNumbers;
    md.renderer.rules.heading_open = injectLineNumbers;
  }
}

export default plugin;
