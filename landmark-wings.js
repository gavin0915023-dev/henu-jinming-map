import {orientedFrame,streetEdges,clip,panel,panelWindow} from './survey-mesh.js';

// Footprints are the map's. Heights and setbacks are estimates from the linked
// views, not survey measurements. No source photograph is used as a texture.
export const economicsId='712688902', mathsId='712688900', lifeId='716761653', huayuanId='712688853';
const econLink='712688897',mathAnnex='712688898',econAnnex='712688899';
export const landmarkColors={
  [economicsId]:['#b07863','#b4ada1'],[mathsId]:['#cdba9b','#b3aba0'],
  [econLink]:['#a66552','#b9b2a1'],[mathAnnex]:['#a96553','#b4b0a1'],[econAnnex]:['#a56653','#b4ad9e'],
  [lifeId]:['#d8d0bd','#bfb9a9'],[huayuanId]:['#c7c1b2','#aaa698']
};
export const steppedIds=new Set([economicsId,mathsId,lifeId,econLink,mathAnnex,econAnnex]);
const chalk='#e1dfd4',brick='#a05d4b',stone='#b9b5a8',rail='#5b6363';
const colleges={
  [economicsId]:{west:[102.8,-398.2],ends:[7,12.9,18.6,86.3],tops:[7.45,11.05,14.55,18.08,21.45],width:8.25},
  [mathsId]:{west:[78.1,-302.75],ends:[7.45,12.2,17.3,74.05],tops:[6.85,10.12,13.05,16.08,17.25],width:7.3}
};
const collegeFrame=c=>orientedFrame(...c.west,-.25,.968);
const lab=()=>orientedFrame(351.65,-495.5,0,1);
const slot=[-2.65,2.70], back=-2.12;
const stairs=[.90,1.05,1.20,1.35,1.50], noses=[2.52,2.07,1.62,1.17,.72];
const close=p=>[...p,p[0]];
const band=(p,axis,a,b)=>clip(clip(p,axis,a,false),axis,b,true);
function body(record,d,p,top){
  return {record,p:close(p.map(d.world)),base:.08,top};
}
function collegeSections(record){
  const cfg=colleges[record[4]],d=collegeFrame(cfg),p=record[0].slice(0,-1).map(d.local);
  return cfg.tops.map((h,i)=>body(record,d,band(p,0,cfg.ends[i-1]??-1,cfg.ends[i]??110),h));
}
export function* landmarkSolids(record){
  const [ring,,,,id]=record;
  if(colleges[id]){
    yield* collegeSections(record);
    if(id===mathsId){
      const d=collegeFrame(colleges[id]);
      yield {record,p:close([[12.85,-13.15],[16.1,-13.15],[16.1,-3.64],[12.85,-3.64]].map(d.world)),base:3.95,top:7.18,custom:true};
    }
    return;
  }
  if(id===econLink||id===mathAnnex||id===econAnnex){
    yield {record,p:ring,base:id===econLink?4.02:.08,top:id===econLink?7.38:id===mathAnnex?8.12:7.95};return;
  }
  if(record[4]!==lifeId)return;
  const d=lab(),p=record[0].slice(0,-1).map(d.local);
  // The inset runs up the stairwell. Leave air in front of its door and windows.
  for(const portion of [clip(p,0,slot[0],true),clip(band(p,0,...slot),1,back,true),clip(p,0,slot[1],false)])
    yield body(record,d,portion,record[1]+.08);
}

