import {surfaceBuilder,streetEdges,clip,panel,panelWindow} from './survey-mesh.js';

// The east spine is one mapped footprint (building 4). The two courts open
// into the separately named wings 2/3 and 5/6. u points from each stair
// tower towards its white wing, v east towards the photograph.
const north={x:183.7,z:-111.6,dir:-1,t:[-6.90,6.2],near:13.4,far:34.3,clear:7.35,roof:23.20,back:-19.4,bridge:-11.7,bays:[.0,.24,.50,.74,1],cut:[-146,-104.5]};
const south={x:183.05,z:-43.9,dir:1,t:[-4.3,4.5],near:15.45,far:42.7,clear:7.92,roof:22.86,back:-19.1,bridge:-10.7,bays:[0,.19,.42,.64,.82,1],cut:[-48.2,-1.2]};
const sites=[north,south],white='#d6d3ca',slab='#c1bfb7',red='#a05b4d',rail='#454d4d';
const world=(s,u,v)=>[s.x+v,s.z+s.dir*u];
const draw=s=>surfaceBuilder(([u,y,v])=>[s.x+v,y,s.z+s.dir*u],([u,y,v])=>[v,y,s.dir*u]);
const rect=(s,l,r,n,f)=>[[l,n],[r,n],[r,f],[l,f]].map(([u,v])=>world(s,u,v));
const piers=s=>[s.near+.55,(s.near+s.far)/2+.35,s.far-.90];
const galleryLevels=[.80,5.05,9.29,13.53,17.77];

export function* teachingCourtSolids(record){
  const ring=record[0].slice(0,-1),keep=(q)=>[...q,q[0]];
  for(const [lo,hi] of [[-200,north.cut[0]],[north.cut[1],south.cut[0]],[south.cut[1],20]]){
    const q=clip(clip(ring,1,lo,false),1,hi,true);if(q.length>2)yield {record,p:keep(q),base:.08,top:record[1]+.08};
  }
  for(const s of sites){
    const solid=(l,r,n,f,base,top)=>({record,p:keep(rect(s,l,r,n,f)),base,top,custom:true});
    yield solid(...s.t,s===north?-6.62:-.32,.12,.08,s===north?6.86:6.32);
    yield solid(s.near,s.far,s.back,.50,s.clear,s.roof);
    yield solid(s.t[1]-.03,s.far,s.bridge-2.75,s.bridge,4.76,9.25);
    for(const u of piers(s))for(const v of [-.74,-6.8,s.back+.55])yield solid(u-.34,u+.34,v-.36,v+.36,.08,s.clear);
    for(const u of [s.t[1]+.23,s.near+2.65,s.far-1.20])yield solid(u-.28,u+.28,s.bridge-.66,s.bridge-.09,.08,4.76);
    for(const y of galleryLevels.slice(1))yield solid(s.t[0],s.t[1],s.back,-6.70,y-.25,y);
    for(const u of [s.t[0]+.30,s.t[1]-.31])for(const v of [-6.99,s.back+.38])yield solid(u-.24,u+.24,v-.28,v+.28,.08,s.roof);
  }
}
export const isTeachingCourtEdge=(a,z,b,t)=>Math.min(a,b)>162.65&&(
  (Math.max(z,t)>-146.31&&Math.min(z,t)<-88)||(Math.max(z,t)>-48.31&&Math.min(z,t)<-1.1));

