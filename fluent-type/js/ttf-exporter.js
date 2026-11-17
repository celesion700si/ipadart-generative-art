/**
 * OpenType (.ttf) & Vector (.svg) Exporter
 * Uses opentype.js to compile parametric + manually edited glyphs into a valid .ttf file.
 */

function glyphContoursToOpentypePath(contours) {
  const path = new opentype.Path();

  for (const c of contours) {
    const pts = c.points;
    if (!pts || pts.length < 2) continue;

    path.moveTo(Math.round(pts[0].x), Math.round(pts[0].y));
    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      path.curveTo(
        Math.round(curr.outX),
        Math.round(curr.outY),
        Math.round(next.inX),
        Math.round(next.inY),
        Math.round(next.x),
        Math.round(next.y)
      );
    }
    if (c.closed) {
      path.close();
    }
  }

  return path;
}

function exportTTF(glyphMap, familyName = 'CustomSketchFont') {
  if (typeof opentype === 'undefined') {
    throw new Error('opentype.js 尚未載入，請檢查網路連線或 CDN。');
  }

  // Required .notdef glyph
  const notdefPath = new opentype.Path();
  notdefPath.moveTo(80, 0);
  notdefPath.lineTo(80, 700);
  notdefPath.lineTo(440, 700);
  notdefPath.lineTo(440, 0);
  notdefPath.close();
  notdefPath.moveTo(140, 60);
  notdefPath.lineTo(380, 60);
  notdefPath.lineTo(380, 640);
  notdefPath.lineTo(140, 640);
  notdefPath.close();

  const glyphs = [
    new opentype.Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: 520,
      path: notdefPath
    })
  ];

  for (const [char, gData] of glyphMap.entries()) {
    const otPath = glyphContoursToOpentypePath(gData.contours);
    glyphs.push(
      new opentype.Glyph({
        name: char === ' ' ? 'space' : char,
        unicode: gData.unicode,
        advanceWidth: Math.round(gData.advanceWidth),
        path: otPath
      })
    );
  }

  const font = new opentype.Font({
    familyName,
    styleName: 'Regular',
    unitsPerEm: FONT_METRICS.unitsPerEm,
    ascender: FONT_METRICS.ascender,
    descender: FONT_METRICS.descender,
    glyphs
  });

  const arrayBuffer = font.toArrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'font/ttf' });
  triggerDownload(blob, `${familyName}.ttf`);
}

function exportSpecimenSVG(svgEl, filename = 'CustomSketchSpecimen.svg') {
  const clone = svgEl.cloneNode(true);
  // Remove metric guide lines so exported SVG only contains clean vector glyph paths
  clone.querySelectorAll('.metric-guide').forEach((el) => el.remove());

  const vb = svgEl.getAttribute('viewBox') || `0 0 ${svgEl.getAttribute('width') || 1000} ${svgEl.getAttribute('height') || 400}`;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox', vb);

  const serializer = new XMLSerializer();
  const source = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
