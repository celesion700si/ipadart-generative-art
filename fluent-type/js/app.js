/**
 * FLUENT.TYPE — Main Application Controller
 */

const PRESETS = {
  sketch: { strokeWeight: 64, exaggeration: 0.48, jointMelt: 0.55, counterPinch: 0.28, waistHeight: 0.52, baselineBounce: 0.30 },
  blob:   { strokeWeight: 96, exaggeration: 0.72, jointMelt: 0.92, counterPinch: 0.62, waistHeight: 0.46, baselineBounce: 0.42 },
  tall:   { strokeWeight: 48, exaggeration: 0.65, jointMelt: 0.40, counterPinch: 0.38, waistHeight: 0.66, baselineBounce: 0.55 },
  clean:  { strokeWeight: 52, exaggeration: 0.10, jointMelt: 0.25, counterPinch: 0.10, waistHeight: 0.50, baselineBounce: 0.00 }
};

const state = {
  params: { ...PRESETS.sketch },
  glyphMap: new Map(),
  activeView: 'specimen',
  specimen: {
    text: 'Type here...\nOrganic Sketch 0123!',
    fontSize: 96,
    tracking: 10,
    renderMode: 'solid',
    showMetrics: true
  },
  editor: {
    selectedChar: 'A',
    filter: 'all',
    selectedNode: null, // { contourIdx, pointIdx }
    dragTarget: null    // { type: 'anchor'|'in'|'out', contourIdx, pointIdx, lastX, lastY }
  }
};

// ==================== INITIALIZATION ====================
function init() {
  regenerateAllGlyphs(false);
  bindSidebarControls();
  bindViewTabs();
  bindSpecimenControls();
  bindGlyphsViewControls();
  bindExportButtons();
  renderAll();
}

function regenerateAllGlyphs(forceResetCustom = false) {
  for (const ch of GLYPH_CHAR_LIST) {
    const existing = state.glyphMap.get(ch);
    if (!forceResetCustom && existing && existing.isCustomEdited) {
      continue;
    }
    const g = generateGlyph(ch, state.params);
    if (g) state.glyphMap.set(ch, g);
  }
  updateStatusBadge();
}

function updateStatusBadge() {
  const editedCount = Array.from(state.glyphMap.values()).filter((g) => g.isCustomEdited).length;
  const badge = document.getElementById('status-badge');
  badge.textContent = editedCount > 0
    ? `${state.glyphMap.size} Glyphs (${editedCount} Edited)`
    : `${state.glyphMap.size} Glyphs Ready`;
}

// ==================== SIDEBAR & SLIDERS ====================
function bindSidebarControls() {
  const paramKeys = ['strokeWeight', 'exaggeration', 'jointMelt', 'counterPinch', 'waistHeight', 'baselineBounce'];

  paramKeys.forEach((key) => {
    const input = document.getElementById(`param-${key}`);
    const valEl = document.getElementById(`val-${key}`);
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      state.params[key] = v;
      valEl.textContent = key === 'strokeWeight' ? Math.round(v) : v.toFixed(2);
      document.querySelectorAll('.preset-chip').forEach((c) => c.classList.remove('active'));
      regenerateAllGlyphs(false);
      renderAll();
    });
  });

  document.querySelectorAll('.preset-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (!preset) return;
      document.querySelectorAll('.preset-chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      applyParamsToUI(preset);
      regenerateAllGlyphs(false);
      renderAll();
    });
  });

  document.getElementById('btn-reset-params').addEventListener('click', () => {
    document.querySelectorAll('.preset-chip').forEach((c) => c.classList.remove('active'));
    document.querySelector('[data-preset="sketch"]').classList.add('active');
    applyParamsToUI(PRESETS.sketch);
    regenerateAllGlyphs(false);
    renderAll();
  });
}

function applyParamsToUI(preset) {
  state.params = { ...preset };
  for (const [key, val] of Object.entries(preset)) {
    const input = document.getElementById(`param-${key}`);
    const valEl = document.getElementById(`val-${key}`);
    if (input) input.value = val;
    if (valEl) valEl.textContent = key === 'strokeWeight' ? Math.round(val) : val.toFixed(2);
  }
}

