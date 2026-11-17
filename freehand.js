/* Resolution-independent marks, saved beside the book in IndexedDB. */
(() => {
  'use strict';
  const SVG = 'http://www.w3.org/2000/svg';
  const colours = [['Yellow', '#ffe066'], ['Mint', '#8fdaa7'], ['Blue', '#83c9f4'], ['Rose', '#f6a3c1']];
  const button = document.createElement('button');
  button.id = 'freehandButton';
  button.textContent = 'Draw';
  button.title = 'Freehand highlighter';
  button.setAttribute('aria-pressed', 'false');
  $('#readerSpeak').before(button);
  const controls = document.createElement('div');
  controls.id = 'inkControls';
  controls.hidden = true;
  controls.setAttribute('aria-label', 'Freehand highlighter controls');
  controls.innerHTML = '<label for="inkSize">Size <input id="inkSize" type="range" min="2" max="40" value="14"><output id="inkSizeLabel" for="inkSize">14 px</output></label><span id="inkColours" role="group" aria-label="Highlight colour"></span><button id="inkErase" aria-pressed="false">Erase</button><button id="inkUndo">Undo</button><button id="inkClear">Clear page</button><button id="inkDone">Done</button>';
  $('#bar').append(controls);
  let size = 14, colour = colours[0][1], erasing = false, active = null;
  const history = new Map();
  window.freehandActive = false;

  function storeBrush() {
    dbx('f', 'readwrite', store => store.put({ size, colour }, 'gr:brush')).catch(() => {});
  }
  function paintControls() {
    $('#inkSize').value = size;
    $('#inkSizeLabel').textContent = size + ' px';
    $('#inkErase').setAttribute('aria-pressed', String(erasing));
    $('#inkColours').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.colour === colour && !erasing)));
  }
  for (const [name, hex] of colours) {
    const swatch = document.createElement('button');
    swatch.className = 'ink-colour';
    swatch.style.setProperty('--swatch', hex);
    swatch.dataset.colour = hex;
    swatch.title = name;
    swatch.setAttribute('aria-label', name + ' highlighter');
    swatch.onclick = () => { colour = hex; erasing = false; paintControls(); storeBrush(); };
    $('#inkColours').append(swatch);
  }
  dbx('f', 'readonly', store => store.get('gr:brush')).then(saved => {
    if (!saved) return;
    size = Math.max(2, Math.min(40, Number(saved.size) || 14));
    if (colours.some(c => c[1] === saved.colour)) colour = saved.colour;
    paintControls();
  }).catch(() => {});
  $('#inkSize').oninput = event => { size = +event.target.value; paintControls(); storeBrush(); };
  $('#inkErase').onclick = () => { erasing = !erasing; paintControls(); };

  function setDrawing(enabled) {
    if (enabled && (!pdf || !bk)) { toast('Open a PDF from your library to draw on it.'); return; }
    if (active) finish(true);
    window.freehandActive = !!enabled;
    controls.hidden = !enabled;
    button.setAttribute('aria-pressed', String(!!enabled));
    document.body.classList.toggle('drawing', !!enabled);
    stage.style.touchAction = enabled ? 'none' : readerView === 'scroll' || zoom > 1 ? 'pan-x pan-y' : 'none';
    if (enabled) { mk = 0; er = 0; paintMk(); paintEr(); }
    paintControls();
  }
  button.onclick = () => setDrawing(!window.freehandActive);
  $('#inkDone').onclick = () => setDrawing(false);
  const rectangular = $('#mk').onclick, rectangleEraser = $('#er').onclick;
  $('#mk').title = 'Rectangular highlighter';
  $('#mk').onclick = () => { setDrawing(false); rectangular(); };
  $('#er').onclick = () => { setDrawing(false); rectangleEraser(); };

  function pageOf(slot) { return slot.classList.contains('scroll-page') ? +slot.dataset.page : slot.p; }
  function currentPage() { return readerView === 'scroll' ? +sl.value - 1 : cp(); }
  function pathData(points, height) {
    return points.map(([x, y], i) => (i ? 'L' : 'M') + (x * 1000).toFixed(2) + ' ' + (y * height).toFixed(2)).join(' ') +
      (points.length === 1 ? ' l.1 0' : '');
  }
  function layerFor(slot) {
    let layer = slot.querySelector('.ink-layer');
    if (!layer) {
      layer = document.createElementNS(SVG, 'svg');
      layer.classList.add('ink-layer');
      layer.setAttribute('aria-hidden', 'true');
      slot.append(layer);
    }
    const height = 1000 * slot.getBoundingClientRect().height / Math.max(1, slot.getBoundingClientRect().width);
    layer.setAttribute('viewBox', '0 0 1000 ' + height);
    return { layer, height };
  }
  function appendStroke(slot, stroke) {
    const { layer, height } = layerFor(slot), path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', pathData(stroke.points, height));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', stroke.colour);
    path.setAttribute('stroke-width', String(stroke.width * 1000));
    path.setAttribute('stroke-opacity', '.38');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    layer.append(path);
    return { path, height };
  }
  function paintInk(slot) {
    if (active?.slot === slot) return;
    slot.querySelector('.ink-layer')?.remove();
    if (!slot.querySelector('canvas')) return;
    for (const stroke of bk?.ink?.[pageOf(slot)] || []) appendStroke(slot, stroke);
  }
  function paintAll() { document.querySelectorAll('#book .pg, #continuous .scroll-page').forEach(paintInk); }
  const decorate = window.decorateBook;
  window.decorateBook = () => { decorate?.(); paintAll(); };
  const reset = window.readerReset;
  window.readerReset = () => { setDrawing(false); reset?.(); };
  const originalLists = lists;
  lists = function () {
    originalLists();
    const pages = Object.keys(bk?.ink || {}).filter(page => bk.ink[page].length);
    if (pages.length && !$('#t-mk').children.length) $('#t-mk').textContent = '';
    pages.sort((a, b) => a - b).forEach(page => $('#t-mk').append(item('Drawings · page ' + (+page + 1), +page)));
  };

  function remember(book, page) {
    const key = book.id + '|' + page;
    const snapshots = history.get(key) || [];
    snapshots.push((book.ink?.[page] || []).slice());
    if (snapshots.length > 30) snapshots.shift();
    history.set(key, snapshots);
  }
  async function persist(book) {
    try { await writeBook(book); lists(); } catch (error) { storageError(error); }
  }
  $('#inkUndo').onclick = () => {
    if (!bk) return;
    const page = currentPage(), snapshots = history.get(bk.id + '|' + page);
    if (!snapshots?.length) { toast('No drawing changes to undo on this page.'); return; }
    bk.ink = bk.ink || {};
    bk.ink[page] = snapshots.pop();
    paintAll(); persist(bk);
  };
  $('#inkClear').onclick = () => {
    if (!bk) return;
    const page = currentPage();
    remember(bk, page);
    bk.ink = bk.ink || {};
    bk.ink[page] = [];
    paintAll(); persist(bk);
  };

  function point(event, rect) {
    return [Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))];
  }
  function segmentDistance(point, a, b, rect) {
    const px = point[0] * rect.width, py = point[1] * rect.height;
    const ax = a[0] * rect.width, ay = a[1] * rect.height, dx = (b[0] - a[0]) * rect.width, dy = (b[1] - a[1]) * rect.height;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }
  function eraseAt(p) {
    const mark = active;
    mark.book.ink[mark.page] = mark.book.ink[mark.page].filter(stroke => {
      const radius = (size + stroke.width * mark.rect.width) / 2;
      return !stroke.points.some((b, i, all) => segmentDistance(p, all[Math.max(0, i - 1)], b, mark.rect) <= radius);
    });
    // Repaint while preserving the pointer capture on the page element.
    const slot = mark.slot;
    active = null; paintInk(slot); active = mark;
  }
  stage.addEventListener('pointerdown', event => {
    if (!window.freehandActive || !pdf || !bk || busy || (event.button !== 0 && event.pointerType !== 'touch')) return;
    const slot = event.target.closest('#book .pg, #continuous .scroll-page');
    if (!slot || !slot.querySelector('canvas')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (active) return;
    dr = 1; pj = 1;
    const page = pageOf(slot), rect = slot.getBoundingClientRect();
    if (!Number.isInteger(page) || page < 0) return;
    bk.ink = bk.ink || {}; bk.ink[page] = bk.ink[page] || [];
    if (!erasing && bk.ink[page].length >= 300) { toast('This page has many marks. Erase some before adding more.'); return; }
    remember(bk, page);
    const stroke = { points: [point(event, rect)], width: size / rect.width, colour };
    active = { slot, page, book: bk, pointer: event.pointerId, rect, stroke, erase: erasing };
    try { slot.setPointerCapture(event.pointerId); } catch (_) {}
    if (erasing) eraseAt(stroke.points[0]); else Object.assign(active, appendStroke(slot, stroke));
  }, { capture: true });
  document.addEventListener('pointermove', event => {
    if (!active || event.pointerId !== active.pointer) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (active.erase) { eraseAt(point(event, active.rect)); return; }
    const samples = event.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [event]) {
      const p = point(sample, active.rect), previous = active.stroke.points.at(-1);
      if (Math.hypot((p[0] - previous[0]) * active.rect.width, (p[1] - previous[1]) * active.rect.height) >= 1.2 && active.stroke.points.length < 4000) active.stroke.points.push(p);
    }
    active.path.setAttribute('d', pathData(active.stroke.points, active.height));
  }, { capture: true, passive: false });
  function finish(cancel) {
    const mark = active;
    if (!mark) return;
    active = null;
    try { mark.slot.releasePointerCapture(mark.pointer); } catch (_) {}
    if (cancel) {
      const snapshots = history.get(mark.book.id + '|' + mark.page);
      if (snapshots?.length) mark.book.ink[mark.page] = snapshots.pop();
    } else if (!mark.erase) mark.book.ink[mark.page].push(mark.stroke);
    paintAll();
    if (!cancel) persist(mark.book);
  }
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, event => {
    if (!active || event.pointerId !== active.pointer) return;
    event.preventDefault(); event.stopImmediatePropagation();
    finish(type === 'pointercancel');
  }, { capture: true });
  stage.addEventListener('click', event => {
    if (window.freehandActive && event.target.closest('#book, #continuous')) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, { capture: true });
  paintControls();
})();