// Slender west roof blade with a true circular opening. Project its inside and
// outside loops on the same rays including the four corners, so nothing spans the hole.
function piercedRoof(d,end,height){
  const l=.9,r=end+3.7,n=-1.86,s=1.86,cx=6.5,rad=1.07,t=.29;
  const angles=[...Array.from({length:20},(_,i)=>i*Math.PI/10),...[[l,n],[r,n],[r,s],[l,s]].map(([a,b])=>(Math.atan2(b,a-cx)+2*Math.PI)%(2*Math.PI))].sort((a,b)=>a-b);
  const rim=angles.map(a=>{
    const x=Math.cos(a),z=Math.sin(a),dist=Math.min(Math.abs(x)<1e-8?Infinity:(x>0?r-cx:l-cx)/x,Math.abs(z)<1e-8?Infinity:(z>0?s:n)/z);
    return [[cx+x*dist,z*dist],[cx+x*rad,z*rad]];
  });
  for(let i=0;i<rim.length;i++){
    const [a,b]=rim[i],[c,e]=rim[(i+1)%rim.length],at=(p,y)=>[p[0],y,p[1]];
    for(const [y,normal,col] of [[height,1,chalk],[height-t,-1,'#c3bdaf']]){
      d.group([cx,y,0],[0,normal,0]);d.quad([at(a,y),at(c,y),at(e,y),at(b,y)],col);
    }
    d.group([b[0],height-t/2,b[1]]);d.face(b,e,height-t,height,stone);
  }
  for(const [a,b] of [[[l,n],[r,n]],[[r,n],[r,s]],[[r,s],[l,s]],[[l,s],[l,n]]]){
    d.group([(a[0]+b[0])/2,height-t/2,(a[1]+b[1])/2]);d.face(a,b,height-t,height,chalk);
  }
}

// Side windows follow each real setback. Do not span a change of wall plane.
function longFace(f,len,axis,top,math,south){
  const w=len/2;
  const along=t=>axis.local(f.world([t,0]))[0],a=along(-w),b=along(w);
  const limits=(math?[17.3,24.8,35,74.05,81.6]:[18.6,27.6,81.5,86.3])
    .filter(v=>v>Math.min(a,b)+.02&&v<Math.max(a,b)-.02).map(v=>-w+len*(v-a)/(b-a));
  const cuts=[-w,...limits.sort((x,y)=>x-y),w];
  for(let j=1;j<cuts.length;j++){
    const l=cuts[j-1],r=cuts[j],width=r-l,u=along((l+r)/2);
    const terrace=u<(math?17.3:18.6),yellow=math&&south&&u>=24.8&&u<35;
    const end=math?(u>=17.3&&u<24.8||u>=74.05):(u>=18.6&&u<27.6||u>=86.3);
    const col=yellow?'#d6c499':end?brick:terrace?chalk:!math&&south?'#b87862':'#d8d9d0';
    panel(f,l,r,.12,top,.045,col,end?'brick':'wall');
    if(width<1.55)continue;
    const floors=Math.max(2,Math.round(top/(math?3.18:3.55))),fh=top/floors;
    for(let k=0;k<floors;k++){
      const y=k*fh+.22;
      if(yellow){ // The ochre stair bay has one short strip, surrounded by wall.
        const mid=(l+r)/2,ww=Math.min(width*.47,4.1);
        panelWindow(f,mid-ww/2,mid+ww/2,y+1.30,y+2.08,.094,3);
      }else if(end){
        if(width>4.8)panelWindow(f,l+.13,l+Math.min(2.24,width*.32),y+.62,y+fh-.43,.086,2);
      }else{
        const count=Math.max(1,Math.round(width/(math?5.6:south?5.15:4.65))),pitch=width/count;
        const pier=terrace?.23:!math&&south?.62:.31;
        for(let i=0;i<count;i++)panelWindow(f,l+i*pitch+pier,r-(count-1-i)*pitch-pier,y+.67,y+fh-.54,.10,2);
        f.box(l,r,y+fh-.52,y+fh-.27,-.045,terrace?.52:math?.39:.25,chalk);
      }
    }
    if(!terrace&&(math||!south))panel(f,l,r,top-.69,top+.01,.125,brick,'brick');
  }
}
function college(record){
  const id=record[4],cfg=colleges[id],math=id===mathsId,axis=collegeFrame(cfg),parts=[];
  const sections=collegeSections(record);
  for(let i=0;i<sections.length;i++){
    const {p,top}=sections[i];
    for(const {d:f,len} of streetEdges(p)){
      const [u]=axis.local(f.world([0,0])),w=len/2;
      if(Math.abs(f.nz)>.89)longFace(f,len,axis,top,math,f.nz>0);
      else if(f.nx<-.9 && Math.abs(u-(cfg.ends[i-1]??0))<.15){
        const sill=i?sections[i-1].top:.12; // the terrace in front hides the lower floors
        if(top>sill+.75){
          panel(f,-w,w,sill,top,.055,chalk);
          const n=i?1:2,fh=(top-sill)/n;
          for(let k=0;k<n;k++)panelWindow(f,-w+.49,w-.49,sill+k*fh+.63,sill+(k+1)*fh-.46,.12,4);
          f.box(-w-.12,w+.12,top-.32,top+.03,-.18,.54,chalk);
        }
      }else if(f.nx>.9 && u>(math?86.3:96.25)){
        // Economics faces the eastern court with tall glass framed by two brick cheeks.
        const inset=math?1.26:.82, floors=math?5:6;
        panel(f,-w,w,.12,top,.054,brick,'brick');
        for(let k=0;k<floors;k++){
          const base=.2+k*(top-.22)/floors,hi=.2+(k+1)*(top-.22)/floors;
          panelWindow(f,-w+inset,w-inset,base+.14,hi-.26,.12,math?3:4);
          f.box(-w+inset-.08,w-inset+.08,hi-.27,hi-.08,-.02,.32,chalk);
        }
      }
      parts.push(...f.groups);
    }
    if(i>2)continue;
    // One shader panel per open side of a terrace; no individual baluster meshes.
    const end=cfg.ends[i],start=cfg.ends[i-1]??.13,hw=cfg.width/2-.17;
    for(const [a,b] of [[[start,-hw],[start,hw]],[[end,-hw],[start,-hw]],[[start,hw],[end,hw]]]){
      axis.group([(a[0]+b[0])/2,top+.48,(a[1]+b[1])/2]);axis.face(a,b,top+.04,top+.99,rail,'rail');
    }
  }
  const head=cfg.ends[2],roof=cfg.tops[3]+(math?3.05:3.65),hw=cfg.width/2;
  for(const sign of [-1,1]){
    const v=sign*(hw-.33);
    axis.box(head-2.1,head+4.3,cfg.tops[2]-.12,roof-.2,v-.22,v+.22,brick,'brick');
    axis.box(5.65,5.87,cfg.tops[0],roof-.28,sign*1.42-.10,sign*1.42+.10,'#9b9e97');
  }
  piercedRoof(axis,head,roof);
  if(math){
    // A single low, enclosed bridge crosses the lane, clear underneath.
    axis.box(12.85,16.1,3.95,7.18,-13.15,-3.64,brick,'brick');
    const [x,z]=axis.world([12.85,-8.39]),f=orientedFrame(x,z,-.968,-.25);
    panelWindow(f,-2.95,-1.05,4.92,6.40,.08,2);panelWindow(f,1.13,3.04,4.92,6.40,.08,2);
    parts.push(...f.groups);
  }
  return [...parts,...axis.groups];
}

