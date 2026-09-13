(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const els = {
    frame: $('#canvas-frame'),
    art: $('#art-canvas'),
    film: $('#film'),
    filmCanvas: $('#film-canvas'),
    hint: $('#drag-hint'),
    modeStatus: $('#mode-status'),
    phaseValue: $('#phase-value'),
    phaseIndex: $('#phase-index'),
    autoButton: $('#auto-button'),
    autoIcon: $('#auto-icon'),
    autoLabel: $('#auto-label'),
    resetButton: $('#reset-button'),
    filmButton: $('#film-button'),
    modeExplanation: $('#mode-explanation'),
    patternGrid: $('#pattern-grid'),
    patternCount: $('#pattern-count'),
    paletteRow: $('#palette-row'),
    colorObservation: $('#color-observation'),
    pitch: $('#pitch-input'),
    pitchOutput: $('#pitch-output'),
    slit: $('#slit-input'),
    slitOutput: $('#slit-output'),
    slitGroup: $('#slit-group'),
    tilt: $('#tilt-input'),
    tiltOutput: $('#tilt-output'),
    speed: $('#speed-input'),
    speedOutput: $('#speed-output'),
    aboutButton: $('#about-button'),
    learningPanel: $('#learning-panel'),
    closeLearning: $('#close-learning')
  };

  const artCtx = els.art.getContext('2d', { alpha: false });
  const filmCtx = els.filmCanvas.getContext('2d', { alpha: true });

  const palettes = {
    'cyan-rose': ['#10d9d2', '#ff4f87'],
    'blue-orange': ['#5165ff', '#ffad28'],
    'violet-lime': ['#9b5cff', '#c8ff38'],
    'red-green': ['#ff4b3e', '#19d47b']
  };

  const patterns = [
    ['ripple', '流體漣漪', '雙中心波', 'rings'],
    ['spiral', '螺旋渦流', '旋轉深度', 'spiral'],
    ['radial', '放射脈衝', '角度擴張', 'radial'],
    ['tunnel', '幾何隧道', '進退錯覺', 'tunnel'],
    ['waves', '漂移波場', '方向擺動', 'waves']
  ];

  const state = {
    mode: 'moire',
    pattern: 'ripple',
    colorMode: 'duotone',
    palette: 'cyan-rose',
    colors: palettes['cyan-rose'],
    pitch: 12,
    slitRatio: .22,
    tilt: 0,
    speed: 2,
    filmX: 0,
    filmY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    originX: 0,
    originY: 0,
    filmVisible: true,
    auto: false,
    direction: 1,
    animationId: 0,
    lastTime: 0,
    moirePitch: 12,
    moireSlit: .22
  };

  function dimensions(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return { width: canvas.width / dpr, height: canvas.height / dpr, dpr };
  }

  function setupCanvas(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resize() {
    setupCanvas(els.art, artCtx);
    setupCanvas(els.filmCanvas, filmCtx);
    render();
  }

  function paletteColor(index, total = 12) {
    if (state.colorMode === 'mono') return index % 2 ? '#0d0f16' : '#252832';
    if (state.colorMode === 'phase') {
      const hue = (index / Math.max(total, 1) * 310 + 172) % 360;
      return `hsl(${hue} 84% 48%)`;
    }
    return state.colors[Math.abs(index) % 2];
  }

  function backgroundColor() {
    return state.colorMode === 'mono' ? '#f5f2ea' : '#f8f7f2';
  }

  function strokePath(ctx, color, width, draw) {
    ctx.beginPath();
    draw();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function drawRipple(w, h, p) {
    const centers = [[w * .42, h * .52], [w * .66, h * .42]];
    const maxR = Math.hypot(w, h) * .76;
    centers.forEach((center, field) => {
      for (let r = p; r < maxR; r += p * 1.75) {
        const index = Math.round(r / (p * 1.75)) + field;
        strokePath(artCtx, paletteColor(index, maxR / p), p * .52, () => {
          artCtx.ellipse(center[0], center[1], r, r * (.78 + field * .08), field ? -.08 : .1, 0, Math.PI * 2);
        });
      }
    });
  }

  function drawSpiral(w, h, p) {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(w, h) * .68;
    for (let arm = 0; arm < 4; arm += 1) {
      strokePath(artCtx, paletteColor(arm, 4), p * .5, () => {
        for (let theta = .1; theta < 38 * Math.PI; theta += .065) {
          const r = p * .18 * theta;
          if (r > maxR) break;
          const angle = theta + arm * Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (theta < .2) artCtx.moveTo(x, y); else artCtx.lineTo(x, y);
        }
      });
    }
  }

  function drawRadial(w, h, p) {
    const cx = w * .5;
    const cy = h * .5;
    const rayCount = Math.max(44, Math.round(760 / p));
    const radius = Math.hypot(w, h);
    for (let i = 0; i < rayCount; i += 1) {
      const angle = i / rayCount * Math.PI * 2;
      strokePath(artCtx, paletteColor(i, rayCount), Math.max(1.2, p * .28), () => {
        artCtx.moveTo(cx, cy);
        artCtx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      });
    }
    for (let r = p * 2; r < radius; r += p * 2.4) {
      strokePath(artCtx, paletteColor(Math.round(r / p), radius / p), Math.max(1, p * .24), () => {
        artCtx.arc(cx, cy, r, 0, Math.PI * 2);
      });
    }
  }

  function drawTunnel(w, h, p) {
    const cx = w / 2;
    const cy = h / 2;
    const maxSize = Math.max(w, h) * 1.25;
    let index = 0;
    for (let size = p * 2; size < maxSize; size += p * 2) {
      strokePath(artCtx, paletteColor(index, maxSize / p), p * .52, () => {
        artCtx.rect(cx - size / 2, cy - size * .4, size, size * .8);
      });
      index += 1;
    }
    artCtx.save();
    artCtx.translate(cx, cy);
    artCtx.rotate(Math.PI / 4);
    for (let size = p * 3; size < maxSize; size += p * 3.3) {
      strokePath(artCtx, paletteColor(index++, maxSize / p), p * .3, () => {
        artCtx.rect(-size / 2, -size / 2, size, size);
      });
    }
    artCtx.restore();
  }

  function drawWaves(w, h, p) {
    let index = 0;
    for (let x = -w * .25; x < w * 1.25; x += p * 1.55) {
      strokePath(artCtx, paletteColor(index++, w / p), p * .55, () => {
        for (let y = -20; y <= h + 20; y += 8) {
          const offset = Math.sin(y * .026 + x * .018) * p * 2.2;
          if (y < 0) artCtx.moveTo(x + offset, y); else artCtx.lineTo(x + offset, y);
        }
      });
    }
  }

  function drawScanimation(w, h, p) {
    const frames = 6;
    const sliceWidth = p / frames;
    const cx = w / 2;
    const cy = h / 2;

    for (let frame = 0; frame < frames; frame += 1) {
      const buffer = document.createElement('canvas');
      buffer.width = Math.round(w);
      buffer.height = Math.round(h);
      const ctx = buffer.getContext('2d');
      const phase = frame / frames * Math.PI * 2;
      const bodyY = cy - 18 + Math.sin(phase * 2) * 13;
      const stride = Math.sin(phase) * Math.min(75, w * .105);
      const color = paletteColor(frame, frames);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(12, w * .018);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.arc(cx, bodyY - 76, Math.max(19, w * .032), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, bodyY - 45);
      ctx.quadraticCurveTo(cx + Math.sin(phase) * 11, bodyY + 10, cx, bodyY + 56);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, bodyY - 24);
      ctx.lineTo(cx - 45 - stride * .55, bodyY + 15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, bodyY - 24);
      ctx.lineTo(cx + 45 + stride * .55, bodyY + 15);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, bodyY + 50);
      ctx.lineTo(cx - 35 - stride, bodyY + 130);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, bodyY + 50);
      ctx.lineTo(cx + 35 + stride, bodyY + 130);
      ctx.stroke();

      ctx.globalAlpha = .18;
      ctx.beginPath();
      ctx.arc(cx, cy + 135, 92 + Math.cos(phase) * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      for (let x = 0; x < w; x += p) {
        const sx = x + frame * sliceWidth;
        artCtx.drawImage(buffer, sx, 0, sliceWidth + .45, h, sx, 0, sliceWidth + .45, h);
      }
    }
  }

  function drawArt() {
    const { width: w, height: h } = dimensions(els.art);
    artCtx.clearRect(0, 0, w, h);
    artCtx.fillStyle = backgroundColor();
    artCtx.fillRect(0, 0, w, h);

    if (state.mode === 'scanimation') {
      drawScanimation(w, h, state.pitch);
      return;
    }

    const drawers = {
      ripple: drawRipple,
      spiral: drawSpiral,
      radial: drawRadial,
      tunnel: drawTunnel,
      waves: drawWaves
    };
    drawers[state.pattern](w, h, state.pitch);
  }

  function drawFilm() {
    const { width: w, height: h } = dimensions(els.filmCanvas);
    const p = state.pitch;
    const slit = p * state.slitRatio;
    filmCtx.clearRect(0, 0, w, h);
    filmCtx.save();
    filmCtx.translate(w / 2, h / 2);
    filmCtx.rotate(state.tilt * Math.PI / 180);
    filmCtx.translate(-w / 2, -h / 2);
    filmCtx.fillStyle = 'rgba(4,5,10,.965)';
    const pad = Math.hypot(w, h) * .2;
    for (let x = -pad; x < w + pad; x += p) {
      filmCtx.fillRect(x + slit, -pad, p - slit + .25, h + pad * 2);
    }
    filmCtx.restore();
  }

  function render() {
    drawArt();
    drawFilm();
    updateFilm();
  }

  function updateFilm() {
    els.film.style.visibility = state.filmVisible ? 'visible' : 'hidden';
    els.film.style.pointerEvents = state.filmVisible ? 'auto' : 'none';
    els.film.style.transform = `translate3d(${state.filmX}px, ${state.filmY}px, 0)`;
    const phases = state.mode === 'scanimation' ? 6 : Math.max(2, Math.round(1 / state.slitRatio));
    const normalized = ((state.filmX % state.pitch) + state.pitch) % state.pitch;
    const phase = Math.round(normalized / state.pitch * phases) % phases;
    els.phaseValue.textContent = `${state.filmX.toFixed(1)} px`;
    els.phaseIndex.textContent = `${phase + 1} / ${phases}`;
    els.film.setAttribute('aria-valuenow', Math.round(state.filmX));
  }

  function hideHint() {
    els.hint.style.opacity = '0';
  }

  function setAuto(on) {
    state.auto = on;
    els.autoIcon.textContent = on ? 'Ⅱ' : '▶';
    els.autoLabel.textContent = on ? '暫停掃描' : '自動掃描';
    if (on) {
      state.lastTime = performance.now();
      cancelAnimationFrame(state.animationId);
      state.animationId = requestAnimationFrame(autoLoop);
      hideHint();
    } else {
      cancelAnimationFrame(state.animationId);
      state.animationId = 0;
    }
  }

  function autoLoop(time) {
    if (!state.auto) return;
    const delta = Math.min(40, time - state.lastTime) / 1000;
    state.lastTime = time;
    const pxPerSecond = [14, 28, 48][state.speed - 1];
    state.filmX += pxPerSecond * delta * state.direction;

    if (state.mode === 'scanimation') {
      if (state.filmX >= state.pitch) state.filmX -= state.pitch;
      if (state.filmX < 0) state.filmX += state.pitch;
    } else {
      const bound = Math.min(84, els.frame.clientWidth * .14);
      if (Math.abs(state.filmX) >= bound) {
        state.filmX = Math.sign(state.filmX) * bound;
        state.direction *= -1;
      }
    }
    updateFilm();
    state.animationId = requestAnimationFrame(autoLoop);
  }

  function patternMarkup() {
    if (state.mode === 'scanimation') {
      return '<button class="pattern active" type="button" disabled><i class="pattern-icon radial"></i><span><b>六幀動作</b><small>切片交錯 × 光柵解碼</small></span></button>';
    }
    return patterns.map(([key, title, note, icon]) => `
      <button class="pattern ${state.pattern === key ? 'active' : ''}" data-pattern="${key}" type="button">
        <i class="pattern-icon ${icon}"></i><span><b>${title}</b><small>${note}</small></span>
      </button>`).join('');
  }

  function bindPatternButtons() {
    $$('.pattern[data-pattern]', els.patternGrid).forEach(button => {
      button.addEventListener('click', () => {
        state.pattern = button.dataset.pattern;
        $$('.pattern', els.patternGrid).forEach(item => item.classList.toggle('active', item === button));
        drawArt();
      });
    });
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    setAuto(false);
    if (mode === 'scanimation') {
      state.moirePitch = state.pitch;
      state.moireSlit = state.slitRatio;
      state.mode = mode;
      state.pitch = 24;
      state.slitRatio = 1 / 6;
      state.tilt = 0;
      els.modeStatus.textContent = '逐格動畫';
      els.modeExplanation.textContent = '六張動作影格被切成細條交錯排列；移動光柵，狹縫會依序顯示每一格。';
      els.patternCount.textContent = '6 幀切片動畫';
      els.slitGroup.classList.add('locked');
      els.slit.disabled = true;
    } else {
      state.mode = mode;
      state.pitch = state.moirePitch;
      state.slitRatio = state.moireSlit;
      els.modeStatus.textContent = '莫列干涉';
      els.modeExplanation.textContent = '兩組週期結構疊合，細小差異會形成被放大的干涉波。';
      els.patternCount.textContent = '5 種干涉底圖';
      els.slitGroup.classList.remove('locked');
      els.slit.disabled = false;
    }
    state.filmX = 0;
    state.filmY = 0;
    els.patternGrid.innerHTML = patternMarkup();
    bindPatternButtons();
    syncControls();
    render();
  }

  function setColorMode(mode) {
    state.colorMode = mode;
    if (mode === 'complementary') {
      state.colors = palettes['blue-orange'];
      state.palette = 'blue-orange';
    } else if (mode === 'duotone' && !palettes[state.palette]) {
      state.palette = 'cyan-rose';
      state.colors = palettes[state.palette];
    }
    $$('.color-mode').forEach(button => {
      const active = button.dataset.colorMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
    });
    els.paletteRow.hidden = mode === 'mono' || mode === 'phase';
    const messages = {
      mono: '<span>比較看看：</span>拿掉色相後，圖形的速度感與深度是否改變？',
      duotone: '<span>試著看：</span>兩種色彩的邊界，是否比單色更像在顫動？',
      complementary: '<span>試著看：</span>互補色並置時，邊界會不會出現額外的亮光？',
      phase: '<span>找一找：</span>光柵平移時，哪一段色相最先從狹縫現身？'
    };
    els.colorObservation.innerHTML = messages[mode];
    syncPaletteButtons();
    drawArt();
  }

  function syncPaletteButtons() {
    $$('.swatch').forEach(button => button.classList.toggle('active', button.dataset.palette === state.palette));
  }

  function syncControls() {
    els.pitch.value = String(state.pitch);
    els.pitchOutput.value = `${state.pitch} px`;
    els.slit.value = String(Math.round(state.slitRatio * 100));
    els.slitOutput.value = state.mode === 'scanimation' ? '1 / 6 固定' : `${Math.round(state.slitRatio * 100)}%`;
    els.tilt.value = String(state.tilt);
    els.tiltOutput.value = `${state.tilt.toFixed(1)}°`;
    els.speed.value = String(state.speed);
    els.speedOutput.value = ['慢', '中', '快'][state.speed - 1];
    $$('.segment').forEach(button => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function resetPosition() {
    setAuto(false);
    state.filmX = 0;
    state.filmY = 0;
    state.direction = 1;
    updateFilm();
  }

  els.film.addEventListener('pointerdown', event => {
    state.dragging = true;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.originX = state.filmX;
    state.originY = state.filmY;
    els.film.setPointerCapture(event.pointerId);
    setAuto(false);
    hideHint();
  });
  els.film.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    state.filmX = Math.max(-100, Math.min(100, state.originX + event.clientX - state.dragStartX));
    state.filmY = Math.max(-20, Math.min(20, state.originY + (event.clientY - state.dragStartY) * .15));
    updateFilm();
  });
  const endDrag = event => {
    if (!state.dragging) return;
    state.dragging = false;
    try { els.film.releasePointerCapture(event.pointerId); } catch (_) { /* capture may already be released */ }
  };
  els.film.addEventListener('pointerup', endDrag);
  els.film.addEventListener('pointercancel', endDrag);
  els.film.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    hideHint();
    state.filmX = Math.max(-100, Math.min(100, state.filmX + (event.key === 'ArrowRight' ? 1 : -1)));
    updateFilm();
  });

  els.autoButton.addEventListener('click', () => setAuto(!state.auto));
  els.resetButton.addEventListener('click', resetPosition);
  els.filmButton.addEventListener('click', () => {
    state.filmVisible = !state.filmVisible;
    els.filmButton.textContent = state.filmVisible ? '隱藏光柵' : '顯示光柵';
    els.filmButton.setAttribute('aria-pressed', String(state.filmVisible));
    updateFilm();
  });
  $$('.segment').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $$('.color-mode').forEach(button => button.addEventListener('click', () => setColorMode(button.dataset.colorMode)));
  $$('.swatch').forEach(button => button.addEventListener('click', () => {
    state.palette = button.dataset.palette;
    state.colors = palettes[state.palette];
    state.colorMode = 'duotone';
    setColorMode('duotone');
  }));
  els.pitch.addEventListener('input', () => {
    state.pitch = Number(els.pitch.value);
    if (state.mode === 'moire') state.moirePitch = state.pitch;
    els.pitchOutput.value = `${state.pitch} px`;
    render();
  });
  els.slit.addEventListener('input', () => {
    state.slitRatio = Number(els.slit.value) / 100;
    state.moireSlit = state.slitRatio;
    els.slitOutput.value = `${els.slit.value}%`;
    drawFilm();
    updateFilm();
  });
  els.tilt.addEventListener('input', () => {
    state.tilt = Number(els.tilt.value);
    els.tiltOutput.value = `${state.tilt.toFixed(1)}°`;
    drawFilm();
  });
  els.speed.addEventListener('input', () => {
    state.speed = Number(els.speed.value);
    els.speedOutput.value = ['慢', '中', '快'][state.speed - 1];
  });

  function toggleLearning(show) {
    els.learningPanel.hidden = !show;
    els.aboutButton.setAttribute('aria-expanded', String(show));
    if (show) els.learningPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  els.aboutButton.addEventListener('click', () => toggleLearning(els.learningPanel.hidden));
  els.closeLearning.addEventListener('click', () => toggleLearning(false));

  bindPatternButtons();
  syncControls();
  syncPaletteButtons();
  const observer = new ResizeObserver(resize);
  observer.observe(els.frame);
})();
