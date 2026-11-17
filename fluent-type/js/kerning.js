/**
 * Automatic kerning for FLUENT.TYPE
 *
 * Measures the real gap between the right edge of one glyph and the left edge
 * of the next, row by row, and nudges pairs whose gap differs from the font's
 * normal rhythm (AV, To, LT ...). The same values drive the on-screen specimen
 * and the exported font, so what you see is what you install.
 */

const KERN = {
  rowStep: 10,       // font units per scan row
  yMin: -320,
  yMax: 960,
  dilate: 2,         // rows of vertical tolerance, so near-misses still count
  strength: 0.7,     // how much of the measured difference to correct
  maxTighten: -130,
  maxLoosen: 60,
  minValue: 18,      // ignore corrections too small to see
  reference: ['n', 'o', 'h', 'a', 'e', 'd', 'u', 'm', 'i', 'l']
};

function kernGlyphSignature(glyph) {
  let s = glyph.advanceWidth;
  for (const c of glyph.contours) {
    for (const p of c.points) s = (s * 31 + p.x * 7 + p.y * 13 + p.outX + p.inY) % 1e9;
  }
  return s;
}

/** Left-most and right-most ink per scan row, in font units. */
function buildKernProfile(glyph) {
  const rows = Math.round((KERN.yMax - KERN.yMin) / KERN.rowStep) + 1;
  const left = new Float32Array(rows).fill(Infinity);
  const right = new Float32Array(rows).fill(-Infinity);
  const rowOf = (y) => (y - KERN.yMin) / KERN.rowStep;

  const mark = (row, x) => {
    if (row < 0 || row >= rows) return;
    if (x < left[row]) left[row] = x;
    if (x > right[row]) right[row] = x;
  };

  const scanSegment = (x0, y0, x1, y1) => {
    const r0 = rowOf(y0);
    const r1 = rowOf(y1);
    mark(Math.round(r0), x0);
    mark(Math.round(r1), x1);
    const lo = Math.ceil(Math.min(r0, r1));
    const hi = Math.floor(Math.max(r0, r1));
    for (let r = lo; r <= hi; r++) {
      const t = r1 === r0 ? 0 : (r - r0) / (r1 - r0);
      mark(r, x0 + (x1 - x0) * t);
    }
  };

  for (const c of glyph.contours) {
    const pts = c.points;
    if (!pts || pts.length < 2) continue;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      let px = a.x;
      let py = a.y;
      const STEPS = 10;
      for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const u = 1 - t;
        const x = u * u * u * a.x + 3 * u * u * t * a.outX + 3 * u * t * t * b.inX + t * t * t * b.x;
        const y = u * u * u * a.y + 3 * u * u * t * a.outY + 3 * u * t * t * b.inY + t * t * t * b.y;
        scanSegment(px, py, x, y);
        px = x;
        py = y;
      }
    }
  }

  // Vertical tolerance: each row also sees the ink of its neighbours
  const dl = new Float32Array(rows).fill(Infinity);
  const dr = new Float32Array(rows).fill(-Infinity);
  let hasInk = false;
  for (let r = 0; r < rows; r++) {
    for (let k = -KERN.dilate; k <= KERN.dilate; k++) {
      const q = r + k;
      if (q < 0 || q >= rows) continue;
      if (left[q] < dl[r]) dl[r] = left[q];
      if (right[q] > dr[r]) dr[r] = right[q];
    }
    if (dl[r] !== Infinity) hasInk = true;
  }
  return { left: dl, right: dr, rows, hasInk, advance: glyph.advanceWidth };
}

const kernProfileCache = new Map(); // char -> { sig, profile }
let kernContext = { key: null, target: 0, pairs: new Map() };

function getKernProfile(char, glyph) {
  const sig = kernGlyphSignature(glyph);
  const hit = kernProfileCache.get(char);
  if (hit && hit.sig === sig) return hit.profile;
  const profile = buildKernProfile(glyph);
  kernProfileCache.set(char, { sig, profile });
  return profile;
}

/** Smallest horizontal gap between two glyphs set side by side, or null if they never face each other. */
function kernPairGap(pa, pb) {
  let gap = Infinity;
  for (let r = 0; r < pa.rows; r++) {
    if (pa.right[r] === -Infinity || pb.left[r] === Infinity) continue;
    const g = pa.advance - pa.right[r] + pb.left[r];
    if (g < gap) gap = g;
  }
  return gap === Infinity ? null : gap;
}

function getKernContext(glyphMap) {
  let key = 0;
  for (const g of glyphMap.values()) key = (key * 17 + kernGlyphSignature(g)) % 1e12;
  if (kernContext.key === key) return kernContext;

  // The font's normal rhythm: the typical gap between plain lowercase letters
  const gaps = [];
  for (const a of KERN.reference) {
    for (const b of KERN.reference) {
      const ga = glyphMap.get(a);
      const gb = glyphMap.get(b);
      if (!ga || !gb) continue;
      const gap = kernPairGap(getKernProfile(a, ga), getKernProfile(b, gb));
      if (gap !== null) gaps.push(gap);
    }
  }
  gaps.sort((x, y) => x - y);
  // Upper part of the range, so ordinary pairs are left exactly as designed
  const target = gaps.length ? gaps[Math.floor(gaps.length * 0.7)] : 0;
  kernContext = { key, target, pairs: new Map() };
  return kernContext;
}

/**
 * Kerning for the pair (a, b) in font units. Negative pulls the letters together.
 */
function getKerning(glyphMap, a, b, sharedCtx) {
  if (a === ' ' || b === ' ') return 0;
  if (/[0-9]/.test(a) && /[0-9]/.test(b)) return 0; // keep figures evenly spaced
  const ga = glyphMap.get(a);
  const gb = glyphMap.get(b);
  if (!ga || !gb || !ga.contours.length || !gb.contours.length) return 0;

  const ctx = sharedCtx || getKernContext(glyphMap);
  const id = a + b;
  if (ctx.pairs.has(id)) return ctx.pairs.get(id);

  const pa = getKernProfile(a, ga);
  const pb = getKernProfile(b, gb);
  let value = 0;
  const gap = kernPairGap(pa, pb);
  if (gap !== null) {
    let delta = 0;
    if (gap > ctx.target) {
      delta = (ctx.target - gap) * KERN.strength;      // too loose: tighten
    } else if (gap < ctx.target * 0.35) {
      delta = ctx.target * 0.35 - gap;                 // touching or colliding: open up
    }
    delta = Math.max(KERN.maxTighten, Math.min(KERN.maxLoosen, delta));
    // Never pull a glyph further than a third of the narrower letter
    const limit = -Math.min(ga.advanceWidth, gb.advanceWidth) * 0.34;
    if (delta < limit) delta = limit;
    value = Math.abs(delta) >= KERN.minValue ? Math.round(delta) : 0;
  }
  ctx.pairs.set(id, value);
  return value;
}

/** Every non-zero pair, for writing into the exported font. */
function buildKerningTable(glyphMap) {
  const out = [];
  const chars = Array.from(glyphMap.keys());
  const ctx = getKernContext(glyphMap);
  for (const a of chars) {
    for (const b of chars) {
      const v = getKerning(glyphMap, a, b, ctx);
      if (v !== 0) out.push({ left: a, right: b, value: v });
    }
  }
  return out;
}