function courtyardAnnex(record){
  const [p,,,,id]=record,link=id===econLink,h=link?7.38:id===mathAnnex?8.12:7.95,parts=[];
  for(const {d,len} of streetEdges(p)){
    const w=len/2;
    if(len<1)continue;
    if(link){
      if(len>4)for(const k of [-1,1])panelWindow(d,k*w*.51-.65,k*w*.51+.65,4.94,6.48,.07,2);
    }else{
      // In the west street views the low block beside each wing has tall lower
      // glazing and a much shorter strip above a broad, continuous red wall.
      const count=Math.max(1,Math.round(len/5.1)),pitch=len/count;
      panel(d,-w,w,.11,4.08,.05,chalk);
      for(let i=0;i<count;i++){
        const mid=-w+(i+.5)*pitch,hw=pitch*.43;
        panelWindow(d,mid-hw,mid+hw,1.01,3.88,.09,3);
        panelWindow(d,mid-hw,mid+hw,h-1.36,h-.62,.085,2);
      }
      panel(d,-w,w,4.08,h-1.42,.06,brick,'brick');
    }
    d.box(-w,w,h-.31,h+.05,-.15,.34,chalk);parts.push(...d.groups);
  }
  return parts;
}

function lifeWing(record){
  const d=lab(),[l,r]=slot,h=record[1]+.08,left=341.8-351.65,right=418-351.65;
  panel(d,left,l,.12,h,.047,'#d7cfbc'); // Broad blank corner next to the door.
  panel(d,r,right,.12,h,.047,'#d6cfbc');
  panel(d,left,l,.12,1.47,.085,stone);panel(d,r,right,.12,1.47,.085,stone);
  const fh=h/5, count=13, pitch=(right-r)/count;
  for(let k=0;k<5;k++){
    const y=k*fh;
    if(k===0){
      panel(d,l,r,1.49,3.58,back+.06,'#c3baa7');
      panelWindow(d,-.54,1.48,1.5,3.42,back+.10,2);
    }else panelWindow(d,l+.83,r-.28,y+.50,y+fh-.55,back+.09,3);
    d.box(l-.08,r+.08,y+fh-.38,y+fh,back-.04,.17,'#ded5c2');
    for(let i=0;i<count;i++){
      const mid=r+(i+.5)*pitch,half=i%3===2?1.08:1.43;
      panelWindow(d,mid-half,mid+half,y+1.02,y+fh-.72,.105,i%3===2?2:3);
      if(k>0&&k<4&&i%3===1){
        d.box(mid-.75,mid+.68,y+.39,y+.61,.03,.71,'#ddd9c8');
        panel(d,mid-.52,mid+.39,y+.62,y+1.15,.47,'#b6b6ac','wall',1);
      }
    }
  }
  for(let i=0;i<stairs.length;i++)d.box(l-.14+i*.035,r+.14-i*.035,stairs[i]-.16,stairs[i],back+.01,noses[i],stone);
  return d.groups;
}
export function lifeStepHeight(x,z){
  if(x<351.65+slot[0]||x>351.65+slot[1]||z< -495.5+back||z> -495.5+noses[0])return;
  for(let i=stairs.length-1;i>=0;i--)if(z<=-495.5+noses[i])return stairs[i];
}

