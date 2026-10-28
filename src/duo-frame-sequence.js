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

  function setState(next) {
    if (state === next || disposed) return;
    state = next;
    onState(next);
  }
  function paint(index) {
    if (disposed || index !== target || !cache.has(index)) return false;
    if (index !== painted) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(cache.get(index), 0, 0, canvas.width, canvas.height);
      painted = index;
      canvas.dataset.frame = String(index);
      onFrame(index);
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
    for (let distance = 1; distance <= 10; distance++) {
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
          if (index === target) setState('error');
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
  return {
    element: canvas,
    get index() { return painted; },
    get state() { return state; },
    seek(index) {
      if (disposed) return;
      const next = limit(Math.round(index), 0, config.frames.length - 1);
      if (target >= 0 && next !== target) direction = Math.sign(next - target);
      target = next;
      trim();
      if (!paint(target)) setState(failed.has(target) ? 'error' : 'loading');
      schedule();
    },
    retry() {
      if (disposed || target < 0) return;
      failed.clear();
      if (!paint(target)) setState('loading');
      schedule();
    },
    destroy() {
      disposed = true;
      pending.forEach(cancel => cancel());
      pending.clear();
      cache.clear();
      failed.clear();
      queue = [];
      canvas.width = canvas.height = 0;
    }
  };
}