// ==================== VIEW TABS ====================
function bindViewTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      state.activeView = view;
      document.querySelectorAll('.tab-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.view === view);
        b.setAttribute('aria-selected', b.dataset.view === view ? 'true' : 'false');
      });
      document.querySelectorAll('.workspace-view').forEach((sec) => {
        sec.classList.toggle('active', sec.id === `view-${view}`);
      });
      renderAll();
    });
  });
}

// ==================== SPECIMEN VIEW ====================
function bindSpecimenControls() {
  const textInput = document.getElementById('specimen-input');
  const sizeSlider = document.getElementById('specimen-font-size');
  const trackSlider = document.getElementById('specimen-tracking');
  const metricsToggle = document.getElementById('toggle-specimen-metrics');

  textInput.addEventListener('input', () => {
    state.specimen.text = textInput.value;
    renderSpecimen();
  });

  sizeSlider.addEventListener('input', () => {
    state.specimen.fontSize = parseInt(sizeSlider.value, 10);
    document.getElementById('val-font-size').textContent = `${state.specimen.fontSize}px`;
    renderSpecimen();
  });

  trackSlider.addEventListener('input', () => {
    state.specimen.tracking = parseInt(trackSlider.value, 10);
    const t = state.specimen.tracking;
    document.getElementById('val-tracking').textContent = t > 0 ? `+${t}` : `${t}`;
    renderSpecimen();
  });

  document.querySelectorAll('[data-render-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.specimen.renderMode = btn.dataset.renderMode;
      document.querySelectorAll('[data-render-mode]').forEach((b) =>
        b.classList.toggle('active', b.dataset.renderMode === state.specimen.renderMode)
      );
      renderSpecimen();
    });
  });

  metricsToggle.addEventListener('change', () => {
    state.specimen.showMetrics = metricsToggle.checked;
    renderSpecimen();
  });
}