function huayuan(record){
  // The street cameras look into the dorms/shops in front. Only the roof
  // divisions are legible in the 18-level satellite image; do not infer doors.
  const d=orientedFrame(154.8,463.4,0,1),top=record[1]+.08;
  for(const {d:f,len} of streetEdges(record[0])){
    f.box(-len/2,len/2,top-.12,top+.36,-.23,.08,'#c8c4b7');
    panel(f,-len/2,len/2,.15,1.19,.045,'#aaa79a');d.groups.push(...f.groups);
  }
  d.box(-16.9,7.2,top+.01,top+.44,-6.3,19.65,'#666b61');
  d.box(8,19.6,top+.01,top+.24,-19.6,19.7,'#a39f91');
  d.box(-10.1,3.7,top+.02,top+.79,-18.9,-11.65,'#bec5bd');
  d.box(-9.73,3.35,top+.78,top+.90,-18.6,-11.95,'#9eafb1');
  d.box(-16.3,6.8,top+.44,top+.61,-6.1,-3.47,'#8e9385');
  return d.groups;
}
export function landmarkModels(record){
  if([econLink,econAnnex,mathAnnex].includes(record[4]))return courtyardAnnex(record);
  if(colleges[record[4]])return college(record);
  if(record[4]===lifeId)return lifeWing(record);
  return record[4]===huayuanId?huayuan(record):[];
}
export function landmarkGround(data,{surfaces,forecourts}){
  const ids=new Set(data.building.map(r=>r[4]));
  const pave=(d,ring,col)=>{
    const p=ring.map(d.world);surfaces.push([p,.79,col]);forecourts.push(p);
  };
  if(ids.has(lifeId)){
    const d=lab();
    pave(d,[[-5.3,0],[3.6,0],[7.8,8.9],[7.5,10.4],[-8,10.4],[-9.1,7.9]],'#c4b7a5');
  }
  for(const id of [economicsId,mathsId])if(ids.has(id)){
    const d=collegeFrame(colleges[id]),sgn=id===economicsId?1:-1;
    pave(d,[[-28,5.2],[-12,5.5],[19,5.1],[19,11.8],[-13,11.8],[-28,12.8]].map(([u,v])=>[u,v*sgn]),'#c1b7a7');
    if(id===economicsId)pave(d,[[97,-2.8],[100,-3.4],[130,-2.7],[130,1.2],[100,1.8],[97,1.7]],'#c4b9a6');
  }
}
export function landmarkEdge(id,e){
  // On the lab's undocumented rear and east walls retain the simple original elevations.
  if(id===lifeId)return e.az>=-498.1 && (e.nz>.9||Math.abs(e.ax-351.65)<3);
  return Boolean(landmarkColors[id]);
}
