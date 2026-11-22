import React, {useEffect, useRef, useState} from 'react';
import {createDuoFrameSequence} from './duo-frame-sequence';
import './duo-showcase.css';

// The original opening runs from frame 24 (closed) through 94 (open) at 30 fps.
const openingFrames = Array.from({length:71}, (_, offset) => ({
  src:`assets/duo-fold/frames/frame-${String(24 + offset).padStart(4, '0')}.webp`
}));
const opening = {
  width:960, height:678, frames:openingFrames,
  preview:{src:'assets/duo-fold/opening-preview.webp', width:144, height:102, columns:6, step:2}
};
const CLOSED_POSTER = openingFrames[0].src;
const OPEN_POSTER = openingFrames[openingFrames.length - 1].src;

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
    }, {rootMargin: '125% 0px'});
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near || reduced || !viewport.current) return;
    let renderer: ReturnType<typeof createDuoFrameSequence>;
    let presented = false;
    try {
      const compact = matchMedia('(max-width: 760px)').matches;
      const overview = compact
        ? {src:'assets/duo-fold/opening-224.webp', width:224, height:158, columns:8, step:1}
        : {src:'assets/duo-fold/opening-320.webp', width:320, height:226, columns:8, step:1};
      renderer = createDuoFrameSequence({...opening, overview}, {
        onFrame: () => {
          if (!presented) { presented = true; setHasFrame(true); }
        },
        onState: (state: string) => setError(state === 'error')
      });
    } catch {
      setError(true);
      return;
    }
    setError(false);
    viewport.current.replaceChildren(renderer.element);
    function update() {
      if (!section.current || !sticky.current) return;
      const travel = Math.max(1, section.current.offsetHeight - sticky.current.offsetHeight);
      const progress = Math.min(1, Math.max(0, -section.current.getBoundingClientRect().top / travel));
      renderer.seek(Math.round(progress * (openingFrames.length - 1)));
    }
    const sizes = new ResizeObserver(update);
    sizes.observe(section.current!);
    sizes.observe(sticky.current!);
    window.addEventListener('scroll', update, {passive:true});
    window.addEventListener('pageshow', update);
    update();
    return () => {
      sizes.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('pageshow', update);
      renderer.destroy();
      setHasFrame(false);
    };
  }, [near, reduced]);

  return <section id="duo" ref={section} className="duo-section" aria-labelledby="duo-title">
    <div className="duo-sticky" ref={sticky}>
      <div className="duo-layout">
        <header className="duo-copy">

          <h2 id="duo-title" className="hero-heading">展开，<br/>记录更多。</h2>


        </header>
        <div className="duo-visual">
          <div className="duo-stage" role="img" aria-label="iPhone Duo 开合演示，向下滚动展开，向上滚动收拢">
            <picture className="duo-poster" hidden={hasFrame && !reduced}>
              <source media="(prefers-reduced-motion: reduce)" srcSet={OPEN_POSTER}/>
              <img src={CLOSED_POSTER} width="960" height="678" alt="" loading="lazy" decoding="async"/>
            </picture>
            <div className="duo-canvas" ref={viewport} hidden={!hasFrame || reduced}/>
          </div>

          {error && !reduced && <p className="duo-load-error" role="status">演示暂未载入，请刷新页面重试。</p>}
        </div>
      </div>
    </div>
  </section>;
}
