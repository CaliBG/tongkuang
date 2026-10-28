import React, {useEffect, useRef, useState} from 'react';
import {createDuoFrameSequence} from './duo-frame-sequence';
import './duo-showcase.css';

type DuoManifest = {
  width: number; height: number; duration: number; fps: number; frameCount: number;
  frames: {src: string; time: number; sourceFrame: number}[];
};
const CLOSED_POSTER = 'assets/duo-fold/frames/frame-0024.webp';
const OPEN_POSTER = 'assets/duo-fold/frames/frame-0094.webp';
const MANIFEST = 'assets/duo-fold/manifest.json';
// This portion contains one opening motion. Reversing scroll reverses the same
// source frames, rather than playing the source video's later closing motion.
const OPENING_START = 0.8;
const OPENING_END = 94 / 30;

function validateManifest(data: DuoManifest): DuoManifest {
  if (!data || !Number.isFinite(data.width) || !Number.isFinite(data.height) ||
      !Number.isFinite(data.duration) || data.duration <= OPENING_END || !Array.isArray(data.frames) || data.frames.length < 2 ||
      data.frames.some((frame, index) => !/^assets\/duo-fold\/frames\/[\w-]+\.webp$/.test(frame.src) ||
        !Number.isFinite(frame.time) || frame.time < 0 || (index > 0 && frame.time < data.frames[index - 1].time))) {
    throw new Error('Invalid Duo sequence');
  }
  return data;
}

function nearestFrame(frames: DuoManifest['frames'], time: number) {
  let low = 0, high = frames.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (frames[middle].time < time) low = middle + 1;
    else high = middle;
  }
  return low > 0 && time - frames[low - 1].time < frames[low].time - time ? low - 1 : low;
}

export function DuoShowcase() {
  const section = useRef<HTMLElement>(null), sticky = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false), [reduced, setReduced] = useState(false);
  const [hasFrame, setHasFrame] = useState(false), [error, setError] = useState(false);


  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!section.current) return;
    if (!('IntersectionObserver' in window)) { setNear(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, {rootMargin: '300px'});
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near || reduced || !viewport.current) return;
    let cancelled = false, frameRequest = 0;
    let renderer: ReturnType<typeof createDuoFrameSequence> | null = null;
    let data: DuoManifest | null = null;
    const controller = new AbortController();
    function update() {
      frameRequest = 0;
      if (cancelled || !renderer || !data || !section.current || !sticky.current) return;
      const bounds = section.current.getBoundingClientRect();
      const travel = Math.max(1, section.current.offsetHeight - sticky.current.offsetHeight);
      const progress = Math.min(1, Math.max(0, -bounds.top / travel));
      const target = nearestFrame(data.frames, OPENING_START + progress * (OPENING_END - OPENING_START));
      renderer.seek(target);
    }
    function schedule() {
      if (frameRequest) return;
      frameRequest = requestAnimationFrame(update);
    }
    setError(false);
    fetch(MANIFEST, {signal: controller.signal})
      .then(response => { if (!response.ok) throw new Error('Duo manifest unavailable'); return response.json(); })
      .then((raw: DuoManifest) => {
        data = validateManifest(raw);
        if (cancelled || !viewport.current) return;
        renderer = createDuoFrameSequence(data, {
          onFrame: () => { if (!cancelled) setHasFrame(true); },
          onState: (next: string) => { if (!cancelled) setError(next === 'error'); }
        });
        viewport.current.replaceChildren(renderer.element);
        window.addEventListener('scroll', schedule, {passive:true});
        window.addEventListener('resize', schedule, {passive:true});
        update();
      })
      .catch(failure => { if (!cancelled && failure.name !== 'AbortError') setError(true); });
    return () => {
      cancelled = true;
      controller.abort();
      cancelAnimationFrame(frameRequest);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      renderer?.destroy();
      setHasFrame(false);
    };
  }, [near, reduced]);

  return <section id="duo" ref={section} className="duo-section" aria-labelledby="duo-title">
    <div className="duo-sticky" ref={sticky}>
      <div className="duo-layout">
        <header className="duo-copy">
          <p className="eyebrow">IPHONE DUO / 同框</p>
          <h2 id="duo-title" className="hero-heading">展开，<br/>记录更多。</h2>
          <p className="duo-description">从掌心的一面，到展开的整个视野。</p>
          <p className="duo-instruction">随着滑动，展开同框。</p>
        </header>
        <div className="duo-visual">
          <div className="duo-stage" role="img" aria-label="随页面滚动，iPhone Duo 从外屏展开为同框内屏；反向滚动则收拢">
            <picture className="duo-poster" hidden={hasFrame && !reduced}>
              <source media="(prefers-reduced-motion: reduce)" srcSet={OPEN_POSTER}/>
              <img src={CLOSED_POSTER} width="960" height="678" alt="" loading="lazy" decoding="async"/>
            </picture>
            <div className="duo-canvas" ref={viewport} hidden={!hasFrame || reduced}/>
          </div>
          <p className="duo-caption">开发版本演示 · 画面使用演示素材</p>
          {error && !reduced && <p className="duo-load-error" role="status">演示暂未载入，请刷新页面重试。</p>}
        </div>
      </div>
    </div>
  </section>;
}
