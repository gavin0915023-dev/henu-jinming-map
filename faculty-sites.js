import {orientedFrame as frame,clip,panel,panelWindow} from './survey-mesh.js';
import {courtColors,courtModels,courtSigns,courtGround,courtHeights,courtEdge} from './college-courts.js';
import {roundModels,roundColors,roundSigns,officeId,officeHeight,roundGround} from './round-buildings.js';
import {publicModels,publicGround,squareHeight,hasMarco,hasNorth,northSign} from './campus-commons.js';

// Ground coordinates follow the footprint data. In each survey frame u runs
// horizontally to the viewer's right, and positive v points out of the facade.
export const pharmacyId='716761664',civilId='712688937',zengId='712688948',dormId='712688830',clinicId='716822582';
const wings=['712688938','712688939'],nextDorm='712735067';
export const facultyColors={
  ...courtColors,...roundColors,
  [pharmacyId]:['#d9d3bb','#b8b6a7'],[civilId]:['#ac6955','#b6ada0'],
  [wings[0]]:['#a05f50','#a99d92'],[wings[1]]:['#a2604d','#a99d92'],
  [zengId]:['#e0dfd2','#c8c7b9'],[dormId]:['#e1dfd3','#c3c2b4'],[nextDorm]:['#dcdcd3','#bfbfb3'],
  [clinicId]:['#c1b8aa','#b5b3a8']
};
const pharmacy=()=>frame(-178.2,-494.2,0,1),civil=()=>frame(-138.7,280.6,.982,.189);
const zeng=()=>frame(-361.3,344.6,-.591,.807),clinic=()=>frame(-459.18,604,-1,0);
export const siteLettering=[
  ...courtSigns,...roundSigns,
  {id:pharmacyId,text:'药学院',point:pharmacy().at([11.9,10.1,.22]),yaw:0,width:1.42,height:6.7,color:'#b18c44'},
  {id:clinicId,text:'河南大学医院',point:clinic().at([-8.8,10.8,1.68]),yaw:-Math.PI/2,width:1.04,height:8.5,color:'#b53231'}
];
export function visibleSigns(data){
  const ids=new Set(data.building.map(r=>r[4]));
  return [...siteLettering.filter(s=>ids.has(s.id)),...(hasNorth(data)?[northSign]:[])];
}
const cream='#dedbc9',white='#e3e2d7',stone='#beb6a8',steel='#bbc5c1',blue='#4e7488',glass='#496473',brick='#a45c48';
const oval=(ru,rv,count=36)=>Array.from({length:count},(_,i)=>[ru*Math.cos(i*2*Math.PI/count),rv*Math.sin(i*2*Math.PI/count)]);
const rect=(l,r,n,s)=>[[l,n],[r,n],[r,s],[l,s]];
const close=p=>[...p,p[0]];
function prism(d,p,lo,hi,side,cap=side,kind='wall'){
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    if(!len)continue;
    d.group([(a[0]+b[0])/2,(lo+hi)/2,(a[1]+b[1])/2],[dz/len,0,-dx/len]);d.face(a,b,lo,hi,side,kind);
  }
  for(const [y,normal] of [[hi,1],[lo,-1]]){
    const c=p.reduce((o,a)=>[o[0]+a[0]/p.length,o[1]+a[1]/p.length],[0,0]);
    d.group([c[0],y,c[1]],[0,normal,0]);
    for(let i=0;i<p.length;i++){
      const a=p[i],b=p[(i+1)%p.length],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      d.quad([[c[0],y,c[1]],[a[0],y,a[1]],[mid[0],y,mid[1]],[b[0],y,b[1]]],cap);
    }
  }
}
function strip(d,l,r,lo,hi,v,n,col=glass){
  panel(d,l,r,lo,hi,v,col,'glass');
  for(let i=0;i<=n;i++){const u=l+(r-l)*i/n;panel(d,u-.042,u+.042,lo,hi,v+.035,steel,'wall',1);}
}
function circlePost(d,u,v,r,lo,hi){
  prism(d,oval(r,r,10).map(([x,z])=>[x+u,z+v]),lo,hi,'#d7d6c8');
}
function edgeFrame(e){
  return frame(e.ax+e.tx*e.length/2,e.az+e.tz*e.length/2,e.nx,e.nz);
}
export function facultyEdge(id,e){
  if(roundColors[id])return true;
  if(courtColors[id])return courtEdge(id,e);
  if(id===pharmacyId)return e.nz>.98&&e.length>90;
  if(id===zengId)return e.nx*(-.591)+e.nz*.807>.94;
  if(id===clinicId)return e.nx<-.98&&e.length>20;
  if(id===dormId)return e.length>4.7;
  if(id===nextDorm)return e.length>10&&(e.nx<-.45||e.nz<-.88);
  if(wings.includes(id))return e.length>3.8;
  return id===civilId;
}
function edges(ring){
  const area=ring.slice(1).reduce((s,b,i)=>s+ring[i][0]*b[1]-b[0]*ring[i][1],0);
  return ring.slice(1).flatMap((b,i)=>{
    const [ax,az]=ring[i],length=Math.hypot(b[0]-ax,b[1]-az);if(!length)return [];
    const tx=(b[0]-ax)/length,tz=(b[1]-az)/length;
    return [{ax,az,tx,tz,nx:tz*Math.sign(area),nz:-tx*Math.sign(area),length}];
  });
}

