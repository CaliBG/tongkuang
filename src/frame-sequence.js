const clamp = value => Math.min(1, Math.max(0, value));

// Scroll seeking must not depend on video autoplay or an activated media decoder.
// Keep the last painted real frame until the requested image has fully decoded.
export function createFrameSequence(config, initialProgress = 0, onError = (_failed = false) => {}) {
  const canvas = document.createElement('canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', {alpha: false});
  if (!context) throw new Error('Image sequence canvas unavailable');

  const cache = new Map(), pending = new Set(), failed = new Set();
  const loaders = new Map();
  const cacheLimit = 12, parallelLoads = 3;
  let target = Math.round(clamp(initialProgress) * (config.count - 1));
  let direction = 1, queue = [], painted = -1, disposed = false, settled = false;
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => {resolveReady = resolve; rejectReady = reject;});

  function paint(index) {
    const image = cache.get(index);
    if (!image || index !== target || disposed) return;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    painted = index;
    canvas.dataset.frame = String(index);
    onError(false);
    if (!settled) { settled = true; resolveReady(); }
  }
  function trim() {
    // Evict decoded frames farthest from the requested position. In-flight
    // requests are also bounded, even when a user jumps across the entire page.
    const farthest = [...cache.keys()].sort((a, b) => Math.abs(b - target) - Math.abs(a - target));
    while (cache.size > cacheLimit) cache.delete(farthest.shift());
  }
  function schedule() {
    queue = [target];
    for (let distance = 1; distance <= 4; distance++) {
      queue.push(target + direction * distance, target - direction * distance);
    }
    queue = queue.filter(index => index >= 0 && index < config.count &&
      !cache.has(index) && !pending.has(index) && !failed.has(index));
    pump();
  }
  function pump() {
    while (!disposed && pending.size < parallelLoads && queue.length) {
      const index = queue.shift();
      pending.add(index);
      const image = new Image();
      image.decoding = 'async';
      let finished = false;
      const timeout = setTimeout(() => finish(new Error('Frame load timed out')), 12000);
      function finish(error) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        image.onload = image.onerror = null;
        pending.delete(index);
        loaders.delete(index);
        if (disposed) return;
        if (error) {
          failed.add(index);
          if (index === target) {
            onError(true);
            if (!settled) { settled = true; rejectReady(error); }
          }
        } else {
          cache.set(index, image);
          trim();
          paint(index);
        }
        pump();
      }
      loaders.set(index, () => {
        finished = true;
        clearTimeout(timeout);
        image.onload = image.onerror = null;
        image.removeAttribute('src');
      });
      image.onload = async () => {
        try {
          if (image.decode) await image.decode();
          if (!image.naturalWidth) throw new Error('Empty frame');
          finish();
        } catch (error) { finish(error); }
      };
      image.onerror = () => finish(new Error(`Frame ${index} unavailable`));
      image.src = `${config.path}/${String(index).padStart(3, '0')}.webp`;
    }
  }
  schedule();
  return {
    element: canvas,
    ready,
    seek(progress) {
      if (disposed) return;
      const next = Math.round(clamp(progress) * (config.count - 1));
      if (next !== target) {
        direction = Math.sign(next - target);
        target = next;
        trim();
      }
      if (painted !== target) paint(target);
      else onError(false);
      if (failed.has(target)) onError(true);
      schedule();
    },
    destroy() {
      disposed = true;
      loaders.forEach(cancel => cancel());
      loaders.clear();
      cache.clear();
      pending.clear();
      queue = [];
      // Release the backing store when leaving/retrying the scene.
      canvas.width = canvas.height = 0;
    }
  };
}
