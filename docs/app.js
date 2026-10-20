(() => {
  // Roving focus keeps tabbed content equally usable by touch, mouse and keyboard.
  function tabs(selector, select) {
    const items = [...document.querySelectorAll(selector)];
    items.forEach((item, index) => {
      item.addEventListener('click', () => activate(item));
      item.addEventListener('keydown', event => {
        let next;
        if (['ArrowRight','ArrowDown'].includes(event.key)) next=(index+1)%items.length;
        if (['ArrowLeft','ArrowUp'].includes(event.key)) next=(index-1+items.length)%items.length;
        if (event.key==='Home') next=0;
        if (event.key==='End') next=items.length-1;
        if (next===undefined) return;
        event.preventDefault(); items[next].focus(); activate(items[next]);
      });
    });
    function activate(item) {
      items.forEach(tab => {tab.setAttribute('aria-selected',String(tab===item));tab.tabIndex=tab===item?0:-1;});
      select(item);
    }
  }
  tabs('.mode-tab', tab => {
    document.querySelectorAll('.mode-content [role=tabpanel]').forEach(panel => {panel.hidden=panel.id!==tab.getAttribute('aria-controls');});
  });
  const stage=document.querySelector('#story-stage'), panel=document.querySelector('#story-panel');
  const start=document.querySelector('#story-start'), poster=document.querySelector('#story-poster');
  const status=document.querySelector('#story-status'), replay=document.querySelector('#story-replay');
  const sound=document.querySelector('#story-sound'), direct=document.querySelector('#story-direct');
  const full=document.querySelector('#story-fullscreen');
  let scene='0', iframe=null, timeout=null, muted=true;
  function reset() {
    clearTimeout(timeout); iframe?.remove(); iframe=null;
    poster.hidden=false;start.hidden=false;replay.disabled=true;sound.disabled=true;
    muted=true;sound.textContent='声音：关';sound.setAttribute('aria-pressed','false');
  }
  tabs('.chapter-tabs [role=tab]', tab => {
    if (tab.dataset.scene===scene) return;
    reset();scene=tab.dataset.scene;
    panel.setAttribute('aria-labelledby',tab.id);
    const intro=scene==='0';
    poster.src=intro?'assets/story-intro.webp':'assets/story-design.webp';
    poster.alt=intro?'同框动态介绍：前后镜头同步记录滑板瞬间':'点击展开同框的界面、设计与制作过程';
    document.querySelector('#play-label').textContent=intro?'播放动态介绍':'展开设计全景';
    start.classList.toggle('design',!intro);
    status.textContent=intro?'点按播放，观看实拍视频与文字动画。':'点按展开，从一个画面走进完整的设计全景。';
    direct.href=`story/#${scene}`;
  });
  function play() {
    reset();start.hidden=true;status.textContent='正在加载动态内容…';
    iframe=document.createElement('iframe');
    iframe.title=scene==='0'?'同框动态介绍，原演示第 36 页':'同框设计全景，原演示第 39、40 页';
    iframe.allow='autoplay; fullscreen';iframe.allowFullscreen=true;
    iframe.src=`story/#${scene}`;stage.append(iframe);
    timeout=setTimeout(showError,45000);
  }
  function showError() {
    clearTimeout(timeout);
    status.textContent='加载未完成，可以重播，或使用下方的独立窗口观看。';
    replay.disabled=false;
  }
  start.addEventListener('click',play);replay.addEventListener('click',play);
  window.addEventListener('message',event => {
    if (!iframe || event.source!==iframe.contentWindow || event.origin!==location.origin || event.data?.source!=='tongkuang-story') return;
    if (event.data.type==='ready') {
      clearTimeout(timeout);poster.hidden=true;replay.disabled=false;sound.disabled=false;
      status.textContent=scene==='0'?'正在呈现实拍视频与文字动画 · 可随时重播':'正在展开设计全景 · 可随时重播';
    } else if(event.data.type==='error') showError();
    else if(event.data.type==='video-blocked') status.textContent='浏览器暂未播放视频，请尝试重播或独立窗口观看。';
  });
  sound.addEventListener('click',()=>{
    muted=!muted;sound.textContent=`声音：${muted?'关':'开'}`;sound.setAttribute('aria-pressed',String(!muted));
    iframe?.contentWindow.postMessage({source:'tongkuang-site',type:'mute',muted},location.origin);
  });
  full.addEventListener('click',async()=>{
    if (!panel.requestFullscreen) {window.open(direct.href,'_blank','noopener');return;}
    try {if(document.fullscreenElement) await document.exitFullscreen();else await panel.requestFullscreen();}
    catch {status.textContent='此浏览器不支持全屏，请使用下方的独立窗口观看。';}
  });
  document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'退出全屏 ⛶':'全屏 ⛶';});
  document.querySelector('#year').textContent=String(new Date().getFullYear());
  // A published APK is enabled only by a valid, explicit release entry.
  fetch('downloads.json',{signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    const release=data.android;if(release?.status!=='ready'||typeof release.url!=='string') return;
    const url=new URL(release.url);
    if(url.protocol!=='https:'||!url.pathname.toLowerCase().endsWith('.apk')) return;
    const link=document.querySelector('#android-download');link.href=url.href;link.hidden=false;
    document.querySelector('#android-pending').hidden=true;
    document.querySelector('#android-badge').textContent='现已推出';
    document.querySelector('#android-description').textContent='下载官方 Android 安装包。安装时请按设备提示操作。';
    document.querySelector('#android-detail').textContent=release.version?`版本 ${release.version}`:'官方 APK 安装包';
    document.querySelectorAll('a[href="#android"]').forEach(a=>{a.textContent='下载 Android 版 →';});
  }).catch(()=>{}); // Offline/error states preserve the honest development notice.
})();