function pharmacyFront(){
  const d=pharmacy();
  panel(d,.03,119.04,.10,20.08,.042,'#d9d2bc');
  // The gold name is on the blank end wall, not on the glass entrance next to it.
  d.box(.02,15.9,20.04,22.1,-.84,.22,cream);
  for(const y of [2.2,5.8,9.4,13,16.7,20.25])panelWindow(d,2.4,3.25,y,y+1.42,.095,1);
  for(let y=2;y<20;y+=3.75){panel(d,14.1,15.35,y,y+.48,.10,'#bdbaa9');}
  strip(d,16.2,31.8,.6,12.1,.16,8);
  for(let u=16.2;u<=32;u+=5.14)d.box(u-.26,u+.26,.35,12.2,.18,1.06,white);
  for(const y of [3.65,7.5,11.7])panel(d,16.1,31.9,y,y+.16,.245,cream);
  for(const [l,r,b] of [[16.05,31.9,13.1],[32.0,118.85,1.4]]){
    for(let y=b;y<19.9;y+=3.75){
      for(let u=l;u<r-.7;u+=9.45){const e=Math.min(u+8.65,r-.16);if(e>u+.4)strip(d,u+.13,e,y,Math.min(y+1.85,19.75),.13,Math.max(2,Math.round((e-u)/1.42)));}
      d.box(l,r,y-.27,y-.11,.08,.82,'#dcd6c4','wall',1);
    }
  }
  d.box(15.9,119.05,20.03,20.37,-.3,.47,cream);
  for(let u=16.1;u<119.1;u+=8.55)d.box(u-.19,u+.19,20.28,22.5,-.55,.02,white);
  d.box(16.0,119.05,22.38,23.0,-.65,.22,cream);
  for(let i=0;i<3;i++)d.box(18.2+i*.12,30.2-i*.12,.86+i*.15,1.01+i*.15,.4,2.65-i*.55,'#c7c0b0');
  // Sculpted diamond stone seen from both the court and its western approach.
  d.box(14.1,18.4,1.02,1.49,20.45,21.85,'#a99a83');
  const outline=[[14,3.15],[16.05,5.24],[18.54,3.54],[18.46,2.83],[16.56,1.32],[15.97,1.4]];
  d.group([16.2,3.2,21.5]);for(let i=0;i<outline.length;i++){
    const [a,b]=outline[i],[c,e]=outline[(i+1)%outline.length];
    d.quad([[a,b,21.1],[c,e,21.1],[c,e,21.89],[a,b,21.89]],'#b9a98f');
    d.quad([[16.26,3.23,21.91],[a,b,21.89],[(a+c)/2,(b+e)/2,21.89],[c,e,21.89]],'#d2c7af');
  }
  const mark=oval(.43,.43,16);d.group([16.26,3.43,21.95],[0,0,1]);
  for(let i=0;i<mark.length;i++){
    const [a,b]=mark[i],[c,e]=mark[(i+1)%mark.length];
    d.quad([[16.26+a,3.43+b,21.95],[16.26+c,3.43+e,21.95],[16.26+.62*c,3.43+.62*e,21.95],[16.26+.62*a,3.43+.62*b,21.95]],'#618576');
  }
  return d.groups;
}

