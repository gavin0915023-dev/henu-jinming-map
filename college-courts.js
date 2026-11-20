import {orientedFrame,streetEdges,panel,panelWindow,clip} from './survey-mesh.js';

export const jiaoId='712735066',beiId='716761648',eduId='712688907',geoId='712688940';
const linkId='712688913',northWing='712688912',southWing='712688911';
export const courtColors={
  [jiaoId]:['#cac9c2','#bebbb1'],[beiId]:['#d2c5af','#b5b1a6'],[eduId]:['#e0ded4','#c6c6ba'],
  [linkId]:['#c6c7bd','#aaa79f'],[northWing]:['#a7614e','#b8b3a8'],[southWing]:['#b07361','#bcb6ab'],
  [geoId]:['#a56450','#b4ada0']
};
export const courtSolidIds=new Set([jiaoId,beiId,eduId,linkId]);
const jiao=()=>orientedFrame(-262.35,432.6,-1,0);
const bei=()=>orientedFrame(329.75,-409.15,-.612,.791);
const edu=()=>orientedFrame(238.4,-288.5,-.965,-.262);
const geo=()=>orientedFrame(-102,307.5,-.182,.983);
const chalk='#e0ded4',grey='#babbb4',metal='#a3abb0',pale='#d4c8b5',coral='#c77853',blue='#48646c',redBrick='#a05e4c';
const rect=(l,r,a,b)=>[[l,a],[r,a],[r,b],[l,b]];
const closed=p=>[...p,p[0]];
const band=(p,axis,l,r)=>clip(clip(p,axis,l,false),axis,r,true);
const boxPlan=(d,l,r,n,s)=>rect(l,r,n,s).map(d.world);
const ellipse=(x,z,a,b,n=24)=>Array.from({length:n},(_,i)=>[x+a*Math.cos(2*Math.PI*i/n),z+b*Math.sin(2*Math.PI*i/n)]);
function tube(d,u,v,r,b,t,color){
  const p=ellipse(u,v,r,r,10);
  for(let i=0;i<p.length;i++){
    const a=p[i],q=p[(i+1)%p.length],cx=(a[0]+q[0])/2,cz=(a[1]+q[1])/2;
    d.group([cx,(b+t)/2,cz],[cx-u,0,cz-v]);d.face(a,q,b,t,color);
  }
}
function ribbon(d,l,r,y,t,v,pitch,col=blue){
  panel(d,l,r,y,t,v,col,'glass');const n=Math.max(1,Math.round((r-l)/pitch));
  for(let i=0;i<=n;i++){const x=l+(r-l)*i/n;panel(d,x-.034,x+.034,y,t,v+.032,metal,'wall',1);}
}
function railing(d,l,r,y,v){
  panel(d,l,r,y+.94,y+1.025,v,'#bfc3bd');
  for(const h of [.37,.62])panel(d,l,r,y+h,y+h+.037,v,'#a6ada9','wall',1);
  const n=Math.ceil((r-l)/1.58);
  for(let i=0;i<=n;i++){const x=l+(r-l)*i/n;panel(d,x-.043,x+.043,y,y+1.01,v+.02,'#b5bcb7','wall',1);}
}
export const courtSigns=[
  {id:jiaoId,text:'河南大学民族餐厅',horizontal:true,point:jiao().at([6.4,3.67,.48]),yaw:-Math.PI/2,width:5.5,height:.77,color:'#e5e9da'}
];

