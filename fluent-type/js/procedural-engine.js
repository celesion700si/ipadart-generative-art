/**
 * Procedural Vector Glyph Engine
 * Converts parametric skeletons & rings into editable Cubic Bézier Contours
 * in OpenType Y-up coordinates (UPM = 1000).
 */

function signedPolygonArea(pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  return area * 0.5;
}

function ensureWinding(pts, wantClockwise) {
  const area = signedPolygonArea(pts);
  // In Y-up: area < 0 is clockwise, area > 0 is counter-clockwise
  const isCW = area < 0;
  if (isCW !== wantClockwise) {
    return [...pts].reverse();
  }
  return pts;
}

/**
 * Convert a closed polygon of [x, y] points into smooth Cubic Bézier AnchorPoints
 * using Catmull-Rom / Hobby-inspired tangent handles scaled by tension.
 */
function polygonToBezierContour(pts, tension, isHole, idPrefix) {
  const n = pts.length;
  const anchorPoints = [];

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const distPrev = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
    const distNext = Math.hypot(next[0] - curr[0], next[1] - curr[1]);
    const tangentLen = Math.hypot(dx, dy) || 1;

    const ux = dx / tangentLen;
    const uy = dy / tangentLen;

    const inLen = distPrev * tension;
    const outLen = distNext * tension;

    anchorPoints.push({
      id: `${idPrefix}_p${i}`,
      x: Math.round(curr[0] * 10) / 10,
      y: Math.round(curr[1] * 10) / 10,
      inX: Math.round((curr[0] - ux * inLen) * 10) / 10,
      inY: Math.round((curr[1] - uy * inLen) * 10) / 10,
      outX: Math.round((curr[0] + ux * outLen) * 10) / 10,
      outY: Math.round((curr[1] + uy * outLen) * 10) / 10,
      smooth: true
    });
  }

  return {
    id: idPrefix,
    closed: true,
    isHole,
    points: anchorPoints
  };
}

/**
 * Resample a polyline so strokes have enough vertices for organic swelling & joint melt.
 */
function resamplePolyline(pts, maxSegLen = 140) {
  if (pts.length < 2) return pts;
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const d = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(d / maxSegLen));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  }
  return out;
}

/**
 * Expand an open stroke polyline into a closed organic brush contour.
 */
function expandStrokeToContour(stroke, params, seed, idPrefix) {
  const { strokeWeight, exaggeration, jointMelt } = params;
  const flare = stroke.flare || 1.0;
  let pts = resamplePolyline(stroke.pts, 150);

  // If stroke is a dot (2 very close points)
  const totalLen = pts.reduce((acc, p, idx) => {
    if (idx === 0) return 0;
    return acc + Math.hypot(p[0] - pts[idx - 1][0], p[1] - pts[idx - 1][1]);
  }, 0);

  if (totalLen < 35) {
    const cx = (pts[0][0] + pts[pts.length - 1][0]) * 0.5;
    const cy = (pts[0][1] + pts[pts.length - 1][1]) * 0.5;
    const r = strokeWeight * 0.62 * (1 + 0.15 * exaggeration * flare);
    const dotPts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const wob = 1 + 0.08 * exaggeration * Math.sin(a * 2 + seed * 5);
      dotPts.push([cx + Math.cos(a) * r * wob, cy + Math.sin(a) * r * wob]);
    }
    const ordered = ensureWinding(dotPts, true);
    return polygonToBezierContour(ordered, 0.36, false, idPrefix);
  }

  const n = pts.length;
  const leftSide = [];
  const rightSide = [];

  for (let i = 0; i < n; i++) {
    let tx, ty;
    if (i === 0) {
      tx = pts[1][0] - pts[0][0];
      ty = pts[1][1] - pts[0][1];
    } else if (i === n - 1) {
      tx = pts[n - 1][0] - pts[n - 2][0];
      ty = pts[n - 1][1] - pts[n - 2][1];
    } else {
      tx = pts[i + 1][0] - pts[i - 1][0];
      ty = pts[i + 1][1] - pts[i - 1][1];
    }
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;

    // Normal pointing left of tangent
    const nx = -ty;
    const ny = tx;

    // Organic width modulation: flared terminals + subtle middle waist
    const u = i / (n - 1);
    const terminalFactor = Math.pow(Math.abs(u - 0.5) * 2, 1.8);
    const flareMod = 1 + 0.24 * exaggeration * flare * terminalFactor;
    const organicWave = 1 + 0.09 * exaggeration * Math.sin(u * Math.PI * 2.5 + seed * 9.0);
    const hw = strokeWeight * 0.5 * flareMod * organicWave;

    leftSide.push([pts[i][0] + nx * hw, pts[i][1] + ny * hw]);
    rightSide.push([pts[i][0] - nx * hw, pts[i][1] - ny * hw]);
  }

  // Rounded organic end caps
  const startTx = pts[1][0] - pts[0][0];
  const startTy = pts[1][1] - pts[0][1];
  const sLen = Math.hypot(startTx, startTy) || 1;
  const capStart = [
    pts[0][0] - (startTx / sLen) * strokeWeight * 0.48,
    pts[0][1] - (startTy / sLen) * strokeWeight * 0.48
  ];

  const endTx = pts[n - 1][0] - pts[n - 2][0];
  const endTy = pts[n - 1][1] - pts[n - 2][1];
  const eLen = Math.hypot(endTx, endTy) || 1;
  const capEnd = [
    pts[n - 1][0] + (endTx / eLen) * strokeWeight * 0.48,
    pts[n - 1][1] + (endTy / eLen) * strokeWeight * 0.48
  ];

  // Combine into closed polygon
  const combined = [
    ...leftSide,
    capEnd,
    ...rightSide.reverse(),
    capStart
  ];

  const ordered = ensureWinding(combined, true);
  const tension = lerp(0.14, 0.39, jointMelt);
  return polygonToBezierContour(ordered, tension, false, idPrefix);
}

