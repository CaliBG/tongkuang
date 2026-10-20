import {createFrameSequence} from './frame-sequence.js';
import frameData from './story-frames.json';

const clamp = (v, min=0, max=1) => Math.min(max, Math.max(min, v));
const mix = (a,b,t) => a+(b-a)*t;
// Keynote's EaseInEaseOut timing, evaluated deterministically in either direction.
function ease(t) {
  const cubic=(u,a,b)=>3*(1-u)**2*u*a+3*(1-u)*u*u*b+u*u*u;
  let lo=0, hi=1;
  for(let i=0;i<13;i++){const m=(lo+hi)/2;if(cubic(m,.42,.58)<t)lo=m;else hi=m;}
  return cubic((lo+hi)/2,0,1);
}
const segment=(p,a,b)=>ease(clamp((p-a)/(b-a)));
function flatten(animations,offset=0) {
  return animations.flatMap(a=>a.animations?flatten(a.animations,offset+(a.beginTime||0)):[{...a,beginTime:offset+(a.beginTime||0)}]);
}
let designData;
async function buildDesign(root, initialProgress, onError) {
  designData ||= fetch('assets/interactive/design.json').then(r=>{if(!r.ok)throw Error('Design unavailable');return r.json();}).catch(e=>{designData=null;throw e;});
  const data=await designData, renders=[], pictures=[];
  const clip=createFrameSequence(frameData.design,clamp((initialProgress-.66)/.34),onError);clip.element.className='design-clip';
  function layer(node,parent) {
    const el=document.createElement('div'),s=node.initialState,ax=s.anchorPoint?.pointX??.5,ay=s.anchorPoint?.pointY??.5;
    el.className='keynote-layer';
    Object.assign(el.style,{width:s.width+'px',height:s.height+'px',left:(s.position.pointX-ax*s.width)+'px',top:(s.position.pointY-ay*s.height)+'px',transformOrigin:`${ax*100}% ${ay*100}%`});
    parent.append(el);
    const animations=flatten(node.animations||[]);let original=null,alternate=null;
    function texture(key){const image=new Image();image.src=data.textures[key];image.alt='';image.draggable=false;el.append(image);pictures.push(image);return image;}
    if(node.texture)original=texture(node.texture);
    if(node.texture==='64A126209E31AFB38EE60420639EA04F')el.append(clip.element);
    const content=animations.find(a=>a.property==='contents');
    if(content&&content.to.texture!==node.texture)alternate=texture(content.to.texture);
    renders.push(time=>{
      let opacity=s.opacity??1,hidden=s.hidden,tx=0,ty=0,sx=1,sy=1,z=0;
      for(const a of animations){
        if(time<a.beginTime&&a.fillMode==='forwards')continue;
        let f=clamp((time-a.beginTime)/Math.max(.0001,a.duration));
        if(a.timingFunction==='EaseInEaseOut')f=ease(f);
        const scalar=()=>mix(a.from.scalar,a.to.scalar,f);
        switch(a.property){
          case 'opacity':opacity=scalar();break;
          case 'hidden':hidden=f<1?a.from.scalar:a.to.scalar;break;
          case 'zPosition':z=scalar();break;
          case 'transform.translation':tx=mix(a.from.pointX,a.to.pointX,f);ty=mix(a.from.pointY,a.to.pointY,f);break;
          case 'transform.scale.x':sx=scalar();break;
          case 'transform.scale.y':sy=scalar();break;
          case 'contents':if(alternate){original.style.opacity=String(1-f);alternate.style.opacity=String(f);}break;
        }
      }
      el.style.opacity=String(hidden?0:opacity);el.style.transform=`translate(${tx}px,${ty}px) scale(${sx},${sy})`;el.style.zIndex=String(Math.round(z*10000));
    });
    (node.layers||[]).forEach(child=>layer(child,el));
  }
  layer(data.root,root);
  try {await Promise.all([...pictures.map(img=>img.decode()),clip.ready]);} catch(error) {clip.destroy();throw error;}
  return {render(p){renders.forEach(render=>render(p*data.duration));clip.seek(clamp((p-.66)/.34));},destroy:clip.destroy};
}
async function buildIntro(root, initialProgress, onError) {
  const clip=createFrameSequence(frameData.intro,initialProgress,onError);clip.element.className='intro-clip';root.append(clip.element);
  const words=['Dual camera','Picture-in-picture','Teleprompter','Music sync'].map(text=>{const el=document.createElement('div');el.className='intro-word';el.textContent=text;root.append(el);return el;});
  try {await clip.ready;} catch(error) {clip.destroy();throw error;}
  return {render(p){
    clip.seek(p);
    const y=[mix(790,620,segment(p,0,.17))-160*segment(p,.18,.35)-160*segment(p,.35,.52),mix(800,620,segment(p,.18,.35))-160*segment(p,.35,.52),mix(820,620,segment(p,.35,.52)),mix(980,780,segment(p,.49,.66))];
    words.forEach((el,i)=>{const start=[0,.18,.35,.49][i],end=[.74,.77,.82,.88][i];const fadeIn=segment(p,start,start+.13),fadeOut=segment(p,end,end+.12);el.style.opacity=String(fadeIn*(1-fadeOut));el.style.transform=`translate(-50%,-50%) translateY(${y[i]-fadeOut*110}px)`;});
  },destroy:clip.destroy};
}
export async function createStoryRenderer(scene, root, initialProgress=0, onError=(_failed=false)=>{}) {
  return scene === '0' ? buildIntro(root,initialProgress,onError) : buildDesign(root,initialProgress,onError);
}
