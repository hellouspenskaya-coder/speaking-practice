// Turns the text items of a PDF (from pdf.js) into clean paragraphs.
// Used by text-builder.html. Pure functions, so they can be tested in Node.

// items: pdf.js textContent items {str, transform:[a,b,c,d,x,y], width, height}
// returns lines [{text, y, h}] from top to bottom of one page
function pdfItemsToLines(items) {
  const parts = items
    .filter(function (it) { return it && typeof it.str === 'string' && it.transform; })
    .map(function (it) {
      return { s: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.height || it.transform[3] || 10) };
    })
    .filter(function (p) { return p.s.trim() !== '' || p.w > 0; });
  parts.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
  const rows = [];
  parts.forEach(function (p) {
    const last = rows[rows.length - 1];
    const tol = Math.max(2, 0.45 * p.h);
    if (last && Math.abs(last.y - p.y) <= tol) {
      last.parts.push(p);
      last.h = Math.max(last.h, p.h);
    } else {
      rows.push({ y: p.y, h: p.h, parts: [p] });
    }
  });
  return rows.map(function (r) {
    r.parts.sort(function (a, b) { return a.x - b.x; });
    let text = '';
    let prevEnd = null;
    r.parts.forEach(function (p) {
      if (prevEnd !== null) {
        const gap = p.x - prevEnd;
        const needSpace = gap > 0.12 * r.h && !/\s$/.test(text) && !/^\s/.test(p.s);
        if (needSpace) text += ' ';
      }
      text += p.s;
      prevEnd = p.x + p.w;
    });
    return { text: text.replace(/\s+/g, ' ').trim(), y: r.y, h: r.h };
  }).filter(function (l) { return l.text !== ''; });
}

function median(arr) {
  if (!arr.length) return 0;
  const a = arr.slice().sort(function (x, y) { return x - y; });
  return a[Math.floor(a.length / 2)];
}

function normalizeForRepeat(t) {
  return t.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
}

// pages: array (one per page) of line arrays from pdfItemsToLines
// returns paragraphs joined by a blank line, with page numbers, running headers
// and everything from the reference list on removed
function assemblePdfText(pages) {
  // 1. running headers/footers: the same text (digits ignored) in the first or last
  // two lines of at least 3 pages (or of at least 40% of the pages)
  const counts = {};
  pages.forEach(function (lines) {
    const seen = {};
    lines.forEach(function (l, i) {
      if (i < 2 || i >= lines.length - 2) {
        const k = normalizeForRepeat(l.text);
        if (k && !seen[k]) { seen[k] = true; counts[k] = (counts[k] || 0) + 1; }
      }
    });
  });
  const need = Math.max(3, Math.ceil(pages.length * 0.4));
  const isRepeated = function (t) { return (counts[normalizeForRepeat(t)] || 0) >= need && pages.length >= 3; };
  const isPageNumber = function (t) {
    return /^(page\s*)?[-–—]?\s*\d{1,4}\s*[-–—]?$/i.test(t) || /^\d{1,4}\s*(of|\/)\s*\d{1,4}$/i.test(t);
  };

  // 2. flatten into paragraphs
  const paras = [];
  let cur = [];
  const flush = function () { if (cur.length) { paras.push(cur); cur = []; } };
  pages.forEach(function (lines, pi) {
    const kept = lines.filter(function (l, i) {
      if (isPageNumber(l.text)) return false;
      if ((i < 2 || i >= lines.length - 2) && isRepeated(l.text)) return false;
      return true;
    });
    const gaps = [];
    for (let i = 1; i < kept.length; i++) gaps.push(Math.abs(kept[i - 1].y - kept[i].y));
    const typical = median(gaps) || 12;
    kept.forEach(function (l, i) {
      if (i === 0) {
        // a new page: continue the paragraph only if it clearly was cut in the middle
        const prev = cur.length ? cur[cur.length - 1] : '';
        const cut = prev && !/[.?!:;"”)\]]$/.test(prev) && /^[a-z]/.test(l.text);
        if (!cut) flush();
      } else {
        const gap = Math.abs(kept[i - 1].y - l.y);
        const bigGap = gap > typical * 1.45;
        if (bigGap) flush();
      }
      cur.push(l.text);
    });
  });
  flush();

  // 3. join lines of each paragraph (remove soft hyphens at line ends)
  let texts = paras.map(function (lines) {
    let out = '';
    lines.forEach(function (t, i) {
      if (i === 0) { out = t; return; }
      if (/[A-Za-z]-$/.test(out) && /^[a-z]/.test(t)) out = out.slice(0, -1) + t;
      else out += ' ' + t;
    });
    return out.replace(/\s+/g, ' ').trim();
  }).filter(Boolean);

  // 4. cut at the reference list
  for (let i = Math.floor(texts.length * 0.4); i < texts.length; i++) {
    if (/^(references|bibliography|works cited|literature)$/i.test(texts[i].replace(/[:\s]+$/, '')) || /^(references|bibliography)\s+[A-Z][a-z]+,\s+[A-Z]\./.test(texts[i])) {
      texts = texts.slice(0, i);
      break;
    }
  }
  return texts.join('\n\n');
}

if (typeof module !== 'undefined') module.exports = { pdfItemsToLines: pdfItemsToLines, assemblePdfText: assemblePdfText };
