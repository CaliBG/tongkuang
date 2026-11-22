const limit = (value, min, max) => Math.min(max, Math.max(min, value));

// Keep only decoded frames near the playhead. Transparency must be cleared
// between frames: an unfolded device must not remain behind a folded one.
export function createDuoFrameSequence(config, {onFrame = (_index) => {}, onState = (_state) => {}} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', {alpha: true});
  if (!context) throw new Error('Duo canvas unavailable');
  const cache = new Map(), pending = new Map(), failed = new Set();
  const cacheLimit = 20, parallelLimit = 4;
  let target = -1, painted = -1, direction = 1, queue = [], disposed = false, state = 'idle';

  let atlas = null, layout = null, loadingImage = null, useAtlas = !!config.overview;
  let detailTimer, atlasTimer;

  function setState(next) {
    if (state === next || disposed) return;
    state = next;
    onState(next);
  }
  function paint(index) {
    if (disposed || index !== target || index < 0) return false;
    const detail = cache.get(index);
    if (!detail && !atlas) return false;
    const quality = detail ? 'detail' : layout.step > 1 ? 'preview' : 'motion';
    const visibleIndex = detail ? index : Math.floor(index / layout.step) * layout.step;
    if (painted !== visibleIndex || canvas.dataset.quality !== quality) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (detail) {
        context.drawImage(detail, 0, 0, canvas.width, canvas.height);
      } else {
        const {width, height, columns, step} = layout;
        const cell = visibleIndex / step;
        context.drawImage(atlas, (cell % columns) * width, Math.floor(cell / columns) * height,
          width, height, 0, 0, canvas.width, canvas.height);
      }
      painted = visibleIndex;
      canvas.dataset.frame = String(visibleIndex);
      canvas.dataset.quality = quality;
      onFrame(visibleIndex);
    }
    setState('ready');
    return true;
  }
  function trim() {
    const farthest = [...cache.keys()].sort((a, b) => Math.abs(b - target) - Math.abs(a - target));
    while (cache.size > cacheLimit) cache.delete(farthest.shift());
  }
  function schedule() {
    // A seek should never sit behind four speculative requests on a slow link.
    if (!cache.has(target) && !pending.has(target) && pending.size >= parallelLimit) {
      const obsolete = [...pending.keys()].sort((a, b) => Math.abs(b - target) - Math.abs(a - target))[0];
      pending.get(obsolete)();
      pending.delete(obsolete);
    }
    queue = [target];
    for (let distance = 1; !useAtlas && distance <= 10; distance++) {
      queue.push(target + direction * distance);
      if (distance <= 3) queue.push(target - direction * distance);
    }
    queue = queue.filter(index => index >= 0 && index < config.frames.length &&
      !cache.has(index) && !pending.has(index) && !failed.has(index));
    pump();
  }
  function pump() {
    while (!disposed && pending.size < parallelLimit && queue.length) {
      const index = queue.shift();
      const image = new Image();
      image.decoding = 'async';
      let finished = false;
      const timeout = setTimeout(() => finish(new Error('Duo frame timed out')), 15000);
      const cancel = () => {
        finished = true;
        clearTimeout(timeout);
        image.onload = image.onerror = null;
        image.removeAttribute('src');
      };
      pending.set(index, cancel);
      function finish(error) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        image.onload = image.onerror = null;
        pending.delete(index);
        if (disposed) return;
        if (error) {
          failed.add(index);
          if (index === target && !atlas) setState('error');
        } else {
          cache.set(index, image);
          trim();
          paint(index);
        }
        pump();
      }
      image.onload = async () => {
        try {
          if (image.decode) await image.decode();
          if (!image.naturalWidth) throw new Error('Empty Duo frame');
          finish();
        } catch (error) { finish(error); }
      };
      image.onerror = () => finish(new Error('Duo frame unavailable'));
      image.src = config.frames[index].src;
    }
  }
  function loadSheet(sheet) {
    const image = new Image();
    loadingImage = image;
    image.decoding = 'async';
    function finish(decoded) {
      if (disposed || loadingImage !== image) return;
      clearTimeout(atlasTimer);
      image.onload = image.onerror = null;
      loadingImage = null;
      if (decoded) {
        atlas = image;
        layout = sheet;
        paint(target);
      } else {
        image.removeAttribute('src');
      }
      if (sheet === config.preview) loadSheet(config.overview);
      else if (!atlas) {
        useAtlas = false;
        if (target >= 0) schedule();
      }
    }
    image.onload = async () => {
      try {
        if (image.decode) await image.decode();
        finish(!!image.naturalWidth);
      } catch { finish(false); }
    };
    image.onerror = () => finish(false);
    atlasTimer = setTimeout(() => finish(false), 12000);
    image.src = sheet.src;
  }
  if (useAtlas) loadSheet(config.preview ?? config.overview);
  return {
    element: canvas,
    get index() { return painted; },
    get state() { return state; },
    seek(index) {
      if (disposed) return;
      const next = limit(Math.round(index), 0, config.frames.length - 1);
      if (target === next) return;
      const first = target < 0;
      if (!first) direction = Math.sign(next - target);
      target = next;
      trim();
      if (!paint(target)) setState(failed.has(target) ? 'error' : 'loading');
      clearTimeout(detailTimer);
      if (!useAtlas || first) schedule();
      else if (!cache.has(target)) detailTimer = setTimeout(schedule, 100);
    },
    retry() {
      if (disposed || target < 0) return;
      failed.clear();
      if (!paint(target)) setState('loading');
      schedule();
    },
    destroy() {
      disposed = true;
      clearTimeout(detailTimer);
      clearTimeout(atlasTimer);
      if (loadingImage) { loadingImage.onload = loadingImage.onerror = null; loadingImage.removeAttribute('src'); }
      loadingImage = atlas = null;
      pending.forEach(cancel => cancel());
      pending.clear();
      cache.clear();
      failed.clear();
      queue = [];
      canvas.width = canvas.height = 0;
    }
  };
}