function renderSpecimen() {
  const svg = document.getElementById('specimen-svg');
  const { text, fontSize, tracking, renderMode, showMetrics } = state.specimen;
  const scale = fontSize / FONT_METRICS.unitsPerEm;
  const lines = text.split('\n');
  const lineHeight = fontSize * 1.38;
  const padX = 24;
  const padY = 28;

  let maxLineWidth = 600;
  const pathsMarkup = [];
  const guidesMarkup = [];

  lines.forEach((line, lineIdx) => {
    const baselineY = padY + lineIdx * lineHeight + FONT_METRICS.ascender * scale;
    let cursorX = padX;

    for (const ch of line) {
      const glyph = state.glyphMap.get(ch) || state.glyphMap.get(' ');
      if (!glyph) continue;

      if (glyph.contours.length > 0) {
        const d = contoursToSvgPath(glyph.contours, cursorX, baselineY, scale, true);
        if (d) {
          const fill = renderMode === 'solid' ? '#f3f4f6' : 'none';
          const stroke = renderMode === 'solid' ? 'none' : '#d4ff33';
          const strokeW = renderMode === 'solid' ? 0 : Math.max(1.2, fontSize * 0.016);
          pathsMarkup.push(
            `<path d="${d}" fill="${fill}" fill-rule="nonzero" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round" />`
          );
        }
      }
      cursorX += (glyph.advanceWidth + tracking) * scale;
    }

    if (cursorX + padX > maxLineWidth) maxLineWidth = cursorX + padX;

    if (showMetrics) {
      const yAsc = (baselineY - FONT_METRICS.ascender * scale).toFixed(1);
      const yCap = (baselineY - FONT_METRICS.capHeight * scale).toFixed(1);
      const yXh = (baselineY - FONT_METRICS.xHeight * scale).toFixed(1);
      const yBase = baselineY.toFixed(1);
      const yDesc = (baselineY - FONT_METRICS.descender * scale).toFixed(1);

      guidesMarkup.push(`
        <g class="metric-guide" stroke-width="1" stroke-dasharray="4 4" opacity="0.45">
          <line x1="0" y1="${yAsc}" x2="100%" y2="${yAsc}" stroke="#334155" />
          <line x1="0" y1="${yCap}" x2="100%" y2="${yCap}" stroke="#475569" />
          <line x1="0" y1="${yXh}" x2="100%" y2="${yXh}" stroke="#38bdf8" opacity="0.5" />
          <line x1="0" y1="${yBase}" x2="100%" y2="${yBase}" stroke="#d4ff33" stroke-dasharray="none" opacity="0.6" />
          <line x1="0" y1="${yDesc}" x2="100%" y2="${yDesc}" stroke="#334155" />
        </g>
      `);
    }
  });

  const totalHeight = Math.max(260, padY * 2 + lines.length * lineHeight);
  svg.setAttribute('width', Math.ceil(maxLineWidth));
  svg.setAttribute('height', Math.ceil(totalHeight));
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(maxLineWidth)} ${Math.ceil(totalHeight)}`);
  svg.innerHTML = guidesMarkup.join('') + pathsMarkup.join('');
}

// ==================== GLYPHS GRID & NODE EDITOR ====================
function bindGlyphsViewControls() {
  document.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editor.filter = btn.dataset.filter;
      document.querySelectorAll('.filter-chip').forEach((b) =>
        b.classList.toggle('active', b.dataset.filter === state.editor.filter)
      );
      renderGlyphGrid();
    });
  });

  document.getElementById('btn-node-delete').addEventListener('click', deleteSelectedNode);
  document.getElementById('btn-glyph-reset').addEventListener('click', resetSelectedGlyph);

  window.addEventListener('keydown', (e) => {
    if (state.activeView !== 'glyphs') return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.editor.selectedNode) {
        e.preventDefault();
        deleteSelectedNode();
      }
    }
  });

  bindNodeEditorPointerEvents();
}

function filterGlyphChar(ch, filter) {
  if (ch === ' ') return filter === 'all';
  if (filter === 'upper') return ch >= 'A' && ch <= 'Z';
  if (filter === 'lower') return ch >= 'a' && ch <= 'z';
  if (filter === 'num') return ch >= '0' && ch <= '9';
  if (filter === 'punct') return !((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9'));
  return true;
}

function renderGlyphGrid() {
  const grid = document.getElementById('glyph-grid');
  grid.innerHTML = '';

  for (const ch of GLYPH_CHAR_LIST) {
    if (!filterGlyphChar(ch, state.editor.filter)) continue;
    const glyph = state.glyphMap.get(ch);
    if (!glyph) continue;

    const cell = document.createElement('div');
    cell.className = `glyph-cell${state.editor.selectedChar === ch ? ' selected' : ''}`;
    cell.title = ch === ' ' ? 'Space (U+0020)' : `${ch} (U+${glyph.unicode.toString(16).toUpperCase().padStart(4, '0')})`;

    const d = contoursToSvgPath(glyph.contours, 0, 800, 1, true);
    cell.innerHTML = `
      ${glyph.isCustomEdited ? '<span class="glyph-edited-dot" title="已手動微調"></span>' : ''}
      <svg viewBox="-60 -60 820 1120" xmlns="http://www.w3.org/2000/svg">
        <path d="${d}" fill="#e5e7eb" fill-rule="nonzero" />
      </svg>
      <span class="glyph-cell-label">${ch === ' ' ? 'SPC' : ch}</span>
    `;

    cell.addEventListener('click', () => {
      state.editor.selectedChar = ch;
      state.editor.selectedNode = null;
      renderGlyphGrid();
      renderNodeEditor();
    });

    grid.appendChild(cell);
  }
}

function renderNodeEditor() {
  const ch = state.editor.selectedChar;
  const glyph = state.glyphMap.get(ch);
  if (!glyph) return;

  // Update toolbar metadata
  document.getElementById('editor-char-badge').textContent = ch === ' ' ? '␣' : ch;
  document.getElementById('editor-unicode').textContent =
    `U+${glyph.unicode.toString(16).toUpperCase().padStart(4, '0')}`;
  document.getElementById('editor-adv-width').textContent = `Advance: ${Math.round(glyph.advanceWidth)}`;
  document.getElementById('editor-edited-tag').classList.toggle('hidden', !glyph.isCustomEdited);

  const delBtn = document.getElementById('btn-node-delete');
  delBtn.disabled = !state.editor.selectedNode;

  const svg = document.getElementById('editor-svg');
  // Mapping: OpenType (x, y) -> SVG (x, 800 - y)
  const toSvgY = (otY) => 800 - otY;
  const adv = glyph.advanceWidth;

  const guides = `
    <g class="editor-guides" font-family="monospace" font-size="22" fill="#64748b">
      <line x1="-150" y1="${toSvgY(800)}" x2="950" y2="${toSvgY(800)}" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="6 6"/>
      <text x="-130" y="${toSvgY(800) - 8}">ASC 800</text>

      <line x1="-150" y1="${toSvgY(720)}" x2="950" y2="${toSvgY(720)}" stroke="#334155" stroke-width="1.5" stroke-dasharray="6 6"/>
      <text x="-130" y="${toSvgY(720) - 8}">CAP 720</text>

      <line x1="-150" y1="${toSvgY(520)}" x2="950" y2="${toSvgY(520)}" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.6"/>
      <text x="-130" y="${toSvgY(520) - 8}" fill="#38bdf8">XH 520</text>

      <line x1="-150" y1="${toSvgY(0)}" x2="950" y2="${toSvgY(0)}" stroke="#d4ff33" stroke-width="2" opacity="0.65"/>
      <text x="-130" y="${toSvgY(0) - 8}" fill="#d4ff33">BASE 0</text>

      <line x1="-150" y1="${toSvgY(-200)}" x2="950" y2="${toSvgY(-200)}" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="6 6"/>
      <text x="-130" y="${toSvgY(-200) - 8}">DESC -200</text>

      <line x1="0" y1="-150" x2="0" y2="1050" stroke="#334155" stroke-width="1.5" />
      <line x1="${adv}" y1="-150" x2="${adv}" y2="1050" stroke="#334155" stroke-width="1.5" stroke-dasharray="6 6"/>
    </g>
  `;

  const pathD = contoursToSvgPath(glyph.contours, 0, 800, 1, true);
  const shapeMarkup = `
    <path d="${pathD}" fill="rgba(243, 244, 246, 0.14)" fill-rule="nonzero" stroke="#f3f4f6" stroke-width="2.5" stroke-linejoin="round" />
  `;

  // Render handles & anchor nodes
  const nodesMarkup = [];
  glyph.contours.forEach((contour, cIdx) => {
    contour.points.forEach((pt, pIdx) => {
      const ax = pt.x;
      const ay = toSvgY(pt.y);
      const ix = pt.inX;
      const iy = toSvgY(pt.inY);
      const ox = pt.outX;
      const oy = toSvgY(pt.outY);

      const isSelected =
        state.editor.selectedNode &&
        state.editor.selectedNode.contourIdx === cIdx &&
        state.editor.selectedNode.pointIdx === pIdx;

      nodesMarkup.push(`
        <g class="node-group">
          <line x1="${ax}" y1="${ay}" x2="${ix}" y2="${iy}" stroke="#f59e0b" stroke-width="1.5" opacity="0.65" />
          <line x1="${ax}" y1="${ay}" x2="${ox}" y2="${oy}" stroke="#f59e0b" stroke-width="1.5" opacity="0.65" />
          <circle class="bezier-handle" data-type="in" data-c="${cIdx}" data-p="${pIdx}"
            cx="${ix}" cy="${iy}" r="6.5" fill="#12141a" stroke="#f59e0b" stroke-width="2" style="cursor:grab" />
          <circle class="bezier-handle" data-type="out" data-c="${cIdx}" data-p="${pIdx}"
            cx="${ox}" cy="${oy}" r="6.5" fill="#12141a" stroke="#f59e0b" stroke-width="2" style="cursor:grab" />
          <rect class="anchor-node" data-type="anchor" data-c="${cIdx}" data-p="${pIdx}"
            x="${ax - 8}" y="${ay - 8}" width="16" height="16" rx="2"
            fill="${isSelected ? '#d4ff33' : '#38bdf8'}" stroke="#0b0c10" stroke-width="2.5" style="cursor:move" />
        </g>
      `);
    });
  });

  svg.innerHTML = guides + shapeMarkup + nodesMarkup.join('');
}

function bindNodeEditorPointerEvents() {
  const svg = document.getElementById('editor-svg');

  const getSvgCoords = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const transformed = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: transformed.x, otY: 800 - transformed.y };
  };

  svg.addEventListener('pointerdown', (e) => {
    const target = e.target;
    const type = target.dataset.type;
    if (!type) {
      state.editor.selectedNode = null;
      renderNodeEditor();
      return;
    }

    const cIdx = parseInt(target.dataset.c, 10);
    const pIdx = parseInt(target.dataset.p, 10);
    const { x, otY } = getSvgCoords(e);

    state.editor.selectedNode = { contourIdx: cIdx, pointIdx: pIdx };
    state.editor.dragTarget = { type, contourIdx: cIdx, pointIdx: pIdx, lastX: x, lastOtY: otY };
    svg.setPointerCapture(e.pointerId);
    renderNodeEditor();
  });

  svg.addEventListener('pointermove', (e) => {
    const drag = state.editor.dragTarget;
    if (!drag) return;

    const glyph = state.glyphMap.get(state.editor.selectedChar);
    if (!glyph) return;
    const pt = glyph.contours[drag.contourIdx]?.points[drag.pointIdx];
    if (!pt) return;

    const { x, otY } = getSvgCoords(e);
    const dx = x - drag.lastX;
    const dy = otY - drag.lastOtY;
    drag.lastX = x;
    drag.lastOtY = otY;

    if (drag.type === 'anchor') {
      pt.x += dx;
      pt.y += dy;
      pt.inX += dx;
      pt.inY += dy;
      pt.outX += dx;
      pt.outY += dy;
    } else if (drag.type === 'in') {
      pt.inX += dx;
      pt.inY += dy;
    } else if (drag.type === 'out') {
      pt.outX += dx;
      pt.outY += dy;
    }

    glyph.isCustomEdited = true;
    updateStatusBadge();
    renderNodeEditor();
  });

  const endDrag = () => {
    if (state.editor.dragTarget) {
      state.editor.dragTarget = null;
      renderGlyphGrid();
      renderSpecimen();
    }
  };

  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
}

function deleteSelectedNode() {
  const sel = state.editor.selectedNode;
  if (!sel) return;
  const glyph = state.glyphMap.get(state.editor.selectedChar);
  if (!glyph) return;
  const contour = glyph.contours[sel.contourIdx];
  if (!contour || contour.points.length <= 3) {
    showToast('封閉輪廓至少需保留 3 個錨點。');
    return;
  }

  contour.points.splice(sel.pointIdx, 1);
  glyph.isCustomEdited = true;
  state.editor.selectedNode = null;
  updateStatusBadge();
  renderNodeEditor();
  renderGlyphGrid();
  renderSpecimen();
}

function resetSelectedGlyph() {
  const ch = state.editor.selectedChar;
  const fresh = generateGlyph(ch, state.params);
  if (fresh) {
    state.glyphMap.set(ch, fresh);
    state.editor.selectedNode = null;
    updateStatusBadge();
    renderNodeEditor();
    renderGlyphGrid();
    renderSpecimen();
    showToast(`已將「${ch}」還原為參數化生成`);
  }
}

// ==================== EXPORT BUTTONS ====================
function bindExportButtons() {
  document.getElementById('btn-export-ttf').addEventListener('click', () => {
    try {
      exportTTF(state.glyphMap, 'CustomSketchFont');
      showToast('已編譯並下載 CustomSketchFont.ttf');
    } catch (err) {
      showToast(`匯出失敗：${err.message}`);
    }
  });

  document.getElementById('btn-export-svg').addEventListener('click', () => {
    const svg = document.getElementById('specimen-svg');
    exportSpecimenSVG(svg, 'CustomSketchSpecimen.svg');
    showToast('已匯出向量圖檔 CustomSketchSpecimen.svg');
  });
}

function renderAll() {
  if (state.activeView === 'specimen') {
    renderSpecimen();
  } else {
    renderGlyphGrid();
    renderNodeEditor();
  }
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.add('hidden'), 2600);
}

window.addEventListener('DOMContentLoaded', init);
