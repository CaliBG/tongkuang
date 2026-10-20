import { setupStory } from './interactive-story.js';
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
  setupStory(tabs);
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
