const graphemes = value => Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), ({ segment }) => segment);

export function graphemeWidth(grapheme, fontSize) {
  if (/^\s$/u.test(grapheme)) return fontSize * 0.32;
  if (/^[MW@#%&]$/u.test(grapheme)) return fontSize * 0.9;
  if (/^[ilI1.,'`!:;|]$/u.test(grapheme)) return fontSize * 0.3;
  if (/^[\u2E80-\u9FFF\uAC00-\uD7AF]$/u.test(grapheme)) return fontSize;
  return fontSize * 0.62;
}

export function measureText(value, fontSize) { return graphemes(value).reduce((width, grapheme) => width + graphemeWidth(grapheme, fontSize), 0); }

function breakWord(word, maxWidth, fontSize) {
  const lines = []; let line = "";
  for (const grapheme of graphemes(word)) {
    if (line && measureText(line + grapheme, fontSize) > maxWidth) { lines.push(line); line = grapheme; } else line += grapheme;
  }
  if (line) lines.push(line);
  return lines;
}

export function wrapMeasuredText(value, { maxWidth, fontSize }) {
  if (!(Number.isFinite(maxWidth) && maxWidth > 0 && Number.isFinite(fontSize) && fontSize > 0)) throw new TypeError("maxWidth and fontSize must be positive numbers");
  const lines = [];
  for (const paragraph of String(value).split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/u).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (measureText(next, fontSize) <= maxWidth) line = next;
      else if (!line) lines.push(...breakWord(word, maxWidth, fontSize));
      else { lines.push(line); if (measureText(word, fontSize) <= maxWidth) line = word; else { const pieces = breakWord(word, maxWidth, fontSize); lines.push(...pieces.slice(0, -1)); line = pieces.at(-1); } }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

export function measureWrappedText(value, options) {
  const lines = wrapMeasuredText(value, options); const lineHeight = options.lineHeight ?? options.fontSize * 1.2;
  return { lines, width: Math.max(...lines.map(line => measureText(line, options.fontSize))), height: lines.length * lineHeight };
}
