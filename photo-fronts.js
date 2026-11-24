// Two current, ground-level photos. Dimensions are fitted to the existing
// footprints. u runs right in the photo; v points out towards the photographer.
import {orientedFrame,clip,panel} from './survey-mesh.js';

export const softwareId='712688905',teachingFrontId='712688928';
export const photoFrontIds=new Set([softwareId,teachingFrontId]);
const software=()=>orientedFrame(40.7,-191.7,.1,43.6);
const teaching=()=>orientedFrame(93.1,-73.9,-59,-.2);
const cream='#e1dacb',tile='#d5cbbd',edge='#dcd7ca',jamb='#b2a798',soffit='#a59b8c';
const frame='#8e9999',metal='#758281',dark='#485354',glass='#596b71',sill='#ada598';
const rect=(l,r,n,s)=>[[l,n],[r,n],[r,s],[l,s]];
const closed=p=>[...p,p[0]];
const level=7.02,storey=3.51,roof=16.82,arcade=4.48;
const steps=[
  {id:softwareId,d:software(),l:.86,r:14.38,inset:-2.00,reach:2.04,going:.45,rise:.145,count:4},
  {id:teachingFrontId,d:teaching(),l:-25.1,r:25.1,inset:-1.72,reach:4.2,going:.60,rise:.14,count:4}
];
function flight(s,i){return [i===0 ? .08 : .75+i*s.rise,.75+(i+1)*s.rise,s.inset,s.reach-i*s.going];}
export function photoStepHeights(data){
  const present=steps.filter(s=>data.building.some(r=>r[4]===s.id));
  return (x,z)=>{
    for(const s of present){
      const [u,v]=s.d.local([x,z]);if(u<s.l||u>s.r||v<s.inset||v>s.reach)continue;
      return .75+s.rise*Math.min(s.count,1+Math.floor((s.reach-v)/s.going));
    }
    return null;
  };
}
function drawSteps(d,id){
  const s=steps.find(s=>s.id===id);
  for(let i=0;i<s.count;i++)d.box(s.l,s.r,...flight(s,i),'#b9b1a3');
}

