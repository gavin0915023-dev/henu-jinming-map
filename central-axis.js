import { frame, patch, clip, panel, panelWindow } from './survey-mesh.js';

const library={x:-101.0,z:-73.0,out:1},teaching={x:93.05,z:-73.8,out:-1};
export const libraryId='plan-library', teachingFrontId='712688928';
export const rearCourt=patch(library,-19.1,19.25,1.0,34.6);
const grey='#c9c8c0',joint='#9f9f99',stone='#d5d3ca',glass='#536671';
// Reduce only the middle of the east entrance. The two tall outer wings
// and the entire west entrance retain the source height and plan.
export function* librarySolids(record){
  const p=record[0].slice(0,-1),top=record[1]+.08;
  const body=function*(ring,base,h,custom=false){if(ring.length>2)yield {record,p:[...ring,ring[0]],base,top:h,custom};};
  for(const [lo,hi] of [[-200,-92],[-92,-53],[-53,20]]){
    const row=clip(clip(p,1,lo,false),1,hi,true);
    if(lo!==-92){yield* body(row,.08,top);continue;}
    yield* body(clip(row,0,-141,true),.08,top);
    yield* body(clip(clip(row,0,-141,false),0,-115,true),.08,20.05);
    yield* body(clip(clip(row,0,-115,false),0,-101,true),.08,12.21);
  }
  for(const [l,r] of [[-38,-20],[19,39]]){
    yield* body(patch(library,l,r,-5,9.5),.08,19.9,true);
  }
  for(const u of [-13,-4.65,4.65,13])yield* body(patch(library,u-.25,u+.25,2.99,3.51),.90,13.72,true);
}
export const axisCustomEdge=(id,e)=>id===libraryId?e.ax>-115.3&&e.ax+e.tx*e.length>-115.3:
  id===teachingFrontId&&e.nx<-.85;