/**
 * Expand a ring (outer contour + inner counter holes) into Bézier contours.
 */
function expandRingToContours(ring, params, idPrefix) {
  const { jointMelt } = params;
  const tension = lerp(0.22, 0.44, jointMelt);
  const contours = [];

  const outerOrdered = ensureWinding(ring.outer, true); // CW
  contours.push(polygonToBezierContour(outerOrdered, tension, false, `${idPrefix}_outer`));

  if (ring.holes) {
    ring.holes.forEach((holePts, idx) => {
      const holeOrdered = ensureWinding(holePts, false); // CCW
      contours.push(polygonToBezierContour(holeOrdered, tension, true, `${idPrefix}_hole${idx}`));
    });
  }

  return contours;
}

/**
 * Apply baseline bounce (vertical shift + subtle organic tilt) to all contours of a glyph.
 */
function applyBaselineBounce(contours, advanceWidth, bounceAmount, seed) {
  if (bounceAmount <= 0.001 || contours.length === 0) return;

  const seed2 = (seed * 17.31) % 1;
  const dy = (seed - 0.5) * 2 * 56 * bounceAmount;
  const angle = (seed2 - 0.5) * 2 * 0.11 * bounceAmount;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const cx = advanceWidth * 0.5;
  const cy = 300;

  const transformPt = (x, y) => {
    const dx = x - cx;
    const dy0 = y - cy;
    return [
      cx + dx * cosA - dy0 * sinA,
      cy + dx * sinA + dy0 * cosA + dy
    ];
  };

  for (const c of contours) {
    for (const p of c.points) {
      const [nx, ny] = transformPt(p.x, p.y);
      const [nix, niy] = transformPt(p.inX, p.inY);
      const [nox, noy] = transformPt(p.outX, p.outY);
      p.x = Math.round(nx * 10) / 10;
      p.y = Math.round(ny * 10) / 10;
      p.inX = Math.round(nix * 10) / 10;
      p.inY = Math.round(niy * 10) / 10;
      p.outX = Math.round(nox * 10) / 10;
      p.outY = Math.round(noy * 10) / 10;
    }
  }
}

/**
 * Generate a single GlyphData object from current parameters.
 */
function generateGlyph(char, params) {
  const fn = GLYPH_BLUEPRINTS[char];
  if (!fn) return null;

  const seed = charSeed(char);
  const blueprint = fn({
    W: params.waistHeight,
    P: params.counterPinch,
    E: params.exaggeration,
    S: params.strokeWeight
  });

  const contours = [];
  if (blueprint.strokes) {
    blueprint.strokes.forEach((stroke, idx) => {
      contours.push(expandStrokeToContour(stroke, params, seed + idx * 0.13, `s${idx}`));
    });
  }
  if (blueprint.rings) {
    blueprint.rings.forEach((ring, idx) => {
      contours.push(...expandRingToContours(ring, params, `r${idx}`));
    });
  }

  applyBaselineBounce(contours, blueprint.advanceWidth, params.baselineBounce, seed);

  return {
    char,
    unicode: char.charCodeAt(0),
    advanceWidth: blueprint.advanceWidth,
    contours,
    isCustomEdited: false
  };
}

/**
 * Convert GlyphContour[] (OpenType Y-up) to an SVG path string in Y-down coordinates.
 * Used for Specimen View, Grid Thumbnails, and SVG Export.
 */
function contoursToSvgPath(contours, offsetX = 0, offsetY = 0, scale = 1, flipY = true) {
  let d = '';
  const tx = (x) => (offsetX + x * scale).toFixed(2);
  const ty = (y) => (flipY ? offsetY - y * scale : offsetY + y * scale).toFixed(2);

  for (const c of contours) {
    const pts = c.points;
    if (!pts || pts.length < 2) continue;
    d += `M ${tx(pts[0].x)} ${ty(pts[0].y)} `;
    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      d += `C ${tx(curr.outX)} ${ty(curr.outY)}, ${tx(next.inX)} ${ty(next.inY)}, ${tx(next.x)} ${ty(next.y)} `;
    }
    if (c.closed) d += 'Z ';
  }
  return d.trim();
}