function guard(d,a,b,y,v){
  if(b-a<.35)return;
  d.group([(a+b)/2,y+.6,v]);
  for(const dy of [.28,.64,1.00])d.bar([a,y+dy,v],[b,y+dy,v],dy===1?.031:.018,rail);
  for(let i=0,n=Math.max(1,Math.ceil((b-a)/1.42));i<=n;i++){
    const u=a+(b-a)*i/n;d.bar([u,y+.07,v],[u,y+1.02,v],.026,rail);
  }
}
function sideGuard(d,u,v,w,y){
  d.group([u,y+.55,(v+w)/2]);
  for(const h of [.31,.66,1.01])d.bar([u,y+h,v],[u,y+h,w],.025,rail);
  for(let n=0,b=Math.ceil((w-v)/1.45);n<=b;n++){const z=v+(w-v)*n/b;d.bar([u,y+.07,z],[u,y+1.02,z],.025,rail);}
}
function stairUnderside(d,a,b,low,high,v,half){
  d.group([(a+b)/2,(low+high)/2-.20,v]);
  d.quad([[a,low-.29,v-half],[b,high-.29,v-half],[b,high-.29,v+half],[a,low-.29,v+half]],'#b7b7ad');
  for(const z of [v-half,v+half])
    d.quad([[a,low-.29,z],[b,high-.29,z],[b,high+.12,z],[a,low+.12,z]],white);
}
// The southern tower is narrower. Its large opening is toward the court;
// at the opposite edge, small square holes continue down past the opening.
function southTower(d,s){
  const [l,r]=s.t,lo=6.32,top=s.roof+.37;
  d.box(l,r,.10,lo,-.32,.12,red,'brick');
  const openings=[[-1.94,2.76,7.57,17.3]];
  for(let y=6.90;y<top-.55;y+=1.18)for(let u=l+.67;u<r-.65;u+=1.13){
    if(y<17.35&&y+.46>7.51&&u<2.83&&u+.43>-2.01)continue;
    openings.push([u,u+.43,y,y+.46]);
  }
  const ys=[...new Set([lo,top,...openings.flatMap(o=>o.slice(2))])].sort((a,b)=>a-b);
  for(let i=1;i<ys.length;i++){
    const a=ys[i-1],b=ys[i],mid=(a+b)/2;
    const slots=openings.filter(o=>mid>o[2]&&mid<o[3]).sort((a,b)=>a[0]-b[0]);let start=l;
    for(const [u,v] of [...slots,[r,r]]){if(u>start+.005)d.box(start,u,a,b,-.32,.12,red,'brick');start=Math.max(start,v);}
  }
  for(let k=0;k<4;k++){
    const low=5.05+k*4.24,high=low+4.24,left=-2.77,right=3.30,from=k%2?right:left,to=k%2?left:right,v=k%2?-3.95:-1.75;
    stairUnderside(d,from,to,low,high,v,.77);
    for(let i=0;i<22;i++){
      const a=from+(to-from)*i/22,b=from+(to-from)*(i+1)/22,y=low+(high-low)*(i+1)/22;
      d.box(Math.min(a,b),Math.max(a,b),y-.20,y,v-.77,v+.77,white,'wall',1);
    }
    d.box(to-.38,to+.38,high-.24,high,-5.05,-.92,slab);
    d.group([(from+to)/2,(low+high)/2,v]);
    for(const h of [.49,.98])d.bar([from,low+h,v+.73],[to,high+h,v+.73],.035,rail);
    for(let i=0;i<=7;i++){const u=from+(to-from)*i/7,y=low+(high-low)*i/7;d.bar([u,y,v+.73],[u,y+.99,v+.73],.028,rail);}
  }
}
function court(s){
  const d=draw(s),[l,r]=s.t,{near,far,back,clear,roof,bays,bridge}=s;
  if(s===south)southTower(d,s);
  else for(let k=0;k<4;k++)stairUnderside(d,k%2?3.96:-2.27,k%2?-2.27:3.96,6.90+k*3.08,9.98+k*3.08,k%2?-3.38:-1.76,.75);
  // White classroom block, on two rows of square columns and visible beams.
  d.box(near,far,clear,roof,back,.49,white);
  for(const u of piers(s)){
    for(const v of [-.74,-6.8,back+.55])d.box(u-.34,u+.34,.10,clear,v-.36,v+.36,white);
    d.box(u-.23,u+.23,clear-.39,clear,back,.80,slab);
  }
  for(const v of [-.65,-6.8,-12.7,back+.45])d.box(near,far,clear-.30,clear,v-.18,v+.18,'#c6c3b9');
  d.box(near-.23,far+.23,clear,clear+.48,-.25,1.05,white);
  for(let i=0;i<bays.length-1;i++){
    const a=near+(far-near)*bays[i]+.20,b=near+(far-near)*bays[i+1]-.20;
    for(let k=0;k<3;k++){const y=clear+1+k*4.15;panelWindow(d,a,b,y,y+2.84,.53,Math.max(2,Math.round((b-a)/1.85)));}
    for(let k=0;k<8;k++){
      const y=clear+1.0+k*1.65;d.box(a-.02,b+.02,y-.12,y+.10,.50,1.42,'#dfd9c9');
    }
    d.box(a-.19,a+.04,clear+.42,roof,.51,1.14,white);
  }
  // The red enclosed bridge is a storey above the pavement. Its window strip
  // stops at brick infill rather than running across every bay.
  d.box(r-.03,far,4.76,9.25,bridge-2.75,bridge,red,'brick');
  for(const [i,u] of [r+.23,near+2.65,far-1.2].entries()){
    d.box(u-.28,u+.28,.10,4.76,bridge-.66,bridge-.09,white);
    if(i===2)continue;
    const end=i===0?near+2.65:far-1.2;
    for(let j=0;j<3;j++){
      const a=u+(end-u)*j/3+.23,b=u+(end-u)*(j+1)/3-.23;
      if(b>a+.6)panelWindow(d,a,b,5.88,7.77,bridge+.06,i===0?2:3);
    }
  }
  // Above the red window strip the connecting passage has open rectangular
  // bays. Its much narrower slab is visible against the sky in both photos.
  const upper=s===south?14.04:14.66,inner=bridge-2.16;
  d.box(r-.12,near+.42,upper-.40,upper,inner-2.18,inner+.24,white);
  for(const u of [r+.16,(r+near)*.5,near-.13])d.box(u-.18,u+.18,9.25,upper-.35,inner-.25,inner+.17,white);
  guard(d,r+.09,near+.34,upper,inner+.20);
  // Open gallery beside the stairs, with rails on the side seen from the
  // street; daylight remains visible below the bridge and through the roof.
  for(const u of [l+.30,r-.31])for(const v of [-6.99,back+.38])d.box(u-.24,u+.24,.10,roof,v-.28,v+.28,white);
  for(const y of galleryLevels.slice(1)){
    d.box(l,r,y-.25,y,back,-6.70,slab);
    guard(d,l,r,y,-6.67);sideGuard(d,r+.03,back,-6.67,y);
    if(s===south){d.box(l,l+1.14,y-.23,y,-6.70,-.40,slab);d.box(r-1.12,r,y-.23,y,-6.70,-.40,slab);sideGuard(d,r+.035,-6.70,-.47,y);}
  }
  d.box(l,r,roof-.32,roof,back,.20,white);
  for(const v of [-.36,-5.25,-10.48,back+.55])d.box(r,near,roof-.29,roof+.04,v-.51,v+.51,white);
  d.box(r,r+.30,roof-.32,roof+.04,back,.22,white);d.box(near-.26,near,roof-.32,roof+.04,back,.22,white);
  return d.groups;
}

