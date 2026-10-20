import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {motion, MotionConfig, MotionValue, useMotionValue, useReducedMotion, useScroll, useTransform} from 'framer-motion';
import {ArrowDown, ArrowUpRight, Camera, Check, ScreenShare, Video} from 'lucide-react';
import {createStoryRenderer} from './interactive-story.js';
import './fonts.css';
import './styles.css';

const STORE='https://apps.apple.com/app/id6791828838';
const PRIVACY='https://calibg.github.io/privacy/';
const assets=(name:string)=>`assets/${name}`;
function FadeIn({children,delay=0,duration=.7,x=0,y=30,className='',as='div'}:React.PropsWithChildren<{delay?:number;duration?:number;x?:number;y?:number;className?:string;as?:'div'|'section'}>){
  const reduced=useReducedMotion();const Component=useMemo(()=>motion.create(as),[as]);
  return <Component className={className} initial={{opacity:reduced?1:0,x:reduced?0:x,y:reduced?0:y}} whileInView={{opacity:1,x:0,y:0}} viewport={{once:true,margin:'50px',amount:0}} transition={{delay:reduced?0:delay,duration:reduced?0:duration,ease:[.25,.1,.25,1]}}>{children}</Component>;
}
function Magnet({children,padding=150,strength=3}:React.PropsWithChildren<{padding?:number;strength?:number}>){
  const ref=useRef<HTMLDivElement>(null),reduced=useReducedMotion();const [offset,setOffset]=useState({x:0,y:0,active:false});
  useEffect(()=>{if(reduced||!matchMedia('(hover: hover) and (pointer: fine)').matches)return;let frame=0;
    const move=(e:PointerEvent)=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const r=ref.current?.getBoundingClientRect();if(!r)return;const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),active=Math.abs(dx)<r.width/2+padding&&Math.abs(dy)<r.height/2+padding;setOffset({x:active?dx/strength:0,y:active?dy/strength:0,active});});};
    const reset=()=>setOffset({x:0,y:0,active:false});window.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',reset);return()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',reset);};
  },[padding,strength,reduced]);
  return <div ref={ref}><div style={{transform:`translate3d(${offset.x}px,${offset.y}px,0)`,transition:offset.active?'transform .3s ease-out':'transform .6s ease-in-out',willChange:'transform'}}>{children}</div></div>;
}
function ActionButton({children,href=STORE,ghost=false,className=''}:React.PropsWithChildren<{href?:string;ghost?:boolean;className?:string}>){return <a className={`${ghost?'ghost-button':'contact-button'} ${className}`} href={href} {...(href.startsWith('https')?{target:'_blank',rel:'noopener'}:{})}>{children}<ArrowUpRight size={18} aria-hidden="true"/></a>}
function HeroSection(){return <section className="hero-section relative flex min-h-screen flex-col" aria-labelledby="hero-title">
  <FadeIn y={-20}><nav className="hero-nav flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8" aria-label="主导航">{[['关于同框','#about'],['拍摄模式','#modes'],['动态体验','#experience'],['获取同框','#download']].map(([label,url])=><a href={url} key={url} className="text-sm font-medium uppercase tracking-wider transition-opacity duration-200 hover:opacity-70 md:text-lg lg:text-[1.4rem]">{label}</a>)}</nav></FadeIn>
  <div className="hero-title-container overflow-hidden"><FadeIn delay={.15} y={40}><h1 id="hero-title" className="hero-heading hero-title w-full whitespace-nowrap text-center font-black uppercase leading-none tracking-tight">Tongkuang</h1></FadeIn></div>
  <div className="hero-subline"><span>同框 / DUAL CAMERA</span><span>每一面，都值得被看见。</span></div>
  <div className="hero-portrait"><FadeIn delay={.6} y={30}><Magnet padding={150} strength={3}><div className="hero-phones"><img className="hero-phone-back" src={assets('record.webp')} alt="同框 App 前后双摄画中画界面" width="773" height="1600"/><img className="hero-phone-front" src={assets('dual.webp')} alt="同框 App 同时呈现街景与自拍画面" width="772" height="1600" fetchPriority="high"/></div></Magnet></FadeIn></div>
  <div className="hero-bottom flex items-end justify-between px-6 pb-8 md:px-10 md:pb-10"><FadeIn delay={.35} y={20} className="hero-intro"><p>拍下世界。<br/>也拍下你。</p><span>眼前的风景，镜头后的心情。</span></FadeIn><FadeIn delay={.5} y={20} className="hero-actions"><ActionButton>下载同框</ActionButton><a href="#android" className="android-link">Android 开发中 <ArrowUpRight size={13}/></a></FadeIn></div>
  <a className="scroll-cue" href="#experience" aria-label="向下探索同框"><ArrowDown size={17}/><span>向下探索</span></a>
</section>}
const previews=[{src:'dual.webp',label:'同步双拍',phone:true},{src:'story-intro.webp',label:'同一时刻 · 两个视角',phone:false},{src:'vlog.webp',label:'你的 Vlog，你来主讲',phone:true},{src:'record.webp',label:'一起，入镜',phone:true},{src:'story-design.webp',label:'从一个想法，到一款同框',phone:false}];
function MarqueeSection(){const ref=useRef<HTMLElement>(null),x=useMotionValue(0),reverse=useTransform(x,v=>-v),reduced=useReducedMotion();useEffect(()=>{if(reduced)return;let frame=0;const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(ref.current)x.set((innerHeight-ref.current.getBoundingClientRect().top)*.3-200);});};update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};},[reduced,x]);
  return <section className="marquee-section overflow-hidden pb-10 pt-24 sm:pt-32 md:pt-40" ref={ref} aria-label="同框产品画面">{[0,1].map(row=><motion.div key={row} className="marquee-row flex gap-3" style={{x:row?reverse:x,willChange:'transform'}} aria-hidden={row===1}>{Array.from({length:3},(_,copy)=>(row?[...previews].reverse():previews).map((item,i)=><div className={`marquee-tile ${item.phone?'phone-tile':''}`} key={`${copy}-${i}`}><img src={assets(item.src)} alt={copy===0&&row===0?item.label:''} loading="lazy" draggable="false"/><span>{item.label}</span></div>))}</motion.div>)}</section>
}
function Character({char,index,total,progress}: {char:string;index:number;total:number;progress:MotionValue<number>}){const opacity=useTransform(progress,[index/total,(index+1)/total],[.2,1]);const reduced=useReducedMotion();return <span className="reveal-character" aria-hidden="true"><span className="invisible">{char===' '?'\u00A0':char}</span><motion.span className="absolute inset-0" style={{opacity:reduced?1:opacity}}>{char===' '?'\u00A0':char}</motion.span></span>}
function AboutSection(){const ref=useRef<HTMLParagraphElement>(null);const {scrollYProgress}=useScroll({target:ref,offset:['start 0.8','end 0.2']});const text='一个镜头，看见眼前的世界。另一个镜头，留下此刻的自己。同框让两种视角同时发生，无论是旅行、日常，还是一段想分享的故事，都能把你和精彩一起记录。';return <section className="about-section relative flex min-h-screen flex-col items-center justify-center px-5 py-20 sm:px-8 md:px-10" id="about">
  <FadeIn x={-80} y={0} duration={.9} delay={.1} className="about-object about-object-left"><img src={assets('dual.webp')} alt="" width="772" height="1600" loading="lazy"/></FadeIn>
  <FadeIn x={80} y={0} duration={.9} delay={.15} className="about-object about-object-right"><img src={assets('vlog.webp')} alt="" width="772" height="1600" loading="lazy"/></FadeIn>
  <div className="about-copy relative z-10 flex flex-col items-center"><FadeIn><p className="eyebrow text-center">EVERY SIDE OF YOUR STORY</p><h2 className="hero-heading text-center font-black tracking-tight">两个视角。<br/>一个故事。</h2></FadeIn><p className="about-text" ref={ref} aria-label={text}>{[...text].map((char,index)=><Character key={index} char={char} index={index} total={text.length} progress={scrollYProgress}/>)}</p><FadeIn><ActionButton href="#experience">滚动体验同框</ActionButton></FadeIn></div>
</section>}
const modes=[
 {number:'01',name:'同步双拍',english:'DUAL CAMERA',title:<>这一刻，<br/>两面都精彩。</>,description:'前后摄像头同时记录，把眼前的风景和你的心情，放进同一个故事里。',details:['照片与视频','画中画 / 上下 / 左右布局','前后视角同步记录'],image:'dual.webp'},
 {number:'02',name:'录屏双拍',english:'SCREEN + CAMERA',title:<>屏幕里的内容，<br/>镜头里的你。</>,description:'分享屏幕，也分享你的真实反应。用前置或后置摄像头小窗，让讲解更有现场感。',details:['屏幕与相机一同记录','可另存相机原片','前置或后置拍摄'],image:null},
 {number:'03',name:'Vlog',english:'STAY IN YOUR STORY',title:<>看着镜头，<br/>把故事说完整。</>,description:'把想说的话放进提词器，调节滚动速度，保存常用脚本。少一点忘词，多一点专注。',details:['滚动提词','速度可调','保存常用脚本'],image:'vlog.webp'}
];
function ModeCard({item,index,progress}: {item:typeof modes[number];index:number;progress:MotionValue<number>}){const scale=useTransform(progress,[index/3,1],[1,1-(2-index)*.03]);const reduced=useReducedMotion();return <motion.article className="mode-card" style={{scale:reduced?1:scale,top:`calc(var(--stack-top) + ${index*22}px)`}}>
  <div className="mode-card-top"><span className="mode-number">{item.number}</span><div><span className="eyebrow">{item.english}</span><h3>{item.name}</h3></div><span className="mode-icon" aria-hidden="true">{index===0?<Camera/>:index===1?<ScreenShare/>:<Video/>}</span></div>
  <div className="mode-card-body"><div className="mode-copy"><h4>{item.title}</h4><p>{item.description}</p><ul>{item.details.map(d=><li key={d}><Check size={14}/>{d}</li>)}</ul>{index===1&&<small>需 iOS 27 或更新版本。当前版本的跨 App 相机持续拍摄仍在修复中；屏幕录制可独立继续。</small>}</div>
    <div className={`mode-visual mode-visual-${index}`}>{item.image?<img src={assets(item.image)} width="772" height="1600" alt={`${item.name}的实际 App 界面`} loading="lazy"/>:<div className="screen-demo" aria-label="屏幕与相机小窗的功能示意"><div className="demo-browser"><span></span><span></span><span></span><i>你的屏幕</i></div><div className="demo-lines"><b></b><b></b><b></b></div><div className="demo-pip"><Camera size={48}/><span>你的视角</span></div><span className="demo-label">屏幕 + 相机 · 功能示意</span></div>}</div>
  </div>
</motion.article>}
function ServicesSection(){const ref=useRef<HTMLElement>(null),{scrollYProgress}=useScroll({target:ref,offset:['start start','end end']});return <section className="services-section relative rounded-t-[40px] bg-white px-5 py-20 text-ink sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32" id="modes" ref={ref}>
  <FadeIn><div className="section-title text-center"><p className="eyebrow">THREE MODES. YOUR STORY.</p><h2 className="font-black uppercase tracking-tight">你的主场。</h2><p>三种方式，记录故事的每一面。</p></div></FadeIn><div className="mode-stack">{modes.map((item,index)=><ModeCard item={item} index={index} progress={scrollYProgress} key={item.number}/>)}</div>
</section>}
type StoryRenderer={render:(progress:number)=>void;destroy:()=>void};
function ScrollScene({scene,number,title,subtitle}:{scene:'0'|'2';number:string;title:string;subtitle:string}){
  const sectionRef=useRef<HTMLElement>(null),stageRef=useRef<HTMLDivElement>(null),viewportRef=useRef<HTMLDivElement>(null);
  const rendererRef=useRef<StoryRenderer|null>(null),progressRef=useRef(0);
  const [percent,setPercent]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  const reduced=useReducedMotion();
  useEffect(()=>{
    const section=sectionRef.current;if(!section)return;
    // Use the actual viewport geometry, including Safari's changing browser
    // bars. No media playback gesture or native ScrollTimeline is required.
    const update=()=>{
      const travel=Math.max(1,section.offsetHeight-window.innerHeight);
      const raw=-section.getBoundingClientRect().top/travel;
      const value=reduced?1:Math.min(1,Math.max(0,(raw-.04)/.92));
      progressRef.current=value;rendererRef.current?.render(value);setPercent(Math.round(value*100));
    };
    update();
    const sizes=new ResizeObserver(update);sizes.observe(section);
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    window.addEventListener('pageshow',update);
    window.visualViewport?.addEventListener('resize',update);
    return()=>{sizes.disconnect();window.removeEventListener('scroll',update);window.removeEventListener('resize',update);window.removeEventListener('pageshow',update);window.visualViewport?.removeEventListener('resize',update);};
  },[reduced]);
  useEffect(()=>{
    const section=sectionRef.current,stage=stageRef.current,viewport=viewportRef.current;if(!section||!stage||!viewport)return;
    let disposed=false,pending=false,root:HTMLDivElement|null=null,renderer:StoryRenderer|null=null;
    setReady(false);setError(false);
    const resize=()=>{if(root)root.style.transform=`scale(${stage.clientWidth/1920})`;};
    const sizes=new ResizeObserver(resize);sizes.observe(stage);
    const load=async()=>{if(pending||disposed)return;pending=true;root=document.createElement('div');root.className='story-canvas';root.style.visibility='hidden';viewport.append(root);resize();
      try{renderer=await createStoryRenderer(scene,root,progressRef.current,(failed=false)=>{if(!disposed)setError(failed);});if(disposed){renderer.destroy();root.remove();return;}rendererRef.current=renderer;renderer.render(progressRef.current);root.style.visibility='visible';setReady(true);}
      catch{if(!disposed){root?.remove();root=null;setError(true);}}};
    const visibility=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){load();visibility.disconnect();}},{rootMargin:'75% 0px'});visibility.observe(section);
    return()=>{disposed=true;sizes.disconnect();visibility.disconnect();rendererRef.current=null;renderer?.destroy();root?.remove();};
  },[scene,retry]);
  return <section ref={sectionRef} className={`scroll-scene ${reduced?'scroll-scene-reduced':''}`} data-scene={scene} aria-labelledby={`scene-title-${scene}`}>
    <div className="scroll-scene-sticky"><div className="scroll-scene-heading"><div><p className="eyebrow">{number} / {scene==='0'?'TWO CAMERAS. ONE MOMENT.':'THE MAKING OF TONGKUANG.'}</p><h2 id={`scene-title-${scene}`} className="hero-heading">{title}</h2></div><p>{subtitle}<span>{reduced?'静态展示 · 已减少动态效果':'下滑推进 · 上滑倒回'}</span></p></div>
      <div ref={stageRef} className="scroll-stage" data-progress={(percent/100).toFixed(2)} aria-busy={!ready&&!error}><img className="scroll-poster" src={assets(scene==='0'?'story-intro.webp':'story-design.webp')} width="1280" height="720" alt={scene==='0'?'前后镜头同时呈现的滑板实拍画面':'同框从手机画面展开为完整的设计全景'} hidden={ready}/><div className="scroll-viewport" ref={viewportRef} aria-hidden="true"/>{error&&<button className="scroll-retry" onClick={()=>setRetry(retry+1)}>重新载入画面</button>}</div>
      <div className="scroll-scene-bottom"><span className="scroll-direction"><ArrowDown size={15}/>{error?'已保留当前画面，点按重试继续载入':!ready?'正在载入画面…':percent>=100?'继续下滑，探索下一页':'让画面跟着滚动展开'}</span><div className="scroll-progress" role="progressbar" aria-label={`${title}动画进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{transform:`scaleX(${percent/100})`}}/></div><span className="scroll-percentage">{percent}%</span><a href={`story/#${scene}`} target="_blank" rel="noopener" aria-label={`在独立窗口查看${title}的原始演示`}>原始演示 <ArrowUpRight size={12}/></a></div>
    </div>
  </section>;
}
function ScrollShowcase(){return <div id="experience" className="scroll-showcase"><ScrollScene scene="0" number="01" title="同一刻，两面精彩。" subtitle="眼前的动作，镜头后的心情。"/><ScrollScene scene="2" number="02" title="展开同框的每一面。" subtitle="从一幅画面，走进完整的设计。"/></div>}
function DownloadSection(){const[release,setRelease]=useState<{url:string;version?:string}|null>(null);useEffect(()=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);fetch('downloads.json',{signal:controller.signal}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{const item=data.android;if(item?.status!=='ready'||typeof item.url!=='string')return;const url=new URL(item.url);if(url.protocol==='https:'&&url.pathname.toLowerCase().endsWith('.apk'))setRelease({url:url.href,version:item.version});}).catch(()=>{}).finally(()=>clearTimeout(timer));return()=>{clearTimeout(timer);controller.abort();};},[]);
  return <section id="download" className="download-section px-5 py-20 sm:px-8 md:px-10 md:py-32"><FadeIn><div className="download-title"><img src={assets('icon.png')} alt="同框图标" width="64" height="64" loading="lazy"/><p className="eyebrow">NEXT STORY STARTS WITH YOU</p><h2 className="hero-heading font-black">一起，入镜。</h2><p>把同框放进口袋，下一段故事，现在开始。</p></div></FadeIn><div className="download-grid"><article><span className="platform-label">01 / IPHONE</span><h3>即刻开始。</h3><p>同框已在 App Store 上架。<br/>需要 iOS 16.0 或更新版本。</p><ActionButton>在 App Store 下载</ActionButton></article><article id="android"><span className="platform-label">02 / ANDROID</span><h3>{release?'准备就绪。':'正在到来。'}</h3><p>{release?'下载官方 Android 安装包。':<>安卓版开发中。<br/>准备好后，就可以在这里下载。</>}</p>{release?<ActionButton href={release.url} ghost>下载 Android APK</ActionButton>:<span className="coming-soon"><span></span> ANDROID · 开发中</span>}<small>{release?`版本 ${release.version||''}`:'目前暂未提供 APK 安装包'}</small></article></div></section>}
