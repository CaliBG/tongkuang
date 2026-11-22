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
  const framesPerImage = config.perSheet ?? 1;
  // Mobile keeps frame zero in a small standalone file for a quick first paint.
  const imageKey = frame => frame === 0 ? 0 : 1 + Math.floor((frame - 1) / framesPerImage);
  const cacheLimit = framesPerImage > 1 ? 4 : 12;
  const parallelLoads = framesPerImage > 1 ? 2 : 3;
  let target = Math.round(clamp(initialProgress) * (config.count - 1));
  let direction = 1, queue = [], painted = -1, disposed = false, settled = false;
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => {resolveReady = resolve; rejectReady = reject;});

  let overviewImage, overviewDecoded = false;
  function paintOverview() {
    if (!overviewDecoded || disposed || painted === target) return;
    const {width, height, columns, step} = config.overview;
    const cell = Math.floor(target / step);
    context.drawImage(overviewImage, (cell % columns) * width, Math.floor(cell / columns) * height,
      width, height, 0, 0, canvas.width, canvas.height);
    if(!settled){settled=true;resolveReady();onError(false);}
    painted = -1;
    canvas.dataset.frame = String(cell * step);
    canvas.dataset.quality = 'preview';
  }
  function loadOverview() {
    if (!config.overview || overviewImage) return;
    overviewImage = new Image();
    overviewImage.decoding = 'async';
    overviewImage.onload = async () => {
      try {
        await overviewImage.decode();
        overviewDecoded = true;
        paintOverview();
      } catch { /* Detailed sheets also work on their own. */ }
    };
    overviewImage.src = config.overview.url;
  }
  function paint(index) {
    const image = cache.get(imageKey(index));
    if (!image || index !== target || disposed) return;
    if (framesPerImage > 1) {
      const cell = index === 0 ? 0 : (index - 1) % framesPerImage;
      const x = (cell % config.columns) * canvas.width;
      const y = Math.floor(cell / config.columns) * canvas.height;
      context.drawImage(image, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    } else {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    painted = index;
    canvas.dataset.quality = 'detail';
    canvas.dataset.frame = String(index);
    onError(false);
    if (!settled) { settled = true; resolveReady(); }
  }
  function trim() {
    // Evict decoded frames farthest from the requested position. In-flight
    // requests are also bounded, even when a user jumps across the entire page.
    const farthest = [...cache.keys()].sort((a, b) => Math.abs(b - imageKey(target)) - Math.abs(a - imageKey(target)));
    while (cache.size > cacheLimit) cache.delete(farthest.shift());
  }
  function schedule() {
    const current = imageKey(target);
    queue = [current];
    for (let distance = 1; distance <= (framesPerImage > 1 ? 1 : 4); distance++) {
      queue.push(current + direction * distance, current - direction * distance);
    }
    queue = queue.filter(index => index >= 0 && index <= imageKey(config.count - 1) &&
      !cache.has(index) && !pending.has(index) && !failed.has(index));
    pump();
  }
  function pump() {
    while (!disposed && pending.size < (framesPerImage > 1 && !settled ? 1 : parallelLoads) && queue.length) {
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
          if (index === imageKey(target)) {
            onError(true);
            if (!settled) { settled = true; rejectReady(error); }
          }
        } else {
          cache.set(index, image);
          trim();
          if (index === imageKey(target)) paint(target);
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
  loadOverview();
  schedule();
  return {
    element: canvas,
    ready,
    seek(progress) {
      if (disposed) return;
      const next = Math.round(clamp(progress) * (config.count - 1));
      if(next === target)return;
      if (next !== target) {
        direction = Math.sign(next - target);
        target = next;
        trim();
      }
      if (painted !== target) {
        if (cache.has(imageKey(target))) paint(target);
        else paintOverview();
      }
      else onError(false);
      if (failed.has(imageKey(target))) onError(true);
      schedule();
    },
    destroy() {
      disposed = true;
      if (overviewImage) {overviewImage.onload = null; overviewImage.removeAttribute('src');}
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
