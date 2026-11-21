import {orientedFrame,clip} from './survey-mesh.js';

// The four footprint corners fix the length and the slight rotation. From
// the track, u increases to the north (right); v increases toward the track.
export const standId='712688893';
const makeFrame=()=>orientedFrame(381.9,-206.8,155.6,-.8);
export const standFrame=makeFrame();
const HALF=77.76,ROWS=24,GOING=1.035,RISE=.475,TOE=.78,DEPTH=ROWS*GOING,CREST=TOE+ROWS*RISE;
const rect=(l,r,n,s)=>[[l,n],[r,n],[r,s],[l,s]];
const closed=p=>[...p,p[0]];
// Viewed from Yishan Street, south to north. The pale lower band belongs to
// the blue centre only; the canopy does not continue over the outer sections.
const blocks=[
  [-HALF,-58.5,'#a6535d','#89454f'],[-58.5,-37.4,'#c8af8c','#ac9475'],
  [-37.4,-22.0,'#749771','#537e58'],[-22.0,28.2,'#38608a','#2d4c75'],
  [28.2,45.6,'#a4cec0','#82a99f'],[45.6,62.3,'#bb89a4','#9b698b'],[62.3,HALF,'#bd9c5c','#9f8049']
];
const stairs=[[-77.5,-76.27],[-38.40,-36.63],[44.75,46.45],[76.20,77.50]];
const cuts=[...new Set([...blocks.flatMap(b=>b.slice(0,2)),...stairs.flat()])].sort((a,b)=>a-b);
const stripes=cuts.slice(1).map((r,i)=>{
  const l=cuts[i],u=(l+r)/2,k=blocks.findIndex(b=>u>b[0]&&u<b[1]);
  return {l,r,k,stair:stairs.some(([a,b])=>u>a&&u<b)};
});
const pitchHeight=v=>TOE+Math.max(0,Math.min(DEPTH,-v))*RISE/GOING;
const paint=(hex,f)=>{
  const n=parseInt(hex.slice(1),16);
  return '#'+[16,8,0].map(k=>Math.min(255,Math.max(0,Math.round(((n>>k)&255)*f))).toString(16).padStart(2,'0')).join('');
};
const aisle=u=>stairs.some(([a,b])=>u>=a&&u<=b);
function inside(x,z){
  if(x<349.7||x>383||z< -285.1||z> -128.1)return;
  const [u,v]=standFrame.local([x,z]);
  if(Math.abs(u)<=HALF && v<=0 && v>=-30.78)return [u,v];
}
export function standHeight(x,z){
  const uv=inside(x,z);if(!uv)return;
  const [u,v]=uv;
  if(v<=-DEPTH)return CREST;
  const n=aisle(u)?2:1;
  return TOE+Math.min(ROWS*n,1+Math.floor(-v*n/GOING))*RISE/n;
}
export function canStepOnStand(ax,az,bx,bz){
  const a=standHeight(ax,az),b=standHeight(bx,bz);
  if(a===undefined&&b===undefined)return true;
  if(Math.abs((a??TOE)-(b??TOE))>=.31)return false;
  const [u,v]=standFrame.local([bx,bz]);
  if(v>=-27.94&&v<=-27.44&&(u< -22.1||u>28.3))return false;
  if(Math.abs(v+17)<.35&&piers.some(x=>Math.abs(u-x)<.31))return false;
  return !stairs.slice(1,3).some(([l,r])=>(Math.abs(u-l+.10)<.14||Math.abs(u-r-.10)<.14)&&cheeks.some(([s,t])=>v<=s&&v>=t));
}
const cheeks=[[-.85,-4.3],[-9.6,-12.8],[-20.4,-24.4]];
export function* standSolids(record){
  const f=standFrame,world=q=>closed(q.map(f.world));
  const rear=clip(record[0].slice(0,-1).map(f.local),1,-DEPTH,true);
  yield {record,p:world(rear),base:.08,top:CREST,walkSurface:true};
  // The coloured tiers themselves are drawn below. Their solids match the
  // half-steps in the aisles, so the front of the grandstand is not a 12 m box.
  for(const {l,r,stair} of stripes){
    const n=stair?2:1;
    for(let i=0;i<ROWS*n;i++)yield {record,p:world(rect(l,r,-(i+1)*GOING/n,-i*GOING/n)),
      base:.08,top:TOE+(i+1)*RISE/n,custom:true,walkSurface:true};
  }
}
function terrace(d){
  for(const {l,r,k,stair} of stripes){
    const n=stair?2:1;
    // Split long strips for correct overlap in the Canvas depth painter
    // when the visitor stands beside the front row, not just far across the pitch.
    const bays=Math.ceil((r-l)/8),dx=(r-l)/bays;
    for(let i=0;i<ROWS*n;i++){
      const front=-i*GOING/n,back=-(i+1)*GOING/n,y=TOE+(i+1)*RISE/n,low=y-RISE/n;
      const pale=k===3&&i<4,top=stair?'#b6b4a8':pale?'#a9bdc8':blocks[k][2],rise=stair?'#a29e92':pale?'#8a9fac':blocks[k][3];
      for(let j=0;j<bays;j++){
        const a=l+j*dx,b=a+dx,m=(a+b)/2;
        // Weathered paint varies gently across one tier. Its projecting lip
        // still catches light when the eye is too low to see the tread above.
        const wear=1+.034*Math.sin(i*1.54+k*.83)+.022*Math.cos(i*.73+m*.22);
        const lip=stair?.033:.065,over=stair?.018:.052;
        d.group([m,y,(front+back)/2],[0,1,0]);
        d.quad([[a,y,back],[a,y,front+over],[b,y,front+over],[b,y,back]],paint(top,wear),'terrace');
        d.group([m,(low+y)/2,front],[0,0,1]);
        d.quad([[a,low,front],[b,low,front],[b,y-lip,front],[a,y-lip,front]],paint(rise,wear*.97),'terrace');
        d.quad([[a,y-lip,front+over],[b,y-lip,front+over],[b,y,front+over],[a,y,front+over]],paint(top,wear*1.035),'terrace');
        d.quad([[a,y-lip,front],[b,y-lip,front],[b,y-lip,front+over],[a,y-lip,front+over]],paint(rise,.87),'terrace',1);
        if(!stair && b-a>3){
          d.group([a+.035,y+.006,(front+back)/2],[0,1,0]);
          d.quad([[a+.025,y+.009,back],[a+.025,y+.009,front],[a+.048,y+.009,front],[a+.048,y+.009,back]],rise,'terrace',1);
        }
      }
    }
  }
  // Continuous low concrete at the toe and pale coping on the two rising
  // side walls. None of these faces carries classroom windows.
  for(let j=0;j<20;j++){
    const a=-HALF+j*(2*HALF/20),b=-HALF+(j+1)*(2*HALF/20);
    d.group([(a+b)/2,.56,.012],[0,0,1]);d.face([a,.012],[b,.012],.22,TOE,'#bbb8aa','terrace');
  }
  for(const s of [-1,1]){
    const u=s*HALF;
    for(let i=0;i<ROWS;i++){
      const v=-i*GOING,w=v-GOING,ya=pitchHeight(v)+.54,yb=pitchHeight(w)+.54;
      d.group([u,(ya+yb)/4,(v+w)/2],[s,0,0]);
      d.quad([[u,.11,v],[u,.11,w],[u,yb,w],[u,ya,v]],'#bfbdb2','terrace');
      d.group([u-s*.14,(ya+yb)/2,(v+w)/2]);
      d.quad([[u,ya,v],[u,yb,w],[u-s*.30,yb,w],[u-s*.30,ya,v]],'#e0dcd0','terrace');
      d.quad([[u-s*.30,ya,v],[u-s*.30,yb,w],[u-s*.30,yb-.47,w],[u-s*.30,ya-.47,v]],'#cbc9bc','terrace');
    }
  }
  // Short cheek walls are visible at intervals beside the two inner flights.
  for(const [l,r] of stairs.slice(1,3)){
    for(const [v,w] of cheeks)for(const u of [l-.10,r+.10]){
      const y=pitchHeight(v)+.83,t=pitchHeight(w)+.83;
      d.group([u,(y+t)/2-.32,(v+w)/2]);
      for(const x of [u-.08,u+.08])d.quad([[x,y-.88,v],[x,t-.88,w],[x,t,w],[x,y,v]],'#dad7cb');
      d.quad([[u-.08,y,v],[u-.08,t,w],[u+.08,t,w],[u+.08,y,v]],'#e4dfd5');
      d.quad([[u-.08,y-.85,v],[u+.08,y-.85,v],[u+.08,y,v],[u-.08,y,v]],'#c5c4ba');
    }
  }
  // Along the open ends the light back wall is visible above the last row.
  for(const [l,r] of [[-HALF,-22.1],[28.3,HALF]])for(let u=l;u<r;u+=7.25)
    d.box(u,Math.min(u+7.25,r),CREST,CREST+1.44,-27.86,-27.52,'#d7d3c8');
}
const roofBack=-35.0,roofFront=-3.35,roofY=v=>18.73+Math.max(0,v+27.1)*.126;
const roofL=v=>-26.97+(v-roofBack)/(roofFront-roofBack)*3.15;
const roofR=v=>28.10+(v-roofBack)/(roofFront-roofBack)*1.37;
const roofU=(v,t)=>roofL(v)+(roofR(v)-roofL(v))*t;
const piers=Array.from({length:7},(_,i)=>roofU(-17,i/6));
function canopy(d){
  // One thin sheet over the existing west entrance and the blue field-side
  // seats. Four actual corners are used; there are no overlapping roof boxes.
  const vGrid=[roofBack,-27.1,-16.95,roofFront],steel='#888f90',truss='#b6b9b4';
  const skin=(v,t,dy=0)=>[roofU(v,t),roofY(v)+dy,v];
  for(let j=1;j<vGrid.length;j++){
    const v=vGrid[j-1],w=vGrid[j];
    for(let i=0;i<14;i++){
      const a=i/14,b=(i+1)/14,m=(v+w)/2;
      d.group(skin(m,(a+b)/2,.11),[0,1,0]);d.quad([skin(v,a,.16),skin(w,a,.16),skin(w,b,.16),skin(v,b,.16)],i%3?'#a5a8a4':'#a0a4a1');
      d.group(skin(m,(a+b)/2,-.02),[0,-1,0]);d.quad([skin(v,a),skin(v,b),skin(w,b),skin(w,a)],'#939996');
      if(j===1||j===vGrid.length-1){
        const e=j===1?v:w;d.group(skin(e,(a+b)/2));d.quad([skin(e,a),skin(e,b),skin(e,b,.16),skin(e,a,.16)],'#ced0c9');}
    }
    for(const t of [0,1]){d.group(skin((v+w)/2,t));d.quad([skin(v,t),skin(w,t),skin(w,t,.16),skin(v,t,.16)],'#b6bbb6');}
  }
  for(const [i,u] of piers.entries()){
    const t=i/(piers.length-1),v=-17.0,y=standHeight(...standFrame.world([u,v]));
    // In the photographs these slim piers meet the middle of the rake.
    d.box(u-.22,u+.22,y-.05,roofY(v)-1.31,v-.25,v+.25,'#c8c7b9');
    d.box(u-.35,u+.35,roofY(v)-1.52,roofY(v)-1.28,v-.46,v+.45,'#aeb1a9');
    const points=Array.from({length:9},(_,k)=>roofBack+(roofFront-roofBack)*k/8);
    const low=v=>roofY(v)-(.32+1.12*Math.max(0,1-Math.abs(v+17)/18));
    for(let k=1;k<points.length;k++){
      const a=points[k-1],b=points[k],m=(a+b)/2,at=(v,y)=>[roofU(v,t),y,v];
      d.group(at(m,low(m)+.56));d.bar(at(a,low(a)),at(b,low(b)),.085,steel,0);
      d.bar(at(a,roofY(a)-.07),at(m,low(m)),.057,truss,0);d.bar(at(m,low(m)),at(b,roofY(b)-.07),.057,truss,0);
    }
  }
  // The west photograph reads the deep transverse Warren truss almost straight on.
  for(const [v,depth] of [[roofBack+.16,2.57],[-26.7,1.34],[-17,.96],[roofFront-.22,.48]]){
    const lo=roofY(v)-depth;
    for(let j=0;j<18;j++){
      const a=roofU(v,j/18),b=roofU(v,(j+1)/18),m=(a+b)/2;
      d.group([m,lo+depth*.46,v]);d.bar([a,lo,v],[b,lo,v],.071,steel,0);
      d.bar([a,roofY(v)-.09,v],[m,lo,v],.060,truss,0);d.bar([m,lo,v],[b,roofY(v)-.09,v],.060,truss,0);
    }
  }
}
// Actual street and parallel service-lane edges, with landscaping restricted
// to their intervening strip. Do not plant trees on a driving lane or track.
function streetSection(data,z){
  const crossings=data.road.flatMap(([p,w,name,kind])=>p.slice(1).flatMap((b,i)=>{
    const a=p[i];if((a[1]>z)===(b[1]>z))return [];
    const x=a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);
    return x>486&&x<546?[{x,w,name,kind}]:[];
  }));
  const road=crossings.filter(r=>r.name==='夷山大街').sort((a,b)=>a.x-b.x)[0];
  const service=crossings.filter(r=>r.kind==='unclassified'&&road&&r.x<road.x).sort((a,b)=>b.x-a.x)[0];
  if(!road||!service)return null;
  const l=service.x+service.w/2,r=road.x-road.w/2;
  return r>l?{l,r,centre:(l+r)/2,fence:service.x-service.w/2-1.45}:null;
}
function fencePosition(data){
  const a=streetSection(data,-293),b=streetSection(data,-116);
  if(!a||!b)return;
  const dx=b.fence-a.fence,dz=177,len=Math.hypot(dx,dz);
  return {d:orientedFrame(a.fence,-293,-dz/len,dx/len),len};
}
export function stadiumFence(data){
  const f=fencePosition(data);return f?rect(0,f.len,-.17,.17).map(f.d.world):null;
}
function roadsideFence(data,groups){
  const f=fencePosition(data);if(!f)return;
  const {d,len}=f,count=Math.ceil(len/3.24);
  for(let i=0;i<count;i++){
    const u=i*len/count,v=(i+1)*len/count;
    d.group([(u+v)/2,1.82,0]);d.bar([u,.65,0],[u,2.70,0],.045,'#405d52',0);
    for(const y of [.88,1.46,2.58])d.bar([u,y,0],[v,y,0],.021,'#547165',0);
    for(let j=1;j<15;j++){
      const x=u+(v-u)*j/15;d.quad([[x-.008,.88,0],[x+.008,.88,0],[x+.008,2.58,0],[x-.008,2.58,0]],'#537364','wall',1);
    }
  }
  groups.push(...d.groups);
}
export function stadiumFieldModel(data){
  const d=makeFrame();terrace(d);canopy(d);roadsideFence(data,d.groups);return d.groups;
}
export function stadiumGround(data,{surfaces,forecourts,trees,shrubs}){
  const apron=rect(-HALF,HALF,.04,3.88).map(standFrame.world);
  surfaces.push([apron,.735,'#b4ada0','stadium']);forecourts.push(apron);
  const zs=[-292,-261,-240.2,-209,-177,-146.1,-120],lanes=zs.map(z=>streetSection(data,z));
  if(lanes.some(a=>!a))return;
  const strip=lanes.map(({l},i)=>[l,zs[i]]).concat(lanes.map(({r},i)=>[r,zs[i]]).reverse());
  surfaces.push([strip,.805,'#758657','stadium']);forecourts.push(strip);
  for(let z=-286,i=0;z<-121;z+=2.14,i++){
    const a=streetSection(data,z),rx=Math.min(.61,(a.r-a.l)*.40),x=a.centre;
    shrubs.push([x,z,rx,.38,1.82,.47,'#6a7e4a',.75]);
    if(i%4===0)shrubs.push([x,z+.14,rx*1.13,.98,1.14,.53,'#536d3e',.78]);
  }
  for(const [i,z] of [-282,-266.2,-251.1,-238.5,-231.0,-216.2,-203.5,-187.8,-180.5,-174.15,-159.2,-145.7,-131.5].entries()){
    const {centre}=streetSection(data,z);
    // June foliage here is in leaf; the sparse April avenue profile would
    // leave bare branches across the field-facing camera.
    trees.push([centre,z,6.08+(1+Math.sin(i*2.15))*.48,i%3?'vase':'shade',false,(i*.29)%1,i*1.32,.83,.88,'high-summer']);
  }
}
