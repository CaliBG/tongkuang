(() => {
  const send = (type) => parent.postMessage({source:'tongkuang-story',type}, location.origin);
  let ready = false;
  const prepare = () => document.querySelectorAll('video').forEach(v => {
    if (v.dataset.prepared) return;
    v.dataset.prepared = 'true';
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', '');
    v.play().catch(() => send('video-blocked'));
  });
  new MutationObserver(prepare).observe(document.documentElement,{childList:true,subtree:true});
  const init = setInterval(() => {
    const p = window.tongkuangPlayer;
    if (!p?.script || !['IdleAtInitialState','IdleAtFinalState'].includes(p.state)) return;
    clearInterval(init); ready = true;
    const advance = p.advanceToNextBuild.bind(p);
    // Omit only outgoing transitions to unselected original pages 37 and 41.
    p.advanceToNextBuild = reason => {
      const scene = p.state === 'IdleAtFinalState' ? p.nextSceneIndex : p.currentSceneIndex;
      return [0,2,3].includes(scene) ? advance(reason) : false;
    };
    p.delegate.showExited = () => send('ended');
    send('ready');
    setTimeout(() => p.advanceToNextBuild('website'), 500);
  }, 100);
  setTimeout(() => {clearInterval(init); if (!ready) send('error');}, 30000);
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.source !== 'tongkuang-site') return;
    if (event.data.type === 'mute') document.querySelectorAll('video').forEach(v => {v.muted=event.data.muted;});
  });
})();
