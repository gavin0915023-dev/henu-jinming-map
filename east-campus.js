import { frame, patch, clip, panel, panelWindow } from './survey-mesh.js';

export const teachingId='712688930',standId='712688893';
const school={x:183.7,z:-111.6,out:1},stand={x:351.13,z:-207.3,out:-1},gate={x:482.8,z:-77,out:1};
export const easternCourts=[
  [patch(school,-17,14,-.1,21.5),.919,'#bdb6a9'],
  [patch(stand,-25,25,-.1,32.6),.929,'#b08676'],
  [patch(gate,-24,24,-9.5,17.6),.918,'#b6b0a4']
];
export const stadiumSign={text:'河南大学志义体育场',point:[349.96,11.92,-207.3],yaw:-Math.PI/2,width:23.1,height:2.63,color:'#bd483a',background:'#393d42'};
export const hasEastGate=d=>d.road.some(r=>r[2]==='夷山大街')&&d.boundary.some(([x,z])=>x>496&&z<0);
export const protectedTeachingEdge=(a,z,b,t)=>Math.min(a,b)>174&&Math.max(z,t)>-146.3&&Math.min(z,t)<-88;
export const isStandFront=(id,e)=>id===standId&&e.nx<-.85&&e.length>70;

// Only cut back the east side actually seen through the stair and pilotis.
// The western side of the long irregular source footprint stays intact.
export function* teachingSolids(record){
  const p=record[0].slice(0,-1),top=record[1]+.08;
  for(const [lo,hi,kind] of [[-200,-146,0],[-146,-118,1],[-118,-104.5,2],[-104.5,20,0]]){
    const row=clip(clip(p,1,lo,false),1,hi,true);
    for(const [piece,base] of kind===0?[[row,.08]]:[[clip(row,0,177.1,true),.08],[clip(row,0,177.1,false),kind===1?4.6:top]]){
      if(piece.length>2&&base<top)yield {p:[...piece,piece[0]],base,top,record};
    }
  }
  for(const [l,r,n,s,h] of [[-6.9,6.2,-6.62,.10,6.86],...[8.8,17.4,26.1,32.1].map(u=>[u-.40,u+.40,-.32,.50,4.6])]){
    const ring=patch(school,l,r,n,s);yield {p:[...ring,ring[0]],base:.08,top:h,custom:true,record};
  }
}
export function eastGateBlockers(){
  return [[-25,-18,-5,1],[17,24,-5,1],[-5.6,-3.5,-1.05,1.05],[4.9,7.0,-1.05,1.05],
    [-31.3,-22,-2,-.8],[22,31.3,-2,-.8]].map(a=>patch(gate,...a));
}
// Omit only the segment of the drawn boundary crossing the open road entrance.
export function boundaryLines(data){
  const rows=[],p=data.boundary;let run=[p[0]];
  for(let i=1;i<p.length;i++){
    const a=p[i-1],b=p[i];
    if(a[1]<-600&&b[1]<-600&&a[0]<-5&&b[0]>46){
      const at=x=>[x,a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])];
      run.push(at(-5));rows.push(run);run=[at(46)];
    }else if(hasEastGate(data)&&a[0]>450&&b[0]>450&&a[1]<-106&&b[1]>-47){
      const at=z=>[a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]),z];
      run.push(at(-106));rows.push(run);run=[at(-47)];
    }
    run.push(b);
  }
  rows.push(run);return rows;
}
const brick='#a25948',white='#dddcd2',silver='#b3b6b3',glass='#586973',iron='#494f50',pale='#d7d3c6';
function classroom(){
  const d=frame(school),{box,bar,group}=d;
  // Cut the facade into masonry strips: the small perforations and the
  // tall central window into the stairs are voids, including from an oblique view.
  const l=-6.9,r=6.2,shine='#be7d6b',top=23.8;
  box(l,r,.09,6.86,-6.60,.10,brick,'brick');
  const apertures=[[-1.24,3.39,7.64,19.37]];
  for(let y=7.00;y<22.7;y+=1.47){
    for(const u of [-4.65,-2.99,-1.33,.33,1.99,3.65]){
      if(y<19.5&&y>7.3&&u>-1.7)continue;
      apertures.push([u,u+.52,y,y+.53]);
    }
  }
  const ys=[...new Set([6.86,top,...apertures.flatMap(a=>[a[2],a[3]])])].sort((a,b)=>a-b);
  for(let i=1;i<ys.length;i++){
    const y0=ys[i-1],y1=ys[i],mid=(y0+y1)/2;
    const gaps=apertures.filter(a=>mid>a[2]&&mid<a[3]).sort((a,b)=>a[0]-b[0]);
    let start=l;
    for(const [a,b] of [...gaps,[r,r]]){if(a>start+.005)box(start,a,y0,y1,-.30,.10,brick,'brick');start=Math.max(start,b);}
  }
  box(l,l+.29,6.86,top,-6.60,-.30,brick,'brick');
  box(r-.29,r,6.86,top,-6.60,-.30,brick,'brick');
  for(let f=0;f<4;f++){
    const lo=6.90+f*3.08,hi=lo+3.08,x0=f%2?3.96:-2.27,x1=f%2?-2.27:3.96,v=f%2?-3.38:-1.76;
    const n=18;for(let k=0;k<n;k++){
      const a=x0+(x1-x0)*k/n,b=x0+(x1-x0)*(k+1)/n,h=lo+(hi-lo)*(k+1)/n;
      box(Math.min(a,b),Math.max(a,b),h-.24,h,v-.75,v+.75,white,'wall',1);
    }
    box(x1-.55,x1+.55,hi-.23,hi,-4.3,-.95,white);
    group([0,(hi+lo)/2,v]);bar([x0,lo-.15,v+.74],[x1,hi-.15,v+.74],.12,white,0);
    for(const y of [.49,.92])bar([x0,lo+y,v+.70],[x1,hi+y,v+.70],.037,iron);
    for(let j=0;j<=6;j++){const x=x0+(x1-x0)*j/6,y=lo+(hi-lo)*j/6;bar([x,y,v+.70],[x,y+.94,v+.70],.033,iron);}
  }
  // North wing on tall white columns; yellowed glazing shades are horizontal,
  // while the broad white end panels are blank in the supplied view.
  for(const u of [8.8,17.4,26.1,32.1])box(u-.40,u+.40,.66,4.64,-.32,.50,white);
  box(6.45,33.0,4.60,16.21,-1.2,.41,white);
  for(const [l,r] of [[7.10,11.3],[14.4,24.85],[27.0,32.2]]){
    for(let j=0;j<3;j++)panelWindow(d,l,r,5.40+j*3.42,7.38+j*3.42,.46,Math.ceil((r-l)/2.2));
    for(let j=0;j<8;j++){const y=5.30+j*1.36;box(l-.08,r+.08,y,y+.14,.42,1.24,'#e1dccb');}
  }
  // Southern return has broad separate bays. The shelter sits on the forecourt, not on the wall.
  for(let j=0;j<5;j++){
    const a=-23.9+j*3.35;for(let k=0;k<3;k++)panelWindow(d,a,a+2.96,1.58+k*3.34,3.48+k*3.34,7.28,2);
  }
  for(const x of [-14.4,-11.1,-7.8]){
    for(const v of [7.8,10.15])box(x-.10,x+.10,.93,3.22,v-.10,v+.10,iron);
  }
  box(-14.65,-7.56,3.17,3.26,7.60,10.39,'#428377');
  return d.groups;
}
function stadium(){
  const d=frame(stand),{box,group,bar,quad}=d;
  for(let i=-10;i<10;i++){
    const a=i*7.45,b=a+7.45,m=(a+b)/2,entry=Math.abs(m)<8;
    panel(d,a,b,.18,12.12,.60,white);
    panel(d,a,b,.22,1.52,.66,'#928f85');
    for(const y of entry?[6.16]:[1.72,4.18,6.93])panelWindow(d,a+.46,b-.46,y,y+(y>6?1.89:1.37),.73,6);
    if(entry){
      panel(d,a+.15,b-.16,.96,5.72,.81,'#384c56','glass');
      for(const du of [-1.07,1.07])panelWindow(d,m+du-.9,m+du+.9,.96,3.24,.92,2);
    }
    box(a-.28,a+.28,.32,Math.abs(a)<25?15.72:12.42,.64,1.07,'#b7b7af');
    if(!entry&&i%3===1)panel(d,b-1.30,b-.42,6.19,6.77,.96,'#b3b6ae');
  }
  box(-24.3,24.3,12.03,15.45,-6.4,.72,white);
  box(-12.23,12.23,10.27,13.58,.76,1.11,'#333b40');
  // A continuous thin canopy above an open triangular truss, not a solid wedge.
  for(const x of [-27,27]){
    group([x,16.9,-4]);bar([x,15.42,-7],[x,17.15,4.1],.080,silver,0);
    bar([x,18.65,4.1],[x,16.56,-10.0],.065,silver,0);
  }
  box(-27.5,27.5,18.60,18.83,-10,4.22,'#aaa99e');
  for(const v of [4.03,-2.4,-8.4]){
    group([0,17.4,v]);bar([-27,16.05,v],[27,16.05,v],.070,silver,0);
    for(let i=0;i<18;i++){
      const x=-27+i*3;
      bar([x,18.6,v],[x+1.5,16.05,v],.073,pale,0);bar([x+1.5,16.05,v],[x+3,18.6,v],.073,pale,0);
      if(i%2===0)bar([x+1.5,16.05,v],[x,18.58,v-2],.055,silver,1);
    }
  }
  for(const [l,r] of [[-77,-27.4],[27.4,76]]){
    group([(l+r)/2,12.29,1.1]);
    for(let j=0;j<6;j++){
      const t=j*Math.PI/12,b=(j+1)*Math.PI/12;
      quad([[l,12.0+1.10*Math.sin(t),.44+2.0*Math.cos(t)],[r,12.0+1.10*Math.sin(t),.44+2.0*Math.cos(t)],
        [r,12.0+1.10*Math.sin(b),.44+2.0*Math.cos(b)],[l,12.0+1.10*Math.sin(b),.44+2.0*Math.cos(b)]],'#a4a8a7');
    }
  }
  group([0,.948,14.5],[0,1,0]);
  quad([[-7,.951,11.8],[-7,.951,17.2],[7,.951,17.2],[7,.951,11.8]],'#ccc3ae');
  for(const [u,v,col] of [[-2.25,14.12,'#6a8897'],[0,14.12,'#696b69'],[2.25,14.12,'#98736c'],[-1.13,15.03,'#a19262'],[1.13,15.03,'#7e917f']]){
    for(let j=0;j<30;j++){const a=j*Math.PI/15,b=(j+1)*Math.PI/15,pt=(t,r)=>[u+r*Math.cos(t),.963,v+r*Math.sin(t)];quad([pt(a,1.13),pt(b,1.13),pt(b,.99),pt(a,.99)],col);}
  }
  return d.groups;
}
function eastGate(){
  const d=frame(gate),{box,group,bar,quad}=d;
  for(const side of [-1,1]){
    const c=25.8*side,l=c-5.6,r=c+5.6,v=-.72,h=4.81,cy=2.72,rad=1.61;
    // Build around the circular opening; include the inside reveal so it also reads from the side.
    box(l,c-rad,.38,h,v-1.0,v,brick,'brick');box(c+rad,r,.38,h,v-1.0,v,brick,'brick');
    for(let i=0;i<28;i++){
      const a=Math.PI*i/28,b=Math.PI*(i+1)/28;
      const x0=c-rad*Math.cos(a),x1=c-rad*Math.cos(b),ya=rad*Math.sin(a),yb=rad*Math.sin(b);
      for(const [y0,y1,edge] of [[cy+ya,cy+yb,h],[cy-ya,cy-yb,.38]]){
        for(const z of [v,v-1]){
          group([(x0+x1)/2,(y0+y1+2*edge)/4,z],[0,0,z===v?1:-1]);
          quad([[x0,y0,z],[x1,y1,z],[x1,edge,z],[x0,edge,z]],brick,'brick');
        }
        group([(x0+x1)/2,(y0+y1)/2,v-.5]);
        quad([[x0,y0,v],[x0,y0,v-1],[x1,y1,v-1],[x1,y1,v]],'#c4bca9');
      }
    }
    const u=side*18.6;box(u-3.1,u+3.1,.55,4.10,-5.7,-1.0,'#726556');
    panelWindow(d,u-2.76,u+2.76,1.02,3.59,-.96,4);box(u-3.65,u+3.65,4.09,4.43,-6.0,-.52,'#a59c86');
    const k=side<0?-4.55:5.95;
    box(k-1.05,k+1.05,.92,3.68,-1.05,1.05,'#75483e');panelWindow(d,k-.70,k+.75,1.55,3.26,1.085,2);
    for(let j=0;j<4;j++){
      const q=[[-1.64,-1.64],[1.64,-1.64],[1.64,1.64],[-1.64,1.64]],a=q[j],b=q[(j+1)%4];
      group([k+(a[0]+b[0])*.25,4.04,(a[1]+b[1])*.25]);quad([[k+a[0],3.68,a[1]],[k+b[0],3.68,b[1]],[k+b[0]*.06,4.59,b[1]*.06],[k+a[0]*.06,4.59,a[1]*.06]],'#865c57');
    }
    group([side*11,1.45,-2.2]);bar([side*9.3,1.42,-2.2],[side*13.1,1.42,-2.2],.068,silver,0);
  }
  box(-22.7,-20.7,.54,11.65,-3.25,-.55,'#874e40','brick');
  return d.groups;
}
export function eastModels(data){
  const rows=[];
  if(data.building.some(b=>b[4]===teachingId))rows.push(...classroom());
  if(data.building.some(b=>b[4]===standId))rows.push(...stadium());
  if(hasEastGate(data))rows.push(...eastGate());
  return rows;
}