// Jiaoyuan: three storeys of coral aprons wrap the bend. The short west
// face carries the historic blue sign; neither the sign nor the doors repeat.
function diningBays(d,l,r,count,{front=false,grille=false}={}){
  const step=(r-l)/count;
  for(let i=0;i<count;i++){
    const a=l+i*step,b=a+step;
    panel(d,a,b,.12,10.55,.06,'#d2cfc4');
    for(let j=0;j<3;j++){
      const y=.58+3.27*j,door=front&&j===0&&i===1;
      panel(d,a+.15,b-.13,y,y+.79,.104,coral);
      ribbon(d,a+.21,b-.20,door?.89:y+.83,y+2.76,.13,door?.97:1.22,door?'#425457':'#607378');
      panel(d,a+.21,b-.2,y+2.23,y+2.285,.195,'#c8ccc7','wall',1);
      if(grille&&j===0)for(let x=a+.3;x<b-.23;x+=.29)panel(d,x-.024,x+.024,y+.84,y+2.69,.23,'#adb1a8','wall',1);
      d.box(a,b,y+2.76,y+2.94,.04,.37,chalk,'wall',1);
    }
    d.box(a-.03,a+.16,.55,10.65,.025,.28,'#c9ccc6');
  }
  d.box(l,r,9.94,10.64,-.25,.21,coral);
}
function jiaoDining(record){
  const d=jiao();diningBays(d,-.02,11.62,3,{front:true});
  d.box(11.62,15.65,.12,12.24,-6.8,.14,'#c7c9c4');
  for(const y of [1.52,5.05,8.72])panelWindow(d,12.99,14.09,y,y+.91,.22,2);
  d.box(3.20,9.60,3.13,4.28,.16,.43,'#286275');
  for(let j=0;j<3;j++)d.box(2.6,10.7,.79+j*.13,.93+j*.13,.45,2.22-j*.46,'#bcb6a7');
  const all=d.groups;
  for(const {d:f,len} of streetEdges(record[0])){
    const w=len/2;
    if(f.nx<-.7&&f.nz<-.4&&len>26){diningBays(f,-w,w,6);all.push(...f.groups);}
    else if(f.nz>.98&&len>11||f.nx>.99&&len>30){
      // The service side has security bars on the lower windows, long blank
      // bays and a few visible wall-mounted condensers, no second blue sign.
      const side=f.nx>.99,n=side?9:Math.max(2,Math.round(len/5.4)),gap=len/n;
      for(let i=0;i<n;i++){
        const a=-w+i*gap,b=a+gap;
        if(side&&(i===2||i===6))panel(f,a,b,.12,10.56,.08,'#c3c5bf');
        else diningBays(f,a,b,1,{grille:true});
      }
      if(!side&&len>25)for(const u of [-w*.69,-w*.11,w*.53]){
        f.box(u-.54,u+.54,.91,1.71,.25,.88,'#c3beb0','wall',1);
        for(let j=0;j<5;j++)panel(f,u-.42,u+.42,1.08+j*.092,1.10+j*.092,.89,'#888b82','wall',1);
      }
      all.push(...f.groups);
    }
  }
  return all;
}

