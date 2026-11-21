import {orientedFrame as frame,streetEdges,panel,panelWindow,clip} from './survey-mesh.js';

// Two curved buildings with quite different sections. Work along the real
// footprint segments so the glazing, slabs and interruptions turn with each wall.
export const officeId='713118048', nanyuanId='712735064';
export const roundColors={[officeId]:['#d2c9ba','#b9b9ad'],[nanyuanId]:['#bcada0','#aeaaa2']};
const south=()=>frame(-359.2,71.28,0,1), east=()=>frame(-240.8,598.85,1,0);
const band='#e1d9cb', trim='#cabfaf', metal='#adb5b4', warm='#bbab96';
const rect=(l,r,n,s)=>[[l,n],[r,n],[r,s],[l,s]];
const officePosts=[-5.65,0,5.65],postRing=u=>Array.from({length:16},(_,j)=>[u+.41*Math.cos(j*Math.PI/8),.48+.41*Math.sin(j*Math.PI/8)]);
export const roundSigns=[{id:nanyuanId,text:'南苑餐厅',horizontal:true,width:19.5,height:2.05,
  point:east().at([0,7.75,1.28]),yaw:Math.PI/2,color:'#d6b476'}];

function pane(d,l,r,lo,hi,v,n,color){
  panel(d,l,r,lo,hi,v,color,'glass');
  for(let j=0;j<=n;j++){const u=l+(r-l)*j/n;panel(d,u-.045,u+.045,lo,hi,v+.04,metal,'wall',1);}
  panel(d,l,r,hi-.55,hi-.47,v+.05,metal,'wall',1);
}
function office(record){
  const groups=[];
  for(const {d,len} of streetEdges(record[0])){
    const [x,z]=d.world([0,0]),a=-len/2,b=len/2,r=Math.hypot(x+359,z-35.6);
    const outer=r>33&&r<37.5&&len<9.1, front=outer&&z>58, gallery=outer&&!front;
    if(gallery||front){
      // The front has grilles flush with the glass. The garden-facing gallery
      // casts deep shadows and has a separate, open rail outside its glazing.
      const centerDoor=front&&Math.abs(x+359.2)<7;
      if(!centerDoor)pane(d,a+.18,b-.19,1.12,4.48,.06,3,front?'#81908f':'#708682');
      for(const y of [5.05,8.64,12.23,15.82]){
        pane(d,a+.13,b-.15,y+.18,y+2.57,.07,3,front?'#78838c':'#53666c');
        d.box(a-.06,b+.06,y-.42,y+.04,-.16,gallery?1.08:.36,band);
        if(gallery){
          d.group([0,y+.58,.98]);d.bar([a,y+.90,.97],[b,y+.90,.97],.046,'#818884');
          d.bar([a,y+.43,.97],[b,y+.43,.97],.025,'#8c9391');
          for(let u=a+.36;u<b;u+=1.2)d.bar([u,y+.02,.97],[u,y+.92,.97],.029,'#939a98');
        }else{
          for(let u=a+.30;u<b-.12;u+=.33)panel(d,u-.017,u+.017,y+.24,y+2.51,.15,'#9a9e9b','wall',1);
        }
        d.box(a+.02,a+.30,y+.03,y+3.16,.08,gallery?.92:.22,band);
      }
      d.box(a-.06,b+.06,18.85,19.38,-.22,gallery?1.10:.46,band);
    }else if(len>2.85){
      // The flat returns have punched openings, especially sparse on the short ends.
      const n=Math.max(1,Math.floor((len-1.4)/4.65)),end=len<10;
      for(const y of [1.55,5.4,9,12.6,16.2])for(let j=0;j<n;j++){
        const u=a+(j+.5)*len/n,w=Math.min(end?1.05:1.84,len*.56);
        panelWindow(d,u-w/2,u+w/2,y,y+(end?1.45:1.85),.06,end?1:2);
      }
      if(len>12)d.box(a,b,18.70,19.16,-.15,.23,trim);
    }
    groups.push(...d.groups);
  }
  const d=south();
  for(let j=0;j<5;j++)d.box(-8.4+j*.17,8.4-j*.17,.72+j*.165,.885+j*.165,-1.5,4.55-j*.59,'#c5baab');
  d.box(-6.20,6.20,1.35,1.545,-3.58,-1.46,'#bdb2a4');
  pane(d,-5.78,5.78,1.55,4.54,-3.48,6,'#414f51');
  d.box(-6.05,6.05,4.56,4.72,-3.56,.33,'#b7ad9e');
  for(const u of officePosts){
    const ring=postRing(u);
    for(let j=0;j<ring.length;j++){
      const a=ring[j],b=ring[(j+1)%ring.length],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
      d.group([x,3.17,z],[x-u,0,z-.48]);d.face(a,b,1.53,4.89,'#c9bba6');
    }
  }
  d.box(-7.75,7.75,4.84,5.01,-.30,3.39,'#acc3b9','canopy');
  for(let u=-7.6;u<=7.6;u+=2.52)d.box(u-.10,u+.1,4.59,5.06,-.28,3.55,'#c8c6b7');
  return groups.concat(d.groups);
}
function dining(record){
  const groups=[];
  for(const {d,len} of streetEdges(record[0])){
    const [x,z]=d.world([0,0]),a=-len/2,b=len/2;
    if(len<1.4||x>-241.5&&len>20)continue;
    const portico=z>617&&d.nz>.54, curve=len<8&&Math.hypot(x+263.6,z-597.5)>27;
    if(curve){
      pane(d,a+.13,b-.15,1.22,4.00,.065,3,'#727a76');
      pane(d,a+.19,b-.22,5.27,8.35,.08,portico?3:2,'#778382');
      pane(d,a+.20,b-.17,10.26,12.83,.075,2,'#697779');
      for(const y of [4.25,8.66,13.09])d.box(a-.055,b+.055,y,y+.30,-.11,.37,trim);
      if(portico){
        d.box(a-.11,b+.11,8.68,10.03,-.20,2.35,'#dcdad2');
        d.box(a+.16,a+.68,.76,8.70,1.49,2.02,'#dedbd1');
        for(let u=a+.32;u<b;u+=1.08)panel(d,u-.024,u+.024,8.73,9.96,2.375,'#bcc1bc','wall',1);
        // The thin steel hoop and open cross-members stand above the roof, not a solid parapet.
        d.group([0,14.8,.7]);d.bar([a,15.54,1.20],[b,15.54,1.20],.082,'#809599',0);
        d.bar([a,15.89,-.52],[b,15.89,-.52],.069,'#93a2a2',0);
        d.bar([a+.43,13.45,.65],[a+.43,15.56,1.20],.071,'#869b9c',0);
        d.bar([a,15.53,1.20],[b,15.89,-.52],.057,'#9da9a6');
      }
    }else if(len>3.4){
      for(let u=a+1.4;u<b-.5;u+=3.5)for(const y of [2,6.0,10.35])panelWindow(d,u-.60,u+.60,y,y+1.65,.07,2);
    }
    groups.push(...d.groups);
  }
  const d=east();
  // The flat eastern chord is already set back from the circular wings. Set
  // the ground-floor glazing farther back still, with posts in front of it.
  pane(d,-12.55,12.55,1.06,4.45,-2.61,10,'#475653');
  pane(d,-12.40,12.40,5.29,8.74,-.74,11,'#526569');
  pane(d,-12.25,12.25,10.5,12.88,-.72,10,'#68777b');
  for(const u of [-12.35,-6.2,0,6.2,12.35])d.box(u-.26,u+.26,.78,4.81,-.15,.57,band);
  for(const y of [4.59,9.01])d.box(-13.55,13.55,y,y+.45,-1.1,1.32,'#c7c1b2');
  d.group([0,7.15,1.12]);for(const y of [6.6,7.65,8.53])d.bar([-13.2,y,1.11],[13.2,y,1.11],.048,metal);
  for(let u=-13;u<=13;u+=2.36)d.bar([u,6.56,1.11],[u,8.58,1.11],.043,metal);
  for(const u of [-13.6,13.6])d.box(u-.24,u+.24,.80,15.72,-2.05,2.38,warm);
  // Paired shallow roof pitches, with a notch at the centre.
  for(const s of [-1,1]){
    const p=[[s*.72,14.48,.67],[s*6.4,15.52,.67],[s*13.38,14.68,.67]];
    d.group([s*6.6,14.48,.67]);
    for(let j=1;j<p.length;j++){
      const a=p[j-1],b=p[j];
      d.quad([[a[0],13.32,.67],[b[0],13.32,.67],b,a],'#bfb2a2');
      d.quad([a,b,[b[0],b[1]-.21,-3.4],[a[0],a[1]-.21,-3.4]],'#8e9996');
    }
  }
  return groups.concat(d.groups);
}
export function roundModels(records){
  return records.flatMap(r=>r[4]===officeId?office(r):r[4]===nanyuanId?dining(r):[]);
}
export function* officeSolids(record){
  const p=record[0],base=[],l=-365.4,r=-353.0;
  const add=q=>{const a=base.at(-1);if(!a||Math.hypot(a[0]-q[0],a[1]-q[1])>.001)base.push(q);};
  // Cut only the convex southern rim on the ground floor. Clipping the
  // entire horseshoe in strips could join the separated arms across its court.
  for(let i=1;i<p.length;i++){
    const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1];
    if(a[1]<67||b[1]<67||dx>=0){add(a);add(b);continue;}
    const cuts=[0,1,...[l,r].map(x=>(x-a[0])/dx).filter(t=>t>0&&t<1)].sort((a,b)=>a-b);
    for(let j=1;j<cuts.length;j++){
      const u=cuts[j-1],v=cuts[j],mx=a[0]+(u+v)*dx/2,inside=mx>l&&mx<r;
      for(const t of [u,v])add([a[0]+t*dx,inside?67.7:a[1]+t*dz]);
    }
  }
  yield {record,p:base,base:.08,top:4.56};yield {record,p,base:4.56,top:record[1]+.08};
  const d=south();
  for(const u of officePosts){const q=postRing(u).map(d.world);yield {record,p:[...q,q[0]],base:1.53,top:4.89,custom:true};}
}
export function* diningSolids(record){
  const d=east(),p=record[0].slice(0,-1).map(d.local);
  const add=(q,base,top,custom=false)=>({record,p:[...q,q[0]].map(d.world),base,top,custom});
  for(const [l,r,cut] of [[-150,-12.9,null],[-12.9,12.9,-2.72],[12.9,150,null]]){
    const strip=clip(clip(p,0,l,false),0,r,true);
    if(cut===null){yield add(strip,.08,13.52);continue;}
    yield add(clip(strip,1,cut,true),.08,4.62);
    yield add(clip(strip,1,-.85,true),4.62,13.52);
  }
  for(const u of [-12.35,-6.2,0,6.2,12.35])yield add(rect(u-.26,u+.26,-.15,.57),.78,4.81,true);
}
export function roundGround(data,{surfaces,forecourts,shrubs}){
  const has=id=>data.building.some(b=>b[4]===id);
  if(has(nanyuanId)){
    const d=east(),yard=[[-14,-.5],[14,-.5],[19,10],[22,31],[-19,34],[-18,11]].map(d.world);
    surfaces.push([yard,.77,'#c9b69d']);forecourts.push(yard);
    for(const u of [-7.3,7.3])surfaces.push([rect(u-.095,u+.095,-.42,32).map(d.world),.79,'#81878a']);
  }
  if(has(officeId)){
    const d=south(),yard=rect(-9.8,9.8,-.80,9.65).map(d.world);surfaces.push([yard,.77,'#bdb6a9']);forecourts.push(yard);
    const pts=[[-341,1],[-348,-2.3],[-355,-3.7],[-363,-3.8],[-370,-2.2],[-378,1.35]];
    for(const [x,z] of pts)shrubs.push([x,z,1.45,1.35,1.30,.66,'#526f47',.70]);
  }
}
export function officeHeight(x,z){
  if(Math.abs(x+359.2)<=6.20&&z>=67.70&&z<69.81)return 1.545;
  if(Math.abs(x+359.2)>8.4||z<69.78||z>75.84)return;
  for(let i=4;i>=0;i--)if(Math.abs(x+359.2)<=8.4-i*.17&&z<=71.28+4.55-i*.59)return .885+i*.165;
}
