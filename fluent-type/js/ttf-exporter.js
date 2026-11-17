/**
 * OpenType (.otf) & Vector (.svg) Exporter
 * Uses opentype.js to compile parametric + manually edited glyphs into a valid
 * OpenType font with CFF (cubic Bézier) outlines, and Paper.js to merge the
 * overlapping strokes of each glyph into clean, non-overlapping outlines.
 */

// Standard (Adobe Glyph List) names for non-letter glyphs
const GLYPH_NAMES = {
  ' ': 'space', '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
  '.': 'period', ',': 'comma', '!': 'exclam', '?': 'question', '-': 'hyphen',
  ':': 'colon', ';': 'semicolon', "'": 'quotesingle', '"': 'quotedbl',
  '(': 'parenleft', ')': 'parenright', '/': 'slash', '+': 'plus',
  '&': 'ampersand', '@': 'at'
};

function glyphNameFor(char) {
  if (GLYPH_NAMES[char]) return GLYPH_NAMES[char];
  if (/^[A-Za-z]$/.test(char)) return char;
  return 'uni' + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Keep only characters that are safe in every font-name field.
 * Returns '' when nothing usable is left (e.g. a name typed entirely in Chinese).
 */
function sanitizeFamilyName(raw) {
  return String(raw || '')
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

let fluentPaperScope = null;
function getPaperScope() {
  if (typeof paper === 'undefined') return null;
  if (!fluentPaperScope) {
    fluentPaperScope = new paper.PaperScope();
    fluentPaperScope.setup(new fluentPaperScope.Size(10, 10));
  }
  return fluentPaperScope;
}

/**
 * Merge overlapping contours into non-overlapping outlines.
 * Returns an array of closed outlines, each an array of cubic segments:
 *   { x, y, inX, inY, outX, outY }  (absolute coordinates, Y-up)
 * Outer outlines run counter-clockwise and counters clockwise, as CFF expects.
 * Returns null when merging is unavailable or fails, so the caller can fall back.
 */
function mergeGlyphContours(contours) {
  const scope = getPaperScope();
  if (!scope) return null;

  const usable = contours.filter((c) => c.closed && c.points && c.points.length >= 3);
  if (usable.length === 0) return null;

  let compound = null;
  let merged = null;
  try {
    compound = new scope.CompoundPath({ insert: false, fillRule: 'nonzero' });
    for (const c of usable) {
      const path = new scope.Path({ insert: false, closed: true });
      for (const p of c.points) {
        path.add(
          new scope.Segment(
            new scope.Point(p.x, p.y),
            new scope.Point(p.inX - p.x, p.inY - p.y),
            new scope.Point(p.outX - p.x, p.outY - p.y)
          )
        );
      }
      compound.addChild(path);
    }

    merged = compound.unite(undefined, { insert: false });
    // In Paper's Y-down terms "clockwise" equals counter-clockwise in font (Y-up) space
    merged.reorient(true, true);

    const children = merged.children ? merged.children : [merged];
    const outlines = [];
    for (const child of children) {
      if (!child.segments || child.segments.length < 2) continue;
      if (Math.abs(child.area) < 1) continue; // drop degenerate slivers
      outlines.push(
        child.segments.map((seg) => ({
          x: seg.point.x,
          y: seg.point.y,
          inX: seg.point.x + seg.handleIn.x,
          inY: seg.point.y + seg.handleIn.y,
          outX: seg.point.x + seg.handleOut.x,
          outY: seg.point.y + seg.handleOut.y
        }))
      );
    }
    return outlines.length ? outlines : null;
  } catch (err) {
    console.warn('Outline merge failed, exporting raw contours instead:', err);
    return null;
  } finally {
    if (compound) compound.remove();
    if (merged) merged.remove();
  }
}

function outlinesToOpentypePath(outlines) {
  const path = new opentype.Path();
  const r = Math.round;

  for (const pts of outlines) {
    if (!pts || pts.length < 2) continue;
    path.moveTo(r(pts[0].x), r(pts[0].y));
    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      const straight =
        curr.outX === curr.x && curr.outY === curr.y && next.inX === next.x && next.inY === next.y;
      if (straight) {
        if (i < pts.length - 1) path.lineTo(r(next.x), r(next.y));
      } else {
        path.curveTo(r(curr.outX), r(curr.outY), r(next.inX), r(next.inY), r(next.x), r(next.y));
      }
    }
    path.close();
  }

  return path;
}

function glyphContoursToOpentypePath(contours) {
  const merged = mergeGlyphContours(contours);
  if (merged) return { path: outlinesToOpentypePath(merged), merged: true };

  // Fallback: raw contours, reversed so outer shapes still run counter-clockwise
  const raw = contours
    .filter((c) => c.points && c.points.length >= 2)
    .map((c) =>
      [...c.points].reverse().map((p) => ({
        x: p.x, y: p.y, inX: p.outX, inY: p.outY, outX: p.inX, outY: p.inY
      }))
    );
  return { path: outlinesToOpentypePath(raw), merged: false };
}

/**
 * Compile and download the font. Returns { filename, familyName, unmerged }.
 */
function exportFont(glyphMap, options = {}) {
  if (typeof opentype === 'undefined') {
    throw new Error('opentype.js 尚未載入，請重新整理頁面。');
  }

  const familyName = sanitizeFamilyName(options.familyName) || 'Fluent Sketch';
  const designer = String(options.designer || '').trim().slice(0, 60);
  const psName = familyName.replace(/[^A-Za-z0-9-]/g, '') + '-Regular';
  const year = new Date().getFullYear();

  // Required .notdef glyph (outer counter-clockwise, inner clockwise)
  const notdefPath = new opentype.Path();
  notdefPath.moveTo(80, 0);
  notdefPath.lineTo(440, 0);
  notdefPath.lineTo(440, 700);
  notdefPath.lineTo(80, 700);
  notdefPath.close();
  notdefPath.moveTo(140, 60);
  notdefPath.lineTo(140, 640);
  notdefPath.lineTo(380, 640);
  notdefPath.lineTo(380, 60);
  notdefPath.close();

  const glyphs = [
    new opentype.Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: 520,
      path: notdefPath
    })
  ];

  const unmerged = [];
  for (const [char, gData] of glyphMap.entries()) {
    const result = glyphContoursToOpentypePath(gData.contours);
    if (!result.merged && gData.contours.length > 1) unmerged.push(char);
    glyphs.push(
      new opentype.Glyph({
        name: glyphNameFor(char),
        unicode: gData.unicode,
        advanceWidth: Math.round(gData.advanceWidth),
        path: result.path
      })
    );
  }

  const font = new opentype.Font({
    familyName,
    styleName: 'Regular',
    postScriptName: psName,
    fullName: familyName,
    version: 'Version 1.000',
    designer: designer || ' ',
    copyright: designer ? `Copyright ${year} ${designer}` : ' ',
    description: 'Made with FLUENT.TYPE',
    unitsPerEm: FONT_METRICS.unitsPerEm,
    ascender: FONT_METRICS.ascender,
    descender: FONT_METRICS.descender,
    glyphs
  });

  const arrayBuffer = font.toArrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'font/otf' });
  const filename = `${familyName.replace(/\s+/g, '')}.otf`;
  triggerDownload(blob, filename);
  return { filename, familyName, unmerged };
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