const faq=[['我的 iPhone 可以同步双拍吗？','App 需要 iOS 16 或更新版本。前后摄像头同时拍摄还需要设备支持多摄像头功能，具体能力以 App 在设备上的检测结果为准。'],['退出 App 后，还能录屏双拍吗？','录屏双拍需要 iOS 27 或更新版本。目前已确认部分 iPhone 切换其他 App 后，相机采集会被系统中断，持续自拍正在修复中。屏幕录制可以独立继续；小窗尺寸与位置由 iOS 控制。'],['安卓和鸿蒙设备可以下载吗？','安卓与原生鸿蒙版本均在开发和测试中，官网暂未提供正式安装包。支持 Android APK 的设备将使用安卓版；不支持 APK 的原生鸿蒙系统需要专用版本。支持范围会随正式发布公布。'],['需要注册吗？Pro 怎么收费？','使用同框无需注册账号。照片与视频保存在本地，分享由你决定。Pro 提供月度、年度与永久购买选项，具体价格与功能以 App 内及 App Store 显示为准。']];
function Footer(){return <><section className="faq-section px-5 pb-20 sm:px-8 md:px-10"><h2>你可能想知道。</h2><div>{faq.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section><footer id="contact" className="footer px-5 sm:px-8 md:px-10"><div className="footer-top"><a className="footer-brand" href="#"><img src={assets('icon.png')} alt="" width="32" height="32"/>同框<span>Tongkuang</span></a><p>两个视角，一个故事。</p><a href="mailto:yzs13968803946@qq.com">联系我们 <ArrowUpRight size={15}/></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Tongkuang</span><a href={PRIVACY} target="_blank" rel="noopener">隐私政策 ↗</a><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener">使用条款 ↗</a></div></footer></>}
function App(){return <MotionConfig reducedMotion="user"><a className="skip-link" href="#main">跳到主要内容</a><main id="main" className="site-wrapper" style={{overflowX:'clip'}}><HeroSection/><ScrollShowcase/><MarqueeSection/><AboutSection/><ServicesSection/><DownloadSection/><Footer/></main></MotionConfig>}
createRoot(document.getElementById('root')!).render(<App/>);