const postOffsets=Array.from({length:8},(_,i)=>{const a=2*Math.PI*(i+.5)/8;return [6.25*Math.cos(a),8.8*Math.sin(a)];});
function civilCourt(){
  const d=civil();
  for(let i=0;i<5;i++)prism(d,oval(8.85-i*.25,12.7-i*.36),.78+i*.15,.94+i*.15,'#a69a87','#c1b29a');
  for(const [u,v] of postOffsets)circlePost(d,u,v,.46,1.50,6.28);
  // The brick band is an annulus, with a central opening to the sky.
  for(const [lo,hi,ru,rv,ir,iv,c,k] of [[6.14,6.46,7.75,11.3,5.9,8.5,'#b3a491','wall'],
    [6.46,8.24,7.6,11.15,6.05,8.58,brick,'brick'],[8.24,8.56,7.69,11.26,6.05,8.58,'#514b42','wall'],
    [8.56,8.84,7.88,11.45,6,8.56,'#b99a81','wall']]){
    const a=oval(ru,rv),b=oval(ir,iv);
    for(let j=0;j<a.length;j++){
      const q=(j+1)%a.length,to=(p,y)=>[p[0],y,p[1]],u=(a[j][0]+a[q][0])/2,v=(a[j][1]+a[q][1])/2;
      d.group([u,(hi+lo)/2,v]);d.face(a[j],a[q],lo,hi,c,k);d.face(b[q],b[j],lo,hi,c,k);
      d.quad([to(a[j],hi),to(a[q],hi),to(b[q],hi),to(b[j],hi)],c);
      d.quad([to(b[j],lo),to(b[q],lo),to(a[q],lo),to(a[j],lo)],'#a49583');
    }
  }
  d.box(-20.6,18.4,14.4,14.84,-6.7,-3.10,'#a49a8c');d.box(-20.6,18.4,17.14,17.42,-6.85,-2.96,'#b9b4a9');
  strip(d,-20.55,18.35,14.85,17.14,-3.14,23,'#567b87');
  panel(d,-20.55,18.35,15.42,15.51,-3.08,steel);
  d.box(-20.55,18.35,14.86,17.1,-6.65,-6.55,'#5b7882','glass');
  return d.groups;
}
function civilWing(e,h){
  const d=edgeFrame(e),w=e.length/2;
  panel(d,-w,w,.10,h+.075,.032,brick,'brick');
  if(e.nx>.8){
    if(e.length>5.4){
      strip(d,-w*.31,-w*.31+.98,1.42,h-.75,.09,1,'#69818a');
      for(let y=2.4;y<h;y+=3.35)panel(d,-w*.31-.11,-w*.31+1.09,y,y+.42,.14,cream);
    }
    d.box(-w,-w+.32,h-.15,h+.85,-.46,.21,brick,'brick');
  }else if(e.length>11){
    const bays=Math.max(1,Math.floor((e.length-.7)/6.6)),step=(e.length-1.8)/bays;
    for(let j=0;j<bays;j++){const u=-w+.9+step*(j+.5);
      for(let y=2.0;y<h-.6;y+=3.55)panelWindow(d,u-1.44,u+1.44,y,Math.min(y+1.53,h-.17),.086,2);
    }
    d.box(-w,w,h-.55,h-.26,-.08,.32,'#b39079');
  }
  return d.groups;
}