// The long sides facing the two courtyards belong to four distinct footprints.
// Use their own corner breaks and floor heights for the sheltered galleries.
const wings={
  '712688925':{z:-10.3,nz:-1,levels:[4.60,8.40,12.2],span:7.35},
  '712688926':{z:-40.2,nz:1, levels:[4.88,8.89,12.92],span:6.9},
  '712688927':{z:-112.3,nz:-1,levels:[4.85,9.08,13.30],span:7.20},
  '712688929':{z:-141.4,nz:1,levels:[5.05,9.58,14.12],span:7.65}
};
export function teachingWingEdge(id,e){
  const w=wings[id];return !!w&&e.nz*w.nz>.96&&Math.abs(e.az+e.tz*e.length/2-w.z)<4.25&&e.length>3;
}
export function teachingCourtModels(data,spine){
  const out=data.building.some(r=>r[4]===spine)?sites.flatMap(court):[];
  for(const [ring,h,,,id] of data.building){
    const w=wings[id];if(!w)continue;
    for(const {d,len} of streetEdges(ring)){
      const [,az]=d.world([-len/2,0]);
      if(!teachingWingEdge(id,{az,tx:d.nz,tz:-d.nx,nz:d.nz,length:len}))continue;
      const n=Math.max(1,Math.round(len/w.span));
      for(let j=0;j<n;j++){
        const a=-len/2+len*j/n,b=a+len/n;
        if(j===0)d.box(a,a+.28,.16,h,-.03,1.48,white);
        d.box(b-.26,b,.16,h,-.03,1.48,white);
        for(const [k,y] of [.73,...w.levels].entries()){
          d.box(a,b,y-.20,y,-.03,1.58,slab);
          if(k)guard(d,a+.14,b-.14,y,1.44);
          const left=a+.58,right=b-.72;
          if(right>left+.45)panelWindow(d,left,right,y+.89,y+2.5,.12,k===0?3:2);
        }
      }
      out.push(...d.groups);
    }
  }
  return out;
}
export function teachingCourtGround({surfaces,forecourts,shrubs}){
  for(const s of sites){
    const p=rect(s,s.t[0],s.far,s.back,13.0);
    surfaces.push([p,.882,'#c2b8aa']);forecourts.push(p);
    const a=s.near-2.85,b=s.near-.65,bed=rect(s,a,b,s.bridge+.38,.88);
    surfaces.push([bed,.96,'#857c68']);
    for(let v=s.bridge+1.8;v<.25;v+=2.2){
      const [x,z]=world(s,(a+b)/2,v);shrubs.push([x,z,1.26,1.05,.85,.60,'#557450',.74]);
    }
  }
}