// Beiyuan: a two-level hall between masonry end pavilions. Its public face
// looks obliquely southwest across Zhongzhou Road, not along the world axes.
const tiers=[[-120,-22.3,10.45],[-22.3,3.9,10.18],[3.9,22.3,8.72],[22.3,120,11.38]];
// Warm rectangular facing panels on Beiyuan only. Their shallow joints sit
// behind the window frames so the glass does not inherit the masonry pattern.
function ashlar(d,l,r,lo,hi,v){
  for(let y=lo+.64;y<hi;y+=.72)panel(d,l,r,y,y+.018,v,'#b9ad99','wall',1);
  for(let x=l+1.28;x<r;x+=1.53)panel(d,x,x+.018,lo,hi,v,'#bfb39f','wall',1);
}
function beiDining(){
  const d=bei(),l=-22.29,r=3.89;
  panel(d,l,r,.12,10.29,.07,pale);
  ashlar(d,l,r,.26,10.13,.084);
  for(let i=0;i<7;i++){
    const a=l+(r-l)*i/7,b=l+(r-l)*(i+1)/7;
    ribbon(d,a+.39,b-.38,4.96,6.81,.12,.92,'#657a7c');
    ribbon(d,a+.40,b-.39,7.37,8.83,.12,1.02,'#78878a');
    for(const y of [6.26,8.28])panel(d,a+.38,b-.38,y,y+.085,.181,'#bec4bd','wall',1);
    for(const y of [4.79,7.18])d.box(a+.26,b-.23,y,y+.15,.035,.31,'#c8bcaa','wall',1);
    d.box(a+.01,a+.22,4.06,9.98,.11,.47,chalk);
    panel(d,a+.16,b-.12,7.0,7.20,.23,'#c1b49c');
    panelWindow(d,a+.25,b-.22,1.15,3.64,.16,2);
  }
  for(let u=-22.2;u<3.9;u+=1.12){
    d.group([u,9.85,.93]);d.bar([u,9.57,.12],[u,10.24,1.7],.054,'#d0c0a5',1);
  }
  d.box(l,r,10.16,10.36,.03,1.71,'#c4b59d');
  panel(d,4.0,22.3,.10,8.83,.061,'#d5c6af');
  ashlar(d,4.0,22.3,.24,8.75,.082);
  for(const y of [1.83,5.45])for(const u of [6.5,10.7,14.9,19.12])panelWindow(d,u-.88,u+.88,y,y+1.34,.14,2);
  for(const y of [3.9,7.74])d.box(4.0,22.31,y,y+.15,-.04,.25,'#aca99e');
  // Front landing and external staircase, rising toward the left pavilion.
  for(let i=0;i<23;i++){
    const a=-12.7-(i+1)*.41;d.box(a,a+.415,.76,.95+i*.161,.48,3.54,'#bcbaa9');
  }
  d.box(-24,-22.13,4.32,4.53,.45,3.56,pale);
  for(const v of [.57,3.46]){
    d.group([-17.7,3.5,v]);d.bar([-12.7,1.68,v],[-22.16,5.26,v],.12,'#d5c7ad',0);
    for(let j=0;j<5;j++){const x=-13.15-j*2.12,y=1.05+(-12.7-x)*.39;d.bar([x,y,v],[x,y+.79,v],.045,metal);}
  }
  for(let i=0;i<3;i++)d.box(-12.65,14.0,.77+i*.12,.90+i*.12,.22,3.36-i*.39,'#c3bba9');
  d.box(-13.25,14.2,3.83,4.19,-.08,3.44,'#bdb9aa');
  for(const u of [-12.5,-7.5,-2.5,2.5,7.5,12.9])tube(d,u,2.93,.155,.86,3.83,'#c9c8ba');
  for(const [a,b,v,h] of [[-30.63,-22.32,4.68,10.47],[22.32,32.64,4.93,11.39]]){
    panel(d,a,b,.12,h,v,pale);
    ashlar(d,a,b,.26,h-.04,v+.019);
    for(const y of [3.42,7.51])panel(d,a,b,y,y+.17,v+.07,'#a9a79a');
    if(a>0){
      ribbon(d,a+.22,a+3.07,3.69,h-.54,v+.10,1,'#697e89');
      for(const y of [5.8,7.70,9.32])panel(d,a+.22,a+3.07,y,y+.13,v+.17,chalk);
      for(let k=0;k<4;k++)panel(d,b-3.05,b-.76,9.03+k*.17,9.10+k*.17,v+.14,'#94988c');
    }
  }
  // The concrete roof of the western stair pavilion is lifted on short
  // uprights. Gaps under the two projecting slab strips stay open to daylight.
  for(const v of [-4.8,3.0])for(const u of [-30.15,-26.4,-22.88])d.box(u-.14,u+.14,10.42,11.90,v-.14,v+.14,pale);
  for(const [a,b] of [[-31.2,-27.93],[-25.12,-21.95]])d.box(a,b,11.79,12.04,-5.33,4.92,'#c4bbaa');
  return d.groups;
}