const zSections=[[-4.45,0,1.62],[0,33.35,0],[33.35,48.22,2.76],[48.22,69.12,.04],[69.12,84.15,2.66],[84.15,117.2,.06],[117.2,121.9,2.12]];
const zColumns=[35.4,45.2,54.7,65.1,72.6,82.2,92.1,102.4,113.1];
function zengFront(){
  const d=zeng();
  for(const [l,r,offset] of zSections){
    const v=offset+.17,short=r-l<6,band=offset>2&&!short,open=l>=33&&l<117;
    panel(d,l,r,open?4.28:.13,23.08,v,short?'#c4c9c7':white);
    if(short){for(let y=1.8;y<22;y+=3.82)panelWindow(d,l+.94,l+1.68,y,y+1.37,v+.07,1);continue;}
    if(open){panel(d,l,r,.22,4.19,-3.85,'#8d9188');panel(d,l,r,1.18,3.46,-3.78,'#607276','glass');}
    const n=Math.ceil((r-l)/6.2);
    for(let i=0;i<n;i++){
      const a=l+(r-l)*i/n,b=l+(r-l)*(i+1)/n;
      for(let j=open?1:0;j<6;j++){
        const y=.70+j*3.73;
        panel(d,a+.22,b-.22,y-.25,y+2.91,v+.037,band?'#bd7665':'#b5bfc0');
        strip(d,a+.55,b-.54,y+.52,y+2.05,v+.08,band?3:4,band?'#5f7278':'#5e737a');
        panel(d,a+.25,b-.25,y+2.12,y+2.28,v+.13,white);
      }
      if(i===0||i===n-1)d.box(a+.01,a+.25,open?4.22:.58,23.45,v-.3,v+.4,white);
    }
    for(let y=4.12;y<23.4;y+=3.73)d.box(l,r,y,y+.25,v-.06,v+.46,white);
  }
  for(const u of zColumns)d.box(u-.30,u+.30,.44,4.31,-.42,.27,white);
  return d.groups;
}

function dormFacade(e,h){
  const d=edgeFrame(e),w=e.length/2;
  panel(d,-w,w,.12,h+.075,.045,'#e0ded2');
  if(e.length<8.5)return d.groups;
  const end=e.length<23, floors=Math.round(h/3.45),fh=h/floors;
  // Two tall exterior bays punctuate the otherwise blank short end. Longer
  // wings have repeated sheltered balconies, not a flat grid of dorm windows.
  const n=end?(e.length>13?3:2):Math.max(3,Math.round(e.length/3.75)),step=e.length/n;
  for(let i=0;i<n;i++){
    const u=-w+step*(i+.5),bal=end?i===0:i%3===1,width=end?Math.min(1.81,step*.46):step*(bal?.81:.56);
    for(let j=0;j<floors;j++){
      const y=.36+j*fh;
      if(bal){
        panel(d,u-width/2,u+width/2,y+.32,y+fh-.24,.094,'#686b62');
        panel(d,u-width*.31,u+width*.30,y+.39,y+fh-.43,.14,'#4d5d60','glass');
        d.box(u-width/2-.06,u+width/2+.06,y+.13,y+.33,.08,.71,'#cfcfc2','wall',1);
        panel(d,u-width/2,u+width/2,y+.35,y+.67,.71,'#b4b3a3');
        for(let k=0;k<=5;k++){const x=u-width/2+width*k/5;panel(d,x-.021,x+.021,y+.67,y+1.29,.72,'#8e9287','wall',1);}
        panel(d,u-width/2,u+width/2,y+1.24,y+1.32,.73,steel,'wall',1);
      }else panelWindow(d,u-width/2,u+width/2,y+.77,y+fh-.47,.10,2);
    }
  }
  d.box(-w,w,h-.14,h+.22,-.20,.28,white);
  return d.groups;
}