function rear(){
  const d=frame(library),{box,group,quad}=d;
  // Limestone joints, isolated recessed window pairs and narrow corner lights.
  function clad(l,r,lo,hi,v){
    group([(l+r)/2,(hi+lo)/2,v],[0,0,1]);
    const rect=(a,b,c,e,y,color)=>quad([[a,c,y],[b,c,y],[b,e,y],[a,e,y]],color);
    rect(l,r,lo,hi,v,grey);
    for(let y=lo+1.12;y<hi;y+=1.12)rect(l,r,y-.014,y+.014,v+.025,joint);
    for(let row=0,y=lo;y<hi;row++,y+=1.12)for(let x=l+(row%2?1:1.99);x<r;x+=1.99)
      rect(x-.014,x+.014,y,Math.min(hi,y+1.12),v+.028,joint);
  }
  function wing(l,r,v,h,rows,cols){
    const pitch=(r-l)/cols;
    for(let i=0;i<cols;i++){
      const a=l+i*pitch;clad(a,a+pitch,.09,h,v);
      for(let k=0;k<rows;k++){
        const y=1.68+k*(h-2.3)/rows,w=i===0?.84:pitch*.55;
        panelWindow(d,a+pitch*.45-w/2,a+pitch*.45+w/2,y,y+1.94,v+.055,i===0?1:2);
      }
    }
  }
  for(const [l,r] of [[-38,-20],[19,39]]){
    box(l,r,.09,19.9,-5,9.5,grey);wing(l,r,9.54,19.90,5,5);
    // Post-and-window return facing the courtyard.
    const u=l<0?r:l,dir=l<0?1:-1;
    for(let k=0;k<5;k++)for(let j=0;j<3;j++){
      const b=1.7+k*3.63,n=-3.9+j*4.1;group([u+dir*.05,b+1,n+1],[dir,0,0]);
      quad([[u+dir*.07,b,n],[u+dir*.07,b+1.95,n],[u+dir*.07,b+1.95,n+1.8],[u+dir*.07,b,n+1.8]],glass,'glass');
    }
  }
  wing(-62,-40,16.04,33.09,8,5);wing(40,62,16.04,33.09,8,5);
  wing(-40,-20,-3.95,33.1,8,5);wing(19,40,-3.95,33.1,8,5);
  // The tall inner walls of the flanking wings look into the recess.
  for(const [u,dir] of [[-20,1],[19,-1]])for(let j=0;j<7;j++){
    const n=-39.8+j*5.05,s=n+5.05,low=n< -14?20.06:12.23,wall=u+dir*.039;
    group([wall,(33.08+low)/2,(n+s)/2],[dir,0,0]);
    const side=(a,b,y,h,x,c,k='wall')=>quad([[x,y,a],[x,h,a],[x,h,b],[x,y,b]],c,k);
    side(n,s,low,33.08,wall,grey);
    for(let y=low+.87;y<33;y+=1.20)side(n,s,y,y+.025,wall+dir*.021,joint);
    for(let y=15.2;y<32;y+=3.71)if(y>low){
      side(n+.9,n+3.28,y,y+1.71,wall+dir*.052,glass,'glass');
      side(n+2.1,n+2.17,y,y+1.71,wall+dir*.082,stone);
    }
  }
  clad(-20,19,12.18,20.07,-13.96);
  panel(d,-19.6,18.6,18.38,19.32,-13.91,'#879297','glass');
  clad(-20,19,20.08,33.1,-39.96);
  panel(d,-19.8,18.8,30.75,32.03,-39.91,'#819099','glass');
  // Taller reading-room blocks are behind the low vestibule. A thin canopy
  // stands clear of it, leaving the upper strip open to the courtyard.
  clad(-20,19,.1,11.88,.05);
  for(const [l,r] of [[-19.8,-8.3],[8.3,18.9]]){
    panel(d,l,r,1.1,5.0,.12,glass,'glass');
    for(let u=l+.45;u<r;u+=1.5)panel(d,u,u+.055,1.1,5.0,.18,'#89969a');
    for(let u=l+1.0;u<r-1;u+=2.25)panelWindow(d,u,u+.94,6.24,9.63,.13,1);
  }
  panel(d,-8.25,8.25,1.25,5.27,.11,'#465966','glass');
  panel(d,-4.42,4.42,1.33,4.78,.15,'#b8b9b6');panelWindow(d,-4.08,4.08,1.43,4.53,.19,5);
  for(let i=0;i<23;i++){
    const x=-8.45+16.9*i/23,s=-8.45+16.9*(i+1)/23,bend=u=>.2+2.48*(1-(u/8.45)**2);
    const at=(u,y,n=0)=>[u,y,bend(u)+n];
    group(at((x+s)/2,7.8),[0,0,1]);
    const curve=(a,b,lo,hi,n,c,k='wall')=>quad([at(a,lo,n),at(b,lo,n),at(b,hi,n),at(a,hi,n)],c,k);
    curve(x,s,5.07,10.82,0,stone);curve(x,x+.024,5.07,10.82,.026,joint);
    for(const y of [5.72,6.52,9.55,10.24])curve(x,s,y,y+.025,.027,joint);
    if(i%3===1)curve(x+.038,s-.04,6.6,9.48,.04,glass,'glass');
  }
  for(const u of [-13,-4.65,4.65,13])box(u-.25,u+.25,.90,13.72,2.99,3.51,'#c2c2b9');
  box(-20,19,13.39,13.89,-4.6,5.17,stone);
  for(let u=-18;u<19;u+=1.6)box(u,u+.10,11.78,11.92,-1.2,3.6,'#8e9490');
  // Broad splayed stair: the lower treads fan into the paving.
  for(let j=0;j<8;j++){const h=.91+j*.14,w=12.7-j*.36;box(-w,w,h,h+.14,.26,8.54-j*.54,'#b7b3a8');}
  for(const side of [-1,1]){
    const u=side*11.50;box(u-.75,u+.75,.95,1.22,3.90,9.3,'#b0a99a');
    for(let i=0;i<5;i++)box(u-.57,u+.57,1.2,1.83+(4-i)*.06,4.0+i,4.98+i,i%2?'#896e52':'#87765a');
  }
  return d.groups;
}
function squareElevation(){
  const d=frame(teaching),{box}=d;
  // Distinct from the east stair tower: the west front has a broad glass grid
  // framed by red bookends. Keep the original footprint of the teaching group.
  for(let j=0;j<16;j++){
    const l=-25.15+j*3.13,r=l+3.13;
    panel(d,l,r,.17,17.08,.29,'#9da9a8');
    for(let k=0;k<4;k++){
      const y=1.38+k*3.76;
      panelWindow(d,l+.08,r-.08,y,y+2.66,.36,k===0?2:3);
      panel(d,l,r,y+2.70,y+3.11,.405,'#7c898d');
    }
  }
  for(const [l,r] of [[-29.4,-25.15],[24.91,29.36]]){
    box(l,r,4.96,19.07,-.15,.52,'#9b5748','brick');
    box(l-.28,r+.28,4.56,4.91,-.10,.83,stone);
  }
  for(let k=0;k<4;k++)box(-25.15,24.93,1.02+k*.135,1.15+k*.135,0,4.9-k*.66,'#b8b0a3');
  return d.groups;
}
export function centralModels(data){
  const groups=[];
  if(data.building.some(b=>b[4]===libraryId))groups.push(...rear());
  if(data.building.some(b=>b[4]===teachingFrontId))groups.push(...squareElevation());
  return groups;
}