const clockPlan=closed([[226.7,-292.1],[229.7,-295.7],[238.4,-288.5],[237.1,-283.5]]);
const coreL=-33.88,coreR=-13.15,roofU=3.25,roofV=-11.9,holeU=7.2,holeV=6.8;
const supports=[-32.9,-14.85,-7.2,5.65,16.05];
function skyOpening(d){
  const L=-33.9,R=19.94,N=-24.02,S=.26,angles=Array.from({length:40},(_,i)=>i*Math.PI/20);
  for(const [u,v] of rect(L,R,N,S))angles.push((Math.atan2((v-roofV)/holeV,(u-roofU)/holeU)+Math.PI*2)%(Math.PI*2));
  angles.sort((a,b)=>a-b);
  const edge=t=>{
    const du=holeU*Math.cos(t),dv=holeV*Math.sin(t);
    const k=Math.min(Math.abs(du)<1e-10?Infinity:(du>0?R-roofU:L-roofU)/du,Math.abs(dv)<1e-10?Infinity:(dv>0?S-roofV:N-roofV)/dv);
    return [[roofU+du,roofV+dv],[roofU+du*k,roofV+dv*k]];
  };
  for(let i=0;i<angles.length;i++){
    const [a,b]=edge(angles[i]),[c,e]=edge(angles[(i+1)%angles.length]),at=(p,y)=>[p[0],y,p[1]];
    d.group([(a[0]+b[0]+c[0]+e[0])/4,13.7,(a[1]+b[1]+c[1]+e[1])/4]);
    d.quad([at(b,14.28),at(e,14.28),at(c,14.28),at(a,14.28)],'#b3b2a9');
    d.quad([at(a,13.31),at(c,13.31),at(e,13.31),at(b,13.31)],'#c8c7bc');
    d.face(a,c,13.31,14.28,'#939a97');d.face(b,e,13.31,14.28,'#8f9594');
  }
}
function eduCourt(){
  const d=edu();skyOpening(d);
  for(const v of [-24.02,.25]){
    const east=v<0,offset=east?-.055:.055,flip=east?-1:1;
    const f=orientedFrame(...d.world([0,v]),d.nx*flip,d.nz*flip),l=east?-coreR:coreL,r=east?-coreL:coreR;
    panel(f,l,r,4.12,13.31,offset*flip,'#dadbd3');
    for(const y of (east?[5.19,10.39]:[5.43]))ribbon(f,l+2.0,r-1.95,y,y+.91,.115,1.22,'#637177');
    for(let u=l+3.7;u<r;u+=3.7)panel(f,u-.019,u+.019,6.6,12.98,.083,'#c5c8c1','wall',1);
    for(let u=-33.6;u<19.5;u+=3.45)panel(f,east?-u-.02:u-.02,east?-u+.02:u+.02,13.35,14.24,.103,'#737b7d','wall',1);
    d.groups.push(...f.groups);
  }
  for(const v of [-23.98,-2.96]){
    for(const y of [4.23,8.72]){
      d.box(coreR,19.90,y-.38,y,v,v+2.98,'#c4c5bb');
      const reverse=v<-10,sign=reverse?-1:1,world=d.world([0,reverse?v-.012:v+2.995]);
      const f=orientedFrame(...world,d.nx*sign,d.nz*sign);
      railing(f,reverse?-19.88:coreR,reverse?-coreR:19.88,y,.02);d.groups.push(...f.groups);
    }
  }
  for(const u of supports)for(const v of [-22.5,-1.27])d.box(u-.24,u+.24,.70,13.4,v-.26,v+.26,'#a8acaa');
  // Two low risers are continuous beneath the openings; the forecourt stays accessible.
  for(let i=0;i<2;i++)d.box(coreL,18.9,.76+i*.14,.90+i*.14,.30,2.30-i*.62,'#b9b7aa');
  for(const {d:f,len} of streetEdges(clockPlan)){
    const w=len/2,glassEnd=f.nx<-.70&&f.nz<-.30&&len<6;
    panel(f,-w,w,.1,2.41,.04,'#b2b1a7');
    if(glassEnd){
      ribbon(f,-w+.12,w-.12,2.42,37.55,.065,1.14,'#384957');
      for(let y=3.3;y<37.4;y+=2.01)panel(f,-w+.13,w-.13,y,y+.060,.13,'#586575','wall',1);
    }else{
      panel(f,-w,w,2.41,38.3,.055,'#a26150','brick');
      if(len<6&&f.nx>.65){
        ribbon(f,-w+.11,w-.10,23.7,37.7,.10,1.35,'#414e58');
        for(let y=25.1;y<37.6;y+=2.01)panel(f,-w+.12,w-.12,y,y+.056,.16,'#626c73','wall',1);
      }
      if(len>8){
        const clockSide=f.nx<-.35&&f.nz>.5;
        for(let y=5.5;y<27;y+=4.1)panelWindow(f,w-1.82,w-.92,y,y+.94,.12,1);
        if(clockSide){
          const mid=-.55,cy=32.65;f.group([mid,cy,.20],[0,0,1]);
          for(let j=0;j<12;j++){
            const a=j*Math.PI/6,mark=k=>[mid+Math.sin(a)*k,cy+Math.cos(a)*k,.24];
            f.bar(mark(1.01),mark(j%3===0?1.62:1.44),j%3===0?.094:.067,'#d2c9a9',0);
          }
          f.bar([mid,cy,.29],[mid-.29,cy+.71,.29],.070,'#d3ccae',0);
          f.bar([mid,cy,.32],[mid+.86,cy+.27,.32],.060,'#d3ccae',0);
        }
      }
    }
    if(!glassEnd)f.box(-w,w,38.28,38.58,-.16,.17,'#ac7662');
    d.groups.push(...f.groups);
  }
  return d.groups;
}
function wingEdge(id,e){
  const towardSouth=-.262*e.nx+.965*e.nz;
  return id===northWing?(towardSouth>.78||e.nx<-.85):id===southWing?(-towardSouth>.78||e.nx<-.75):false;
}
export const courtEdge=(id,e)=>id===northWing||id===southWing?wingEdge(id,e):Boolean(courtColors[id]);
function flankingWing(record){
  const all=[],[p,h,,,id]=record;
  for(const {d,len} of streetEdges(p)){
    if(!wingEdge(id,d)||len<1)continue;
    const w=len/2;
    panel(d,-w,w,.14,h+.08,.061,'#a66554','brick');
    if(len>18){
      const n=Math.max(3,Math.floor(len/5.2)),pitch=len/n;
      for(let j=0;j<5;j++){
        const y=.82+j*(h/5);
        for(let i=0;i<n;i++){const a=-w+i*pitch;panelWindow(d,a+.35,a+pitch-.33,y+.35,y+2.18,.13,3);}
        d.box(-w,w,y+2.18,y+2.57,.02,.48,chalk);
      }
    }else if(len>7.3){
      ribbon(d,-w+.51,-w+2.19,1.45,h-.52,.14,.84,'#536776');
      for(let y=3.83;y<h-.4;y+=3.52)panel(d,-w+.42,-w+2.25,y,y+.13,.22,grey);
    }
    all.push(...d.groups);
  }
  return all;
}