// These members occupy real space in both renderers, walking and picking.
// [left,right,bottom,top,back,front,finish]
function portalMembers(){
  const p=[[0,.86,.08,21.04,-2.42,.03,cream],[14.38,16.8,.08,level,-2.42,.03,cream],
    [5.85,10.16,level,21.34,-2.42,.07,cream],[10.16,10.83,level,21.04,-2.42,-.37,dark],
    [10.83,11.64,level,21.20,-2.42,.07,cream],
    [15.10,16.8,level,21.04,-2.42,.045,cream],[.86,14.38,level-.33,level,-2.42,.17,tile],
    [.86,14.38,.12,level-.30,-2.43,-2.05,dark]];
  for(let i=0;i<4;i++){
    const y=level+i*storey;
    p.push([.72,5.86,y,y+.24,-2.42,.20,edge],
      [10.14,15.14,y,y+.47,-2.42,.08,cream],
      [10.14,15.14,y+storey-.38,y+storey,-2.42,.08,cream]);
  }
  p.push([0,.62,21.04,22.77,-2.66,.02,cream],[.62,5.85,20.83,21.08,-2.42,.21,edge]);
  for(const u of [6.62,15.28])p.push([u,u+.46,20.96,22.78,-2.9,-2.23,jamb]);
  return p;
}
const red='#a65f50',pale='#dad8cd';
function squareMembers(){
  const p=[[-29.38,-25.25,arcade,18.25,-2.55,.21,red],[25.25,29.38,arcade,18.25,-2.45,.21,red],
    [-23.7,-16.45,roof,21.31,-4.10,-1.53,pale],[3.25,9.63,roof,21.60,-5.52,-2.86,pale],
    // A red upstand fills only the bottom of this rooftop frame.
    [9.63,18.64,roof,18.07,-3.68,-3.32,red],[9.63,10.02,18.07,20.76,-3.78,-3.26,pale],
    [14.00,14.32,18.07,20.76,-3.78,-3.26,pale],[18.27,18.64,18.07,20.76,-3.78,-3.26,pale],
    [9.63,18.64,20.76,21.20,-3.78,-3.26,pale]];
  for(const u of [-24.7,-16,-8,0,8,16,24.7])p.push([u-.21,u+.21,.08,arcade,-.31,.14,'#c2c0b4']);
  return p;
}
export function* photoFrontSolids(record){
  const [p,h,,,id]=record,isPortal=id===softwareId,d=isPortal?software():teaching();
  function* body(points,base,top,custom=false){
    if(points.length>=3)yield {record,p:closed(points),base,top,custom};
  }
  if(isPortal){
    // Set back only the southwest corner; keep the original diagonal wing and
    // the wall shared with the report hall intact. Intersect the actual jamb line.
    const src=p.slice(0,-1),corner=src.findIndex(a=>Math.hypot(...d.local(a))<.05);
    const [u,v]=d.local(src[(corner+1)%src.length]),back=-2.42;
    const notch=[d.world([16.8,0]),d.world([16.8,back]),d.world([back*u/v,back])];
    yield* body([...src.slice(0,corner),...notch,...src.slice(corner+1)],.08,h+.08);
  }else{
    const ring=p.slice(0,-1).map(d.local);
    yield* body(clip(ring,1,-1.77,true).map(d.world),.08,roof);
    yield* body(clip(ring,1,-1.77,false).map(d.world),arcade,roof);
    yield* body(clip(ring,1,-9,true).map(d.world),roof,h+.08);
  }
  for(const [l,r,b,t,n,s] of isPortal?portalMembers():squareMembers())
    yield* body(rect(l,r,n,s).map(d.world),b,t,true);
}
export function photoCustomEdge(id,e){
  if(id===softwareId)return (e.nz>.995&&e.az>-195)||(e.nx<-.995&&e.ax<42);
  return id===teachingFrontId&&Math.max(e.ax,e.ax+e.tx*e.length)<102.23;
}
// These two long faces are fully clad by the survey surfaces below. Drawing
// their plain backing again in the Canvas painter would cover the far glass
// bays at oblique angles. They remain solid for picking, shadows and walking.
export function behindCurtain(id,e){
  if(id!==teachingFrontId||e.nx>-.995)return false;
  const v=teaching().local([e.ax,e.az])[1];
  return Math.abs(v)<.025||Math.abs(v+1.77)<.025;
}
function lettering(id,d,u,y,v,text,width,height,color,horizontal=false){
  // Both vertical inscriptions belong to one stone pier. In the Canvas painter
  // sort them immediately in front of that face, irrespective of glyph centres.
  const paintAnchor=id===softwareId?d.at([(5.85+10.16)/2,(level+21.34)/2,.30]):null;
  return {id,text,point:d.at([u,y,v]),paintAnchor,yaw:Math.atan2(d.nx,d.nz),width,height,color,horizontal,spaced:true};
}
export const photoFrontSigns=[
  lettering(softwareId,software(),7.10,14.26,.135,'软件学院',1.53,10.22,'#b59b68'),
  lettering(softwareId,software(),9.22,14.49,.136,'河南省特色化示范性',.85,12.44,'#b0986e'),
  lettering(teachingFrontId,teaching(),-.90,18.25,.02,'综合教学楼',24.6,2.47,'#c1a26e',true)
];
// Slim cantilever, with a continuous outer lip. Construct the roof around
// an open lightwell above the lettering so sky is visible from the doorway.
function portalEave(d){
  const cu=8.10,cv=-.63,l=-.62,r=17.24,back=-3.58,front=1.55,th=.24;
  const angles=Array.from({length:24},(_,i)=>i*Math.PI/12);
  for(const [u,v] of rect(l,r,back,front))angles.push((Math.atan2(v-cv,u-cu)+Math.PI*2)%(Math.PI*2));
  const rings=angles.sort((a,b)=>a-b).map(a=>{
    const x=Math.cos(a),z=Math.sin(a),t=Math.min((x>=0?r-cu:l-cu)/x,(z>=0?front-cv:back-cv)/z);
    const edgeU=cu+t*x,edgeV=cv+t*z;
    return [[edgeU,edgeV+(Math.abs(edgeV-front)<.001?.23*Math.cos((edgeU-5)*Math.PI/16):0)],
      [cu+2.24*x,cv+1.59*z]];
  });
  const point=([u,v],dy)=>[u,22.96+.18*((u-7)/9)**2+dy,v];
  for(const [i,[a,b]] of rings.entries()){
    const [c,e]=rings[(i+1)%rings.length];
    d.group(point([(a[0]+c[0]+b[0]+e[0])/4,(a[1]+c[1]+b[1]+e[1])/4],0));
    d.quad([b,e,c,a].map(p=>point(p,0)),'#a8aca7');
    d.quad([a,c,e,b].map(p=>point(p,-th)),soffit);
    for(const [p,q] of [[a,c],[e,b]])d.quad([point(p,-th),point(q,-th),point(q,0),point(p,0)],edge);
  }
}
function panes(d,l,r,b,t,v,n,tone,kind='glass'){
  panel(d,l,r,b,t,v,tone,kind);
  for(let i=1;i<n;i++){const u=l+(r-l)*i/n;panel(d,u-.035,u+.035,b,t,v+.026,frame,'wall',1);}
}
function softwareFront(){
  const d=software();
  for(const args of portalMembers())d.box(...args);
  // The glass doors sit behind the letter wall. The black transom is part of
  // the doorway. The former freestanding roadside sign is absent.
  panes(d,.90,14.34,1.19,level-.34,-2.013,7,'#485a60');
  panel(d,1.12,13.77,3.94,4.52,-1.966,'#393e40');
  panel(d,.95,14.32,5.93,6.02,-1.935,frame);
  for(const l of [1.38,4.28,7.18,10.08]){
    panel(d,l,l+2.68,1.29,3.81,-1.942,'#a2aaab');
    panes(d,l+.10,l+2.58,1.32,3.66,-1.905,2,'#495c61');
  }
  drawSteps(d,softwareId);
  for(let i=0;i<4;i++){
    const y=level+i*storey;
    panes(d,.87,5.82,y+.27,y+storey-.20,-2.378,3,'#677577');
    // A single perforated panel per storey, with a solid cap and edge channel.
    panel(d,.85,5.84,y+.31,y+1.27,.09,'#87918f','baluster');
    panel(d,.85,5.84,y+1.24,y+1.31,.12,'#99a29e');
    panel(d,.85,5.84,y+.29,y+.35,.12,metal);
    panel(d,10.17,10.82,y+.47,y+storey-.38,-.34,'#5d6867','glass');
    panes(d,11.65,15.08,y+.47,y+storey-.38,-2.36,3,'#737c78');
    panel(d,11.65,15.08,y+.48,y+storey-.40,-2.31,'#767e78','screen');
    // Only a few shallow joints cross the stone sign pier.
    panel(d,5.88,10.15,y+.06,y+.081,.088,'#bfb5a4','wall',1);
  }
  portalEave(d);
  // Beyond the entrance the classroom wing has broad grouped windows with
  // low equipment screens underneath. No lattice bars become separate meshes.
  const left=16.80,right=43.60,pitch=(right-left)/6;
  for(let j=0;j<6;j++){
    const l=left+j*pitch,r=l+pitch;
    d.box(l,l+.28,.11,21.02,-.11,.43,edge);
    panes(d,l+.29,r-.05,1.12,6.62,.055,3,'#687c7d');
    panel(d,l+.29,r-.06,3.72,4.03,.12,sill);
    for(let i=0;i<4;i++){
      const y=level+storey*i;
      panes(d,l+.29,r-.04,y+1.00,y+storey-.35,.065,3,(i+j)%4?'#78847e':'#697a7a');
      panel(d,l+.30,r-.04,y+.23,y+.94,.11,'#69716c');
      panel(d,l+.30,r-.04,y+.24,y+.94,.31,'#a5a295','screen');
    }
  }
  for(let i=0;i<=4;i++){const y=level+i*storey;d.box(left,right,y-.21,y+.095,-.04,.53,edge);}
  // The short return is visible from the neighbouring report hall.
  for(let i=0;i<4;i++){
    const y=level+i*storey;
    for(const [a,b] of [[-9.9,-6.22],[-5.91,-3.16]]){
      d.group([-.03,y+1.5,(a+b)/2],[-1,0,0]);
      d.quad([[-.035,y+.52,a],[-.035,y+.52,b],[-.035,y+3.06,b],[-.035,y+3.06,a]],glass,'glass');
    }
  }
  return d.groups;
}