function clinicFront(){
  const d=clinic();
  for(const [l,r] of [[-11.35,-5.55],[6.25,12.65]]){
    d.box(l,r,4.55,18.12,-.30,1.49,stone);
    panel(d,l+.35,r-.32,4.93,17.45,1.54,'#3b6d8f','glass');
    for(let u=l+.42;u<r-.2;u+=1.38)panel(d,u-.031,u+.031,4.95,17.45,1.58,'#708492','wall',1);
    for(let y=5.0;y<17.5;y+=1.58)panel(d,l+.36,r-.32,y,y+.059,1.58,'#6c8590','wall',1);
    circlePost(d,(l+r)/2,.80,.27,1.05,4.6);
    const w=(r-l)*.38,u=(r+l)/2;panelWindow(d,u-w,u+w,1.62,3.71,.18,4);
    for(let t=u-w;t<=u+w;t+=.27)panel(d,t,t+.028,1.62,3.71,.27,'#a7aba0','wall',1);
    panel(d,u-w,u+w,2.14,2.18,.27,'#aaafa4','wall',1);
  }
  const l=-5.55,r=6.25;
  d.box(l,r,11.5,11.94,-3.8,-.8,'#969587');
  strip(d,l,r,11.92,14.32,-.85,9,'#5a7984');
  panel(d,l,r,13.89,13.99,-.80,'#8b9b9f');d.box(l,r,14.31,14.64,-3.8,-.66,'#b9b5aa');
  strip(d,-6.98,7.94,1.26,4.07,-4.91,11,'#546b6d');
  for(let u=-5.05;u<6.4;u+=3.7){panelWindow(d,u,u+2.96,1.28,3.55,-4.82,2);}
  d.box(-9.7,10.0,4.12,4.48,-5.0,1.5,stone);
  // A folded glass roof with two sloping planes and a white lattice underneath.
  const a=-4.85,b=5.32,m=(a+b)/2,roof=(u,v)=>4.59+(1-Math.abs(u-m)/((b-a)/2))*1.53+(v+1)*.055;
  for(const [i,j] of [[a,m],[m,b]]){
    d.group([(i+j)/2,5.85,2.3]);
    d.quad([[i,roof(i,-1),-1],[j,roof(j,-1),-1],[j,roof(j,5.35),5.35],[i,roof(i,5.35),5.35]],'#b3caca','canopy');
    for(let k=0;k<=5;k++){const u=i+(j-i)*k/5;d.bar([u,roof(u,-1)+.035,-1],[u,roof(u,5.35)+.035,5.35],.043,'#dce3d6',1);}
    for(const v of [-.94,1.15,3.25,5.35])d.bar([i,roof(i,v)+.04,v],[j,roof(j,v)+.04,v],.055,white);
    for(let k=0;k<4;k++){const u=i+(j-i)*k/4,t=i+(j-i)*(k+1)/4;
      d.bar([u,roof(u,5.32)-.12,5.32],[t,4.64,5.32],.035,white);
      for(const v of [-.95,1.14,3.23])d.bar([u,roof(u,v)-.042,v],[t,roof(t,v+2.09)-.042,v+2.09],.022,'#cdd4cb');}
  }
  d.group([m,4.66,5.32]);d.bar([a,4.64,5.32],[b,4.64,5.32],.094,white);
  for(const u of [a+.34,b-.34])circlePost(d,u,4.38,.235,1.55,4.93);
  for(let i=0;i<5;i++)d.box(-4.65,5.75,.84+i*.15,1.0+i*.15,-4.85,6.5-i*.46,'#c1b9a9');
  for(const [i,j] of [[-8.95,-5.12],[6.14,9.10]])d.box(i,j,.83,1.51,1.65,5.38,stone);
  return d.groups;
}