// Geography building: inset pairs of independent red-brick windows. The
// white lintel marks stop between bays; they are not continuous ribbon glazing.
function geoBlock(d,l,r,v,n,front){
  const h=16.04,bay=(r-l)/n;panel(d,l,r,.10,h+.045,v,redBrick,'brick');
  panel(d,l,r,.14,1.18,v+.035,'#979487');
  for(let y=.35;y<1.15;y+=.29)panel(d,l,r,y,y+.033,v+.06,'#aaa597','wall',1);
  for(let i=0;i<n;i++){
    const u=l+(i+.5)*bay;
    for(let j=0;j<5;j++){
      const y=1.48+j*3.02;
      for(const side of [-1,1]){
        const x=u+side*bay*.227,w=Math.min(1.85,bay*.36);
        panelWindow(d,x-w/2,x+w/2,y,y+1.64,v+.09,2);
        panel(d,x-w/2+.06,x+w/2-.08,y+1.64,y+1.79,v+.15,'#d4caba');
      }
      // Narrow contrasting inlays in the brick are visible particularly from the north lane.
      if(!front){panel(d,u-.082,u+.082,y-.11,y+1.67,v+.10,'#d4c9b5');
        panel(d,u-bay*.41,u-bay*.12,y+2.29,y+2.43,v+.10,'#cfc1ac');}
    }
  }
  d.box(l,r,15.72,15.98,v-.04,v+.47,chalk);
}
function geography(record){
  const d=geo();geoBlock(d,9.23,60.37,17.77,8,true);geoBlock(d,63.10,86.58,17.62,4,true);
  // The south-west bay has a rounded glazed stairwell and three projecting
  // white balcony slabs; the opposite end terminates in a pale, nearly blind wall.
  const curve=(j,r)=>{const t=(-.51+j/16*1.83);return [-1.25+7.45*Math.sin(t)*r,10.70+7.2*Math.cos(t)*r];};
  for(let i=0;i<16;i++){
    const a=curve(i,1),b=curve(i+1,1),av=(a[0]+b[0])/2,vv=(a[1]+b[1])/2;
    d.group([av,8.25,vv]);d.face(a,b,.70,16.02,'#668087','glass');
    d.bar([a[0],1.08,a[1]+.06],[a[0],15.96,a[1]+.06],.060,'#c2c8be',1);
    for(const y of [3.96,7.05,10.15,13.24,16.00]){
      const x=curve(i,1.19),z=curve(i+1,1.19),pt=(v,h)=>[v[0],h,v[1]];
      d.face(x,z,y-.25,y+.10,chalk);d.quad([pt(a,y+.10),pt(b,y+.10),pt(z,y+.10),pt(x,y+.10)],chalk);
    }
  }
  for(const {d:f,len} of streetEdges(record[0])){
    if(f.nz<-.88&&len>18){
      geoBlock(f,-len/2,len/2,.038,Math.max(3,Math.round(len/6.3)),false);d.groups.push(...f.groups);
    }else if(f.nx>.87&&len>12){
      const w=len/2;panel(f,-w,w,.13,16.10,.058,'#d6d5c7');
      for(let y=2;y<15;y+=3.12)panelWindow(f,w*.31,w*.31+.90,y,y+1.14,.14,1);
      d.groups.push(...f.groups);
    }
  }
  return d.groups;
}

