import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameSequence} from '../src/frame-sequence.js';

function environment(t) {
  const images = [], draws = [];
  const previousImage = globalThis.Image, previousDocument = globalThis.document;
  class DeferredImage {
    naturalWidth = 960;
    set src(value) { this.url = value; images.push(this); }
    get src() { return this.url; }
    removeAttribute() { this.url = ''; }
    async decode() {}
  }
  globalThis.Image = DeferredImage;
  globalThis.document = {
    createElement(name) {
      assert.equal(name, 'canvas');
      return {dataset: {}, setAttribute() {}, getContext: () => ({
        drawImage(image) { draws.push(Number(image.url.match(/(\d+)\.webp$/)[1])); }
      })};
    }
  };
  const config = {width: 960, height: 540, path: 'frames', count: 105};
  const live = new Set();
  t.after(() => {
    live.forEach(sequence => sequence.destroy());
    globalThis.Image = previousImage;
    globalThis.document = previousDocument;
  });
  return {
    images, draws,
    sequence(progress = 0, onError) {
      const sequence = createFrameSequence(config, progress, onError);
      live.add(sequence);
      return sequence;
    },
    async load(index) {
      const image = images.findLast(image => image.url === `frames/${String(index).padStart(3, '0')}.webp`);
      assert.ok(image?.onload, `frame ${index} must have a pending request`);
      await image.onload();
    },
    fail(index) {
      const image = images.findLast(image => image.url === `frames/${String(index).padStart(3, '0')}.webp`);
      assert.ok(image?.onerror, `frame ${index} must have a pending request`);
      image.onerror();
    }
  };
}

test('readiness waits for real pixels, including when opening midway through the page', async t => {
  const env = environment(t), sequence = env.sequence(.5);
  let ready = false;
  sequence.ready.then(() => {ready = true;});
  await Promise.resolve();
  assert.equal(ready, false);
  assert.deepEqual(env.draws, []);
  await env.load(52);
  await sequence.ready;
  assert.equal(ready, true);
  assert.deepEqual(env.draws, [52]);
});

test('out-of-order loads cannot replace the requested frame, and upward scrolling rewinds', async t => {
  const env = environment(t), sequence = env.sequence();
  await env.load(0);
  await sequence.ready;
  sequence.seek(1);
  assert.deepEqual(env.draws, [0], 'slow load must preserve the real first frame');
  await env.load(1); // frees a slot for the new target, but must not paint stale work
  await env.load(104);
  assert.deepEqual(env.draws, [0, 104]);
  await env.load(2);
  sequence.seek(0);
  await env.load(3); // frees a slot for the beginning, if it was evicted
  const zero = env.images.findLast(image => image.url === 'frames/000.webp');
  if (zero.onload) await env.load(0);
  assert.equal(env.draws.at(-1), 0);
  assert.ok(env.images.filter(image => image.onload).length <= 3);
});

test('a missing later frame reports retry state and keeps the last visible image', async t => {
  const env = environment(t), errors = [], sequence = env.sequence(0, failed => errors.push(failed));
  await env.load(0);
  await sequence.ready;
  sequence.seek(1);
  await env.load(1);
  env.fail(104);
  assert.deepEqual(env.draws, [0]);
  assert.equal(errors.at(-1), true);
  sequence.seek(0);
  assert.equal(errors.at(-1), false, 'returning to a good frame clears the retry state');
});

test('first-frame failure rejects readiness so the cover image remains visible', async t => {
  const env = environment(t), sequence = env.sequence();
  const rejected = assert.rejects(sequence.ready, /unavailable/);
  env.fail(0);
  await rejected;
  assert.deepEqual(env.draws, []);
});

test('destroy cancels pending work and releases the canvas backing store', async t => {
  const env = environment(t), sequence = env.sequence();
  await env.load(0);
  await sequence.ready;
  sequence.destroy();
  assert.equal(sequence.element.width, 0);
  assert.equal(sequence.element.height, 0);
  assert.equal(env.images.filter(image => image.onload).length, 0);
  sequence.seek(1);
  assert.deepEqual(env.draws, [0]);
});