export function facultyModels(data){
  const all=[...courtModels(data),...roundModels(data.building),...publicModels(data)];
  for(const [p,h,,,id] of data.building){
    if(!facultyColors[id]||courtColors[id]||roundColors[id])continue;
    if(id===pharmacyId)all.push(...pharmacyFront());
    else if(id===civilId)all.push(...civilCourt());
    else if(id===zengId)all.push(...zengFront());
    else if(id===clinicId)all.push(...clinicFront());
    else for(const e of edges(p))if(facultyEdge(id,e))all.push(...(wings.includes(id)?civilWing(e,h):dormFacade(e,h)));
  }
  return all;
}
export function* facultySolids(record){
  const [p,h,,,id]=record;
  if(id===civilId){
    const d=civil();
    for(const [u,v] of postOffsets)yield {record,custom:true,base:1.45,top:6.3,p:close(oval(.46,.46,10).map(([x,z])=>d.world([x+u,z+v])))};
    yield {record,custom:true,base:14.4,top:17.42,p:close(rect(-20.6,18.4,-6.85,-2.96).map(d.world))};
    return;
  }
  const d=id===zengId?zeng():clinic(),ring=p.slice(0,-1).map(d.local);
  const add=(points,base,top,custom=false)=>({p:close(points.map(d.world)),base,top,record,custom});
  const cuts=id===zengId?[-1000,33.35,117.2,1000]:[-1000,-5.55,6.25,1000];
  for(let i=0;i<3;i++){
    const segment=clip(clip(ring,0,cuts[i],false),0,cuts[i+1],true);
    if(segment.length<3)continue;
    if(i!==1){yield add(segment,.08,h+.08);continue;}
    const at=id===zengId?-4:-5.05,rear=clip(segment,1,at,true),front=clip(segment,1,at,false);
    if(rear.length>=3)yield add(rear,.08,h+.08);
    if(id===zengId&&front.length>=3)yield add(front,4.28,h+.08);
  }
  if(id===zengId)for(const u of zColumns)yield add(rect(u-.30,u+.30,-.42,.27),.44,4.31,true);
}
export function facultyGround(data,{surfaces,forecourts,shrubs},tree){
  courtGround(data,{surfaces,forecourts,shrubs},tree);
  publicGround(data,{surfaces,forecourts,shrubs},tree);roundGround(data,{surfaces,forecourts,shrubs});
  const has=id=>data.building.some(r=>r[4]===id);
  const court=(d,p,h,c)=>{const q=p.map(d.world);surfaces.push([q,h,c]);forecourts.push(q);};
  if(has(pharmacyId)){
    const d=pharmacy();court(d,[[-8,-.1],[68,-.1],[66,35],[43,44],[-6,44]],.86,'#c4b7a5');
    const island=oval(9.2,4.65).map(([u,v])=>[u+16.3,v+21]);court(d,island,1.01,'#78845d');
    for(let j=0;j<28;j++){const a=j*Math.PI/14,[x,z]=d.world([16.3+8.2*Math.cos(a),21+3.76*Math.sin(a)]);shrubs.push([x,z,1.05,.69,.92,.53,j%5?'#62764d':'#88594b',.84]);}
  }
  if(has(civilId)){
    const d=civil();court(d,[[-16,-12],[15,-12],[15,16],[9,23],[-9,23],[-16,16]],.79,'#baae9c');
    for(const u of [-11.3,10.9])for(const v of [3,5.4,7.8,10.2]){
      const [x,z]=d.world([u,v]);shrubs.push([x,z,1.48,1.56,1.38,.51,'#526b43',.68]);}
    for(const [u,v,h] of [[9.9,9.2,6.3],[-10.8,8.4,6.0],[12.8,2.7,6.8],[-12.6,-1.5,6.3]]){
      const [x,z]=d.world([u,v]);tree(x,z,h,'shade',false,'open');}
  }
  if(has(clinicId)){
    const d=clinic();court(d,rect(-12,14,-.1,12),.82,'#c8b9a7');
    for(const u of [-8.25,-6.9,7.0,8.25]){const [x,z]=d.world([u,3.55]);shrubs.push([x,z,.8,.49,1.38,.40,'#78845b',1.48]);}
  }
  if(has(zengId)&&has(dormId)){
    // The main lane bends between 17 and 16; keep the white front and actual
    // roadway visible, placing trees inside the planting strips on either side.
    const d=zeng();court(d,[[31,2.9],[118,3],[115,25],[31,24]],.80,'#c8b9a7');
    const plaza=[[-354.3,417.4],[-344,392],[-335,378],[-316,380],[-294,398],[-309,421],[-326,430],[-338,427],[-348,422]];
    surfaces.push([plaza,.83,'#c8b9a7']);forecourts.push(plaza);
    const verge=[[-355.2,415.4],[-358.3,406.0],[-359.3,398.9],[-358.1,392.4],[-353.7,382.1],[-345,371.4],[-337.8,376.9],[-345.8,391.9],[-351.4,407.1]];
    surfaces.push([verge,.841,'#78845d']);forecourts.push(verge);
    for(let i=0;i<verge.length;i++){
      const a=verge[i],b=verge[(i+1)%verge.length],n=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/1.45);
      for(let j=0;j<n;j++){const t=j/n;shrubs.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,.88,.73,.83,.47,'#607744',.67]);}
    }
    for(const [x,z,h] of [[-355.1,405.5,6.2],[-352.7,397,6.8],[-349.2,388.9,7.1],[-345.2,380.7,6.9]])
      tree(x,z,h,'vase',true,'open');
    for(const shift of [0,.26])surfaces.push([[[-352.5+shift,418.1],[-334.2+shift,379.4],[-334.05+shift,379.47],[-352.35+shift,418.17]],.858,'#bfa671']);
    for(const [x,z,h] of [[-365,423,6.4],[-371,431,6.8],[-378,439,7.1],[-386,448,7.4],[-348,432,7],[-340,443,6.7],[-356,391,7.4],[-347,394,6.6]])
      tree(x,z,h,'vase',true,'open');
    for(let i=0;i<28;i++){
      const x=-365.8-i*.86,z=426.3+i*1.09;shrubs.push([x,z,1.0,1.00,1.02,.5,'#64794d',.34]);
    }
  }
}

