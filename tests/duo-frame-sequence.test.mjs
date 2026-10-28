import test from 'node:test';
import assert from 'node:assert/strict';
import {createDuoFrameSequence} from '../src/duo-frame-sequence.js';

function environment(t) {
  const images = [], operations = [], states = [], presented = [];
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
      return {dataset:{}, setAttribute(){}, getContext(kind, options) {
        assert.equal(kind, '2d');
        assert.equal(options.alpha, true, 'transparent phones need a transparent canvas');
        return {
          clearRect(...args) { operations.push(['clear', ...args]); },
          drawImage(image) { operations.push(['draw', Number(image.url.match(/(\d+)\.webp$/)[1])]); }
        };
      }};
    }
  };
  const config = {width:960, height:678, frames:Array.from({length:226}, (_,i) => ({src:`frames/frame-${String(i).padStart(4,'0')}.webp`,time:i/30}))};
  const sequence = createDuoFrameSequence(config, {onFrame:index => presented.push(index), onState:state => states.push(state)});
  t.after(() => { sequence.destroy(); globalThis.Image = previousImage; globalThis.document = previousDocument; });
  function imageAt(index) { return images.findLast(image => image.url === config.frames[index].src); }
  return {
    images, operations, states, presented, sequence, imageAt,
    async load(index) { const image=imageAt(index); assert.ok(image?.onload, `frame ${index} pending`); await image.onload(); },
    fail(index) { const image=imageAt(index); assert.ok(image?.onerror, `frame ${index} pending`); image.onerror(); }
  };
}

test('alpha canvas is not cleared until a decoded target frame is ready', async t => {
  const e=environment(t);
  e.sequence.seek(0);
  assert.deepEqual(e.operations, []);
  assert.equal(e.sequence.state, 'loading');
  await e.load(0);
  assert.deepEqual(e.operations, [['clear',0,0,960,678],['draw',0]]);
  e.sequence.seek(1);
  assert.equal(e.sequence.index,0);
  assert.equal(e.sequence.state,'loading');
  assert.equal(e.operations.length,2, 'old picture remains during loading');
  await e.load(1);
  assert.deepEqual(e.operations.slice(-2), [['clear',0,0,960,678],['draw',1]]);
  assert.equal(e.sequence.index,1);
});

test('rapid forward and backward seeking never paints stale responses', async t => {
  const e=environment(t);
  e.sequence.seek(0); await e.load(0);
  e.sequence.seek(225);
  assert.ok(e.imageAt(225)?.onload, 'seek takes priority over prefetch requests');
  const oldResponse = e.imageAt(225).onload;
  e.sequence.seek(100);
  await oldResponse();
  const stale = e.images.find(image => image.onload && !image.url.endsWith('0100.webp'));
  if (stale) await stale.onload();
  assert.deepEqual(e.presented,[0]);
  await e.load(100);
  assert.deepEqual(e.presented,[0,100]);
  e.sequence.seek(0);
  if (e.imageAt(0)?.onload) await e.load(0);
  else if(e.sequence.index!==0) {
    const pending=e.images.find(image=>image.onload);
    await pending.onload();
    await e.load(0);
  }
  assert.equal(e.presented.at(-1),0);
  assert.ok(e.images.filter(image=>image.onload).length<=4);
});

test('missing frames preserve the current phone and can be retried without resetting playback position', async t => {
  const e=environment(t);
  e.sequence.seek(0); await e.load(0);
  e.sequence.seek(225); e.fail(225);
  assert.equal(e.sequence.state,'error');
  assert.deepEqual(e.presented,[0]);
  e.sequence.retry();
  assert.equal(e.sequence.state,'loading');
  if(!e.imageAt(225)?.onload) await e.images.find(image=>image.onload).onload();
  await e.load(225);
  assert.deepEqual(e.presented,[0,225]);
  assert.equal(e.sequence.state,'ready');
});

test('presentation remains tied to loaded frames and disposal prevents later redraws', async t => {
  const e=environment(t);
  e.sequence.seek(150);
  assert.equal(e.sequence.index,-1);
  await e.load(150);
  const prior=e.operations.length;
  e.sequence.seek(225);
  const late=e.images.find(image=>image.onload)?.onload;
  e.sequence.destroy();
  assert.equal(e.sequence.element.width,0);
  assert.equal(e.sequence.element.height,0);
  assert.ok(e.images.every(image=>!image.onload));
  if(late) await late();
  e.sequence.seek(0);
  assert.equal(e.operations.length,prior);
});