export function courtModels(data){
  const all=[];
  for(const record of data.building){
    const id=record[4];
    if(id===jiaoId)all.push(...jiaoDining(record));
    if(id===beiId)all.push(...beiDining());
    if(id===eduId)all.push(...eduCourt());
    if(id===geoId)all.push(...geography(record));
    if(id===northWing||id===southWing)all.push(...flankingWing(record));
  }
  return all;
}

export function* courtSolids(record){
  const [p,h,,,id]=record;
  if(id===jiaoId){
    yield {record,p,base:.08,top:10.56};
    yield {record,p:closed(boxPlan(jiao(),11.62,15.65,-6.8,.14)),base:10.56,top:12.24,custom:true};return;
  }
  if(id===beiId){
    const d=bei(),ring=p.slice(0,-1).map(d.local);
    for(const [l,r,h] of tiers){const q=band(ring,0,l,r);if(q.length>=3)yield {record,p:closed(q.map(d.world)),base:.08,top:h};}
    for(const u of [-12.5,-7.5,-2.5,2.5,7.5,12.9])yield {record,p:closed(ellipse(u,2.93,.155,.155,10).map(d.world)),base:.86,top:3.83,custom:true};
    return;
  }
  if(id===linkId){yield {record,p,base:4.15,top:14.28};return;}
  if(id!==eduId)return;
  const d=edu(),body=(l,r,n,s,base,top,custom=true)=>({record,p:closed(boxPlan(d,l,r,n,s)),base,top,custom});
  yield {record,p:clockPlan,base:.08,top:38.3};
  yield body(coreL,coreR,-24.02,.25,4.12,13.31,false);
  for(const u of supports)for(const v of [-22.5,-1.27])yield body(u-.24,u+.24,v-.26,v+.26,.70,13.4);
  for(const y of [4.23,8.72])for(const v of [-23.98,-2.96])yield body(coreR,19.9,v,v+2.98,y-.38,y);
  // Split the roof annulus into quadrilaterals following its real hole instead
  // of leaving an invisible full roof over it in the shared spatial model.
  const roof=edu();skyOpening(roof);
  for(const g of roof.groups){
    const points=g.parts[0][0].map(([x,,z])=>[x,z]);yield {record,p:closed(points),base:13.31,top:14.28,custom:true};
  }
}
export function courtGround(data,{surfaces,forecourts,shrubs},tree){
  const ids=new Set(data.building.map(b=>b[4]));
  const patch=(d,p,y,col,clear=false)=>{const r=p.map(d.world);surfaces.push([r,y,col]);if(clear)forecourts.push(r);};
  if(ids.has(jiaoId)){
    const d=jiao();patch(d,[[-3,.14],[15.7,.14],[20,16.9],[12.6,19.45],[-3,19.4]],.80,'#c4b7a5',true);
    for(const u of [-3,14.8])for(let v=5;v<=18;v+=1.56){
      const [x,z]=d.world([u,v]);shrubs.push([x,z,.86,.80,.91,.51,'#62784b',.46]);
    }
    for(const [x,z,h] of [[-273.7,423.2,8.4],[-274.6,417.2,8.1],[-270.7,428.1,6.5],[-212.5,409.2,7.7],[-212.4,433.1,8.0]])
      tree(x,z,h,'vase',true,'open');
  }
  if(ids.has(beiId)){
    const d=bei(),court=[[-30.6,4.72],[-22.32,4.72],[-22.31,.13],[22.31,.13],[22.31,5],[31.55,5],[30.2,18.2],[17.1,26.6],[-24.1,26.6],[-28.4,20.5]];
    patch(d,court,.81,'#c8b9a7',true);
    for(const u of [-18.1,-6.4,5.2,16.7])patch(d,rect(u,u+.52,3.53,26.4),.822,'#a19a8d');
    for(const [u,v,h] of [[-26.2,9.2,9.7],[-29.2,14.2,8.7],[29.5,14.0,9.2]]){
      const [x,z]=d.world([u,v]);tree(x,z,h,'spire',false);}
  }
  if(ids.has(eduId)){
    const d=edu();patch(d,rect(-34,20,-25,1),.805,'#bdb6a9',true);
    patch(d,[[-34,1],[-8,1],[.5,12.9],[6.4,1],[17,1],[17,28.2],[-5,34.4],[-29,33.3]],.82,'#c4b7a5',true);
    // The paved eastern square reaches the west kerb of Zhongzhou Road.
    // Its street edge is aligned to the actual road, not to the rotated building.
    const streetV=u=>(313.3-238.4+.262*u)/(-.965);
    patch(d,[[-39,-24],[27,-24],[27,streetV(27)],[-39,streetV(-39)]],.807,'#c8b9a7',true);
    for(const [l,r,n,s] of [[-34,-24,-57,-53],[-13,7,-55,-51],[-3,10,18.4,22.1]]){
      patch(d,rect(l,r,n,s),.825,'#78845d');
      for(let u=l+.7;u<r;u+=1.65)for(const v of [n+.7,s-.7]){
        const [x,z]=d.world([u,v]);shrubs.push([x,z,1.02,.88,1.00,.50,n<0?'#899849':'#607647',.61]);}
    }
    for(const [u,v,h] of [[-6,21.5,6.6],[13.1,24.9,6.8],[-25.2,26.3,7.3]]){
      const [x,z]=d.world([u,v]);tree(x,z,h,'vase',true,'open');}
  }
  if(ids.has(geoId)){
    const d=geo();patch(d,[[1,18.3],[85,18.4],[84,31],[0,30.4]],.69,'#78845d',true);
    const bed=[[-117.6,334.5],[-95,330.1],[-19.5,343.5],[-22.6,357.6],[-114.8,357.6]];
    surfaces.push([bed,.695,'#78845d']);forecourts.push(bed);
    const walk=[[-115,357.65],[-22.5,357.65],[-22.8,360.65],[-114.8,360.10]];
    surfaces.push([walk,.78,'#bdb6a9']);forecourts.push(walk);
    for(let x=-113.5;x<-23;x+=1.56)if(x< -100||x> -95&&x< -57||x> -52)shrubs.push([x,356.8,1.02,.76,.88,.45,'#66794c',.48]);
    for(const [x,z,h,form] of [[-108,354.7,10.9,'vase'],[-98.7,354.2,10.3,'shade'],[-87.6,354.1,11.6,'vase'],[-75.4,353.8,11.3,'vase'],[-63.1,354.6,10.4,'shade'],[-52,354.1,11.2,'vase'],[-39.7,354.1,10.6,'vase']])
      tree(x,z,h,form,true,'open');
    for(let u=2.4;u<83;u+=1.73){const [x,z]=d.world([u,30.1]);shrubs.push([x,z,1.04,.83,.88,.47,'#617647',.49]);}
    for(const u of [5,15,27,39,51,63,75]){const [x,z]=d.world([u,31.55]);tree(x,z,8.4+(u%3)*.4,'vase',true,'open');}
    for(let u=7;u<58;u+=5.9){const [x,z]=d.world([u,-5.25]);shrubs.push([x,z,1.11,1.02,.97,.44,'#607449',.47]);}
  }
}
export function courtHeights(ids){
  const d=bei(),j=jiao(),e=edu();
  return (x,z)=>{
    if(ids.has(beiId)&&x>296&&x<348&&z>-436&&z<-392){
      const [u,v]=d.local([x,z]);
      if(u>=-24&&u<=-22.13&&v>=.45&&v<=3.56)return 4.53;
      if(u>=-22.13&&u<=-12.7&&v>=.48&&v<=3.54)return .95+.161*Math.min(22,Math.floor((-12.7-u)/.41));
      if(u>=-12.65&&u<=14&&v>=.22&&v<=3.36)return .90+.12*Math.min(2,Math.floor((3.36-v)/.39));
    }
    if(ids.has(jiaoId)&&x<-262&&x>-265&&z>434&&z<444){const [u,v]=j.local([x,z]);
      if(u>=2.6&&u<=10.7&&v>=.45&&v<=2.22)return .93+.13*Math.min(2,Math.floor((2.22-v)/.46));}
    if(ids.has(eduId)&&x>220&&x<260&&z>-327&&z<-268){const [u,v]=e.local([x,z]);if(u>=coreL&&u<=18.9&&v>=.30&&v<=2.30)return v<=1.68?1.04:.90;}
    return null;
  };
}