// Sample the same steps the visitor sees, without testing every campus feature
// on every walking frame. The dimensions below match their drawn treads.
export function facultyHeights(data){
  const ids=new Set(data.building.map(r=>r[4])),c=civil(),h=clinic(),p=pharmacy(),courts=courtHeights(ids),square=hasMarco(data);
  return (x,z)=>{
    if(ids.has(civilId)&&x>-152&&x<-125&&z>268&&z<293){
      const [u,v]=c.local([x,z]);
      for(let i=4;i>=0;i--)if((u/(8.85-i*.25))**2+(v/(12.7-i*.36))**2<=1)return .94+i*.15;
    }
    if(ids.has(clinicId)&&x>-466&&x<-454&&z>599&&z<610){
      const [u,v]=h.local([x,z]);
      if(u>=-4.65&&u<=5.75&&v>=-4.85)for(let i=4;i>=0;i--)if(v<=6.5-i*.46)return 1+i*.15;
    }
    if(ids.has(pharmacyId)&&x>-161&&x<-147&&z>-494&&z<-491.4){
      const [u,v]=p.local([x,z]);
      for(let i=2;i>=0;i--)if(u>=18.2+i*.12&&u<=30.2-i*.12&&v>=.4&&v<=2.65-i*.55)return 1.01+i*.15;
    }
    return (square?squareHeight(x,z):undefined)??(ids.has(officeId)?officeHeight(x,z):undefined)??courts(x,z);
  };
}
