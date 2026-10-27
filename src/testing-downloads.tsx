import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Download, X} from 'lucide-react';
import {parseTestRelease} from './download-manifest.js';

type Platform = 'android' | 'harmony';
type Release = NonNullable<ReturnType<typeof parseTestRelease>>;
type DownloadState = {status:'loading'} | {status:'error'} | {
  status:'ready'; releases:Record<Platform, Release | null>;
};

const platforms = {
  android: {
    label:'02 / ANDROID', name:'Android', heading:'先来体验。',
    description:'10 月 27 日开发测试包。统一拍摄界面与 Vlog提词体验，继续完善功能和设备兼容性。',
    button:'下载安卓测试版', format:'APK · 开发签名',
    limitations:[
      '需要 Android 10 或更新版本，且系统支持安装 APK。',
      '版本为 0.1.3-alpha（4），包名 com.tongkuang.app.dev。这是开发签名测试包，非应用商店正式版。',
      '新增渐变原位切换、可取消倒计时、录屏原片开关和提词定位。双摄及后台小窗受设备与系统能力限制，尚未完成华为真机验收。',
      '仅可覆盖相同包名和签名的旧测试版。遇到签名冲突时，请先保留本地稿件与素材，不要直接卸载。'
    ]
  },
  harmony: {
    label:'03 / HARMONYOS · APK', name:'APK 兼容鸿蒙', heading:'继续同框。',
    description:'为支持 Android APK 的鸿蒙系统提供同一开发测试包。原生鸿蒙新系统的安装能力请先确认。',
    button:'下载鸿蒙兼容测试版', format:'APK · 非原生 HAP',
    limitations:[
      '只适用于支持安装 Android APK 的鸿蒙系统。不支持 APK 的系统无法安装本包；它不是原生 HarmonyOS HAP。',
      '与 Android 入口为同一 0.1.3-alpha（4）开发签名 APK，包名 com.tongkuang.app.dev，不是独立的原生鸿蒙商店版本。',
      '尚未完成华为手机的双摄、后台相机、小窗和成片验收。系统自带双景功能不代表第三方应用能使用相同组合。',
      '遇到安装或签名冲突时，请先保留本地稿件与素材，不要直接卸载旧版。'
    ]
  }
};

function fileSize(bytes:number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

function TestingNotice({platform,release,onClose}:{platform:Platform;release:Release;onClose:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [downloadStarted,setDownloadStarted] = useState(false);
  const info = platforms[platform];
  useEffect(()=>{
    const element = dialog.current;
    if(!element)return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return ()=>{
      element.close();
      document.body.style.overflow = previousOverflow;
      if(previousFocus instanceof HTMLElement)previousFocus.focus({preventScroll:true});
    };
  },[]);
  return <dialog ref={dialog} className="testing-dialog" aria-labelledby="testing-title" aria-describedby="testing-summary"
    onCancel={event=>{event.preventDefault();onClose();}}>
    <div className="testing-dialog-header">
      <span className="platform-label">{info.name} / {release.version}</span>
      <button type="button" className="testing-close" onClick={onClose} aria-label="关闭测试说明" autoFocus><X size={21}/></button>
    </div>
    <div className="testing-dialog-content">
      <p className="testing-kicker">测试说明与免责声明</p>
      <h2 id="testing-title">还在打磨，<br/>请先了解。</h2>
      <p id="testing-summary" className="testing-summary">Android 与 APK 兼容鸿蒙的当前安装包处于开发测试阶段，功能和设备兼容性仍在验证。</p>
      <div className="testing-package"><Download size={17} aria-hidden="true"/><span>{info.format}</span><span>{fileSize(release.sizeBytes)}</span></div>
      <ul className="testing-limitations">{info.limitations.map(item=><li key={item}>{item}</li>)}</ul>
      <div className="testing-disclaimer">
        <h3>使用前，请备份</h3>
        <p>测试中可能出现黑屏、卡顿、闪退、录制中断、保存失败、数据丢失、发热或耗电增加。请先备份重要数据，仅用于体验测试，不用于无法重拍的重要录制。</p>
        <p>测试版本按当前开发状态提供，暂不对功能完整性及运行效果作出保证。请根据设备条件自行决定是否使用，并保管、备份拍摄内容。本提示不影响适用法律赋予你的权利。</p>
      </div>
      <details className="testing-file-details">
        <summary>版本说明与文件校验</summary>
        <a href={release.releaseNotesUrl} target="_blank" rel="noopener noreferrer">查看完整测试说明 <ArrowUpRight size={13}/></a>
        <span>SHA-256</span><code>{release.sha256}</code>
      </details>
    </div>
    <div className="testing-dialog-actions">
      <a className="contact-button" href={release.url} target="_blank" rel="noopener noreferrer" onClick={()=>setDownloadStarted(true)}>
        了解提示，下载 APK<Download size={16} aria-hidden="true"/>
      </a>
      <button type="button" className="testing-cancel" onClick={onClose}>暂不下载</button>
      {downloadStarted&&<p role="status" className="testing-download-status">已打开下载链接。若浏览器未开始下载，可再次点击上方按钮。</p>}
    </div>
  </dialog>;
}

export function TestingDownloads() {
  const [state,setState] = useState<DownloadState>({status:'loading'});
  const [retry,setRetry] = useState(0);
  const [selected,setSelected] = useState<{platform:Platform;release:Release}|null>(null);
  useEffect(()=>{
    const controller = new AbortController();
    let disposed = false;
    const timer = setTimeout(()=>controller.abort(),8000);
    setState({status:'loading'});
    fetch('downloads.json',{signal:controller.signal,cache:'no-cache'})
      .then(response=>{if(!response.ok)throw new Error('Manifest unavailable');return response.json();})
      .then(data=>{
        if(disposed)return;
        setState({status:'ready',releases:{
          android:parseTestRelease(data?.android,'android'),
          harmony:parseTestRelease(data?.harmony,'harmony')
        }});
      })
      .catch(()=>{if(!disposed)setState({status:'error'});})
      .finally(()=>clearTimeout(timer));
    return ()=>{disposed=true;clearTimeout(timer);controller.abort();};
  },[retry]);
  return <>
    {(['android','harmony'] as const).map(platform=>{
      const info = platforms[platform];
      const release = state.status==='ready'?state.releases[platform]:null;
      return <article id={platform} key={platform} className="testing-card">
        <span className="platform-label">{info.label}</span>
        <h3>{info.heading}</h3>
        <p>{info.description}</p>
        <div className="testing-card-download">
          {release?<button type="button" className="ghost-button" aria-haspopup="dialog" onClick={()=>setSelected({platform,release})}>{info.button}<Download size={17} aria-hidden="true"/></button>
            :state.status==='loading'?<span className="testing-load" role="status">正在获取下载信息…</span>
            :<><p className="testing-load" role="status">暂时无法获取下载信息，请重试。</p><button type="button" className="ghost-button" onClick={()=>setRetry(value=>value+1)}>重新加载</button></>}
          <small>{release?`${release.version} · ${fileSize(release.sizeBytes)} · ${info.format}`:info.format}</small>
          <span className="testing-card-note">2026-10-27 开发测试包 · 下载前请阅读提示</span>
        </div>
      </article>;
    })}
    {selected&&<TestingNotice {...selected} onClose={()=>setSelected(null)}/>}
  </>;
}