function teachingWest(){
  const d=teaching();
  for(const args of squareMembers())d.box(...args);
  drawSteps(d,teachingFrontId);
  const l=-25.25,r=25.25,bays=24,step=(r-l)/bays;
  // Recessed ground-floor doors are a separate plane under the colonnade.
  panes(d,l,r,1.19,arcade-.04,-1.73,24,'#53666b','curtain');
  for(const [a,b] of [[-29.38,l],[r,29.38]])panel(d,a,b,.10,arcade,-1.77,'#d5d2c6','exposed-body');
  for(const u of [-16.8,-8.4,0,8.4,16.8]){
    panel(d,u-1.72,u+1.72,1.28,3.80,-1.69,'#a9b2b0');
    panes(d,u-1.58,u+1.58,1.32,3.65,-1.65,2,'#52646b','curtain');
  }
  d.box(l,r,arcade-.17,arcade+.11,-1.81,.31,'#b8b6aa');
  // One continuous curtain, with recessed opaque spandrels and fine aluminium
  // mullions. Neutral glass receives the actual time-of-day lighting.
  const tones=['#63777b','#718084','#637679','#6c7c7d','#667a80'];
  for(let j=0;j<bays;j++){
    const a=l+j*step;
    for(let k=0;k<3;k++){
      const y=arcade+.10+k*3.68;
      panel(d,a,a+step,y,y+3.68,.065,tones[(j*7+k+(j%4===0?2:0))%tones.length],'curtain');
    }
  }
  for(let k=0;k<3;k++){
    const y=arcade+.11+k*3.68;
    panel(d,l,r,y+.04,y+.72,.09,'#849094','curtain');
    panel(d,l,r,y+.70,y+.76,.143,'#b1b5ad','wall',1);
    panel(d,l,r,y+2.69,y+2.752,.142,frame,'wall',1);
  }
  for(let j=0;j<=bays;j++){
    const u=l+j*step;panel(d,u-.048,u+.048,arcade+.09,15.69,.16,'#a7aaa1');
  }
  panel(d,l,r,15.62,roof,.165,'#767974');
  panel(d,l,r,15.67,roof-.08,.22,'#b5b2a5','louver');
  d.box(l-.10,r+.10,roof-.08,roof+.10,-.27,.33,'#bfbbae');
  // Roof letters sit on individual dark steel brackets, not on a billboard.
  for(let i=0;i<5;i++){
    const u=-.90+24.6*((i+.5)/5-.5),base=roof+.10;
    d.group([u,18,-.55]);d.bar([u,base,-.13],[u,19.03,-.13],.048,metal);
    d.bar([u,base,-1.53],[u,18.76,-.16],.044,metal);
  }
  return d.groups;
}
export function photoFrontModels(data){
  const ids=new Set(data.building.map(r=>r[4]));
  return [...(ids.has(softwareId)?softwareFront():[]),...(ids.has(teachingFrontId)?teachingWest():[])];
}