// The view across the square shows clipped lawns and paths, not an open
// meadow. Planting shapes are approximate and stop short of the circular plaza.
export function plantSquare(field,plant){
  const {surfaces,shrubs,forecourts}=field;
  function strip(a,b,w,y,color){
    const du=b[0]-a[0],dv=b[1]-a[1],len=Math.hypot(du,dv),x=-dv*w/(2*len),z=du*w/(2*len);
    const p=[[a[0]+x,a[1]+z],[b[0]+x,b[1]+z],[b[0]-x,b[1]-z],[a[0]-x,a[1]-z]];
    surfaces.push([p,y,color]);return p;
  }
  const garden=[[-65.8,-114],[-27,-114],[-33,-94],[-35,-76],[-32,-57],[-65.7,-57]];
  forecourts.push(garden);surfaces.push([garden,.29,'#829362']);
  for(const [a,b,w] of [[[-66,-98],[-34,-91],5.8],[[-34,-91],[-15,-82],4.8],[[-66,-74],[-35,-75],4.0],[[-47,-112],[-49,-92.7],2.8],[[-47,-88.8],[-46,-76],2.75]]){
    strip(a,b,w+.30,.858,'#999a87');strip(a,b,w,.875,'#b3ad9d');
  }
  const beds=[
    [[-63,-110],[-51,-109],[-52,-99.0],[-63,-101.5]],
    [[-45,-108.8],[-29.8,-108.4],[-33.6,-94.6],[-46,-97.5]],
    [[-62,-93.7],[-50.1,-91],[-49.5,-78.1],[-63,-77.6]],
    [[-44.7,-89.7],[-36,-87.6],[-36.6,-78.6],[-44,-78]],
    [[-63,-71.7],[-36.4,-72.9],[-34,-61.6],[-62.8,-60.9]]
  ];
  for(const [i,p] of beds.entries()){
    surfaces.push([p,.32,i%2?'#7f945f':'#718958']);
    for(let j=0;j<p.length;j++){
      const a=p[j],b=p[(j+1)%p.length],len=Math.hypot(a[0]-b[0],a[1]-b[1]),count=Math.ceil(len/2.0);
      for(let k=0;k<count;k++){
        const t=(k+.5)/count;shrubs.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,1.18,.70+.08*Math.sin(k*.8+i),1.10,.62]);
      }
    }
  }
  for(const [x,z,h] of [[-56,-106.2,6.3],[-42,-81.5,5.7],[-24,-113,7.4],[-22,-66,7.9],[-5,-106,7.4],[8,-100,7.8],[42,-54,6.8],[47,-97,7.1]])
    plant(x,z,h,'vase',false,'open');
  for(const z of [-79.7,-66.3])strip([-99.2,z],[-66.2,z],.23,.927,'#777a74');
}
