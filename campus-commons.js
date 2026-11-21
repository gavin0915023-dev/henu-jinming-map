import {orientedFrame as frame,panel} from './survey-mesh.js';

// Coordinates and orientations use the supplied plan; the small dimensions
// are estimates from the linked panoramas and the university's square photo.
const X=19.15,Z=-76.5,TAU=2*Math.PI,N=96,BASE=-1.88,INNER=37,OUTER=51.4,TOP=.45;
const world=()=>frame(0,0,0,1), sq=()=>frame(X,Z,0,1);
const rect=(l,r,n,s)=>[[l,n],[r,n],[r,s],[l,s]];
const pt=(r,a,y)=>[r*Math.cos(a),y,r*Math.sin(a)];
export const isMarcoRing=p=>p.length>32&&p.some(([x,z])=>Math.abs(x+35.8)<.5&&Math.abs(z-Z)<4);
export const hasMarco=data=>data.plaza.some(isMarcoRing);
export const marcoHole=()=>Array.from({length:N},(_,i)=>[X+OUTER*Math.cos(TAU*i/N),Z+OUTER*Math.sin(TAU*i/N)]);
const delta=(TOP-BASE)/6,step=(OUTER-INNER)/6;
const stairSector=i=>(i+1)%12<2;
export function squareHeight(x,z){
  const dx=x-X,dz=z-Z,r=Math.hypot(dx,dz);
  if(r>52.1)return;
  if(r>=OUTER)return TOP;
  if(r<INNER)return BASE;
  const i=Math.floor(((Math.atan2(dz,dx)+TAU)%TAU)*N/TAU);
  const stairs=stairSector(i),n=Math.min(stairs?11:5,Math.floor((r-INNER)/step*(stairs?2:1)));
  return BASE+(n+1)*delta/(stairs?2:1);
}
function bowl(){
  const d=sq();
  for(let i=0;i<N;i++){
    const a=i*TAU/N,b=(i+1)*TAU/N,mid=(a+b)/2;
    const flat=(r,s,y,c,aa=a,bb=b)=>{
      d.group(pt((r+s)/2,(aa+bb)/2,y),[0,1,0]);
      const a=pt(r,aa,y),b=pt(r,bb,y),c1=pt(s,bb,y),e=pt(s,aa,y);
      d.quad(r>0?[a,b,c1,e]:[a,c1,e,a],c,'ground');
    };
    // Use two pale paving courses between the dark stone circles. Radial
    // joints begin at the central medallion; the centre is not a grass patch.
    for(const [r,s,c] of [[0,12.77,'#cbbca6'],[12.77,13.08,'#706e6a'],[13.08,13.48,'#c8bba9'],
      [13.48,13.88,'#757674'],[13.88,20.82,'#c6c1b8'],[20.82,21.19,'#858582'],
      [21.19,28.45,'#c0bcb4'],[28.45,28.90,'#7a7c7a'],[28.90,36.35,'#c9c4bb'],[36.35,37,'#777a77']]){
      if(r>=13.88&&i%4===0&&s-r>1){
        const seam=.30/((r+s)/2);flat(r,s,BASE,'#858783',a,a+seam);flat(r,s,BASE,c,a+seam,b);
      }else flat(r,s,BASE,c);
    }
    const stairs=stairSector(i),count=stairs?12:6;
    let previous=BASE;
    for(let j=0;j<count;j++){
      const r=INNER+(OUTER-INNER)*j/count,s=INNER+(OUTER-INNER)*(j+1)/count,y=BASE+(TOP-BASE)*(j+1)/count;
      d.group(pt(r,mid,(y+previous)/2));d.quad([pt(r,a,previous),pt(r,a,y),pt(r,b,y),pt(r,b,previous)],stairs?'#9d978d':'#938e80','ground');
      if(stairs)flat(r,s,y,j%2?'#c8c2b6':'#bfb9ae');
      else{flat(r,r+.43,y,'#c7bdab');flat(r+.43,s-.18,y,j%2?'#84915b':'#92975e');flat(s-.18,s,y,'#aeaa91');}
      if(stairs&&j%2===0){
        for(const [angle,neighbor] of [[a,i+N-1],[b,i+1]])if(!stairSector(neighbor%N)){
          d.group(pt((r+s)/2,angle,y));d.quad([pt(r,angle,y),pt(s,angle,y),pt(s,angle,y+delta/2),pt(r,angle,y+delta/2)],'#9f9b8e','wall',1);
        }
      }
      previous=y;
    }
    flat(OUTER,52.04,TOP+.006,'#b6afa2');
  }
  // The campus plan marks the outdoor display between the library and square.
  const display=frame(-54.5,-76.5,1,0);
  for(const u of [-3.0,3.0])display.box(u-.24,u+.24,.81,4.12,-.38,.30,'#878581');
  display.box(-5.4,5.4,3.65,7.95,-.38,.23,'#494b4a');panel(display,-5.13,5.13,3.89,7.71,.245,'#403f3e');
  return d.groups.concat(display.groups);
}

const gate=()=>frame(19.3,-600.8,0,-1);
export const hasNorth=data=>data.boundary.some(([x,z])=>Math.abs(x+455.1)<1&&Math.abs(z+601.9)<1);
export const northSign={text:'河南大学',horizontal:true,point:gate().at([0,2.05,.66]),yaw:Math.PI,width:12.6,height:1.64,color:'#cfaa56'};
function northGate(){
  const d=gate(),s='#baaaa4';
  d.box(-8.96,8.96,.75,.97,-.95,.86,'#817c79');
  d.box(-8.69,8.69,.97,3.05,-.67,.63,s);
  panel(d,-8.69,8.69,1.0,1.16,.642,'#998e88');
  for(const u of [-8.8,8.8])d.box(u-.27,u+.27,.97,3.17,-.76,.72,'#817e80');
  for(let u=-6.3;u<8;u+=2.1)panel(d,u-.012,u+.012,1.17,3.02,.641,'#ad9f98','wall',1);
  // Separate shelters either side of the name wall leave two open approaches.
  d.box(-22.3,-18.1,.80,3.32,-4.75,-1.6,'#aaa9a0');
  panel(d,-22.08,-18.30,1.50,2.91,-1.57,'#677878','glass');
  d.box(-22.78,-17.65,3.32,3.59,-5.0,-1.24,'#8e8d81');
  for(const u of [18.4,21.7])for(const v of [-4.83,-1.95])d.box(u-.09,u+.09,.81,2.99,v-.09,v+.09,'#c5c6bb');
  d.box(17.91,22.18,2.99,3.19,-5.3,-1.45,'#c9c7b9');
  return d.groups;
}

const bank=[[84.5,-437.9],[91.8,-440.6],[96.4,-443.3],[102.4,-444.7],[112,-443.9],
  [122.4,-442.3],[132,-441.2],[140.8,-440.7],[151.2,-442.2],[160.8,-444.9],[167.5,-449]];
const willows=[[89.4,-441.25,6.3],[100,-445.9,7.6],[111.2,-445.45,6.9],[124.6,-443.55,7.1],
  [138.8,-442.14,7.8],[153.4,-444.13,6.7],[163.4,-447.8,6.1]];
export const cuitingCenter={x:145,z:-431};
export const hasCuiting=data=>data.water.some(p=>p.some(([x,z])=>Math.abs(x-83.2)<.15&&Math.abs(z+430.9)<.15));
function waterside(){
  const d=world();
  for(let i=0;i<willows.length;i++){
    const [x,z,h]=willows[i],t=i*1.74,base=[x,.48,z],fork=[x+.24*Math.sin(t),h*.36,z+.12];
    let seed=1171+i*1523;
    const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const colors=['#6e854b','#829751','#5f7846','#8c9b58','#758d4c','#889f60'];
    const mix=(a,b,k)=>a.map((v,n)=>v+(b[n]-v)*k);
    const stem=(a,b,r,col,fine=0)=>{d.group(mix(a,b,.5));d.bar(a,b,r,col,fine);};
    stem(base,fork,.14,'#887c68');
    for(let j=0;j<8;j++){
      const a=t+j*2.39996+(rnd()-.5)*.26,ex=Math.cos(a),ez=Math.sin(a),span=h*(.24+.12*rnd());
      const high=h*(.79+rnd()*.18),knee=[fork[0]+ex*span*.45,high-1.25,fork[2]+ez*span*.45];
      const arch=[x+ex*span*.72,high+.15,z+ez*span*.72],tip=[x+ex*span,high-.35-rnd()*.42,z+ez*span];
      stem(fork,knee,.071,'#817b64');stem(knee,arch,.048,'#8b8366');stem(arch,tip,.032,'#8d8a64',1);
      for(let k=0;k<5;k++){
        const f=(k+.45)/5,hub=mix(knee,tip,f),side=k%2?1:-1;
        const ang=a+side*(.50+rnd()*.72),dx=Math.cos(ang),dz=Math.sin(ang),reach=.55+rnd()*.68;
        const head=[hub[0]+dx*reach,hub[1]+.29+rnd()*.72,hub[2]+dz*reach];
        stem(hub,head,.026,'#91906a',1);
        for(let n=0;n<3;n++){
          const u=(n+.5)/3,start=mix(hub,head,u),sw=(n-1)*.31+(rnd()-.5)*.19;
          const length=h*(.20+.26*rnd())*(.72+f*.36),drift=.19+.35*rnd(),phase=rnd()*TAU;
          const at=s=>[start[0]+dx*drift*s-dz*sw*s+.07*Math.sin(phase+s*4)*s,
            start[1]-length*s*s+.10*Math.sin(s*Math.PI),start[2]+dz*drift*s+dx*sw*s+.05*Math.sin(phase+s*3)*s];
          const a0=at(0),amid=at(.54),end=at(1);d.group(amid);
          d.bar(a0,amid,.010,'#8c905e');d.bar(amid,end,.007,'#84895b');
          // Short alternate blades follow each curved twig. Gaps between
          // blades are real air; no kite-shaped sheets enclose the crown.
          for(let q=0;q<12;q++){
            const s=(q+.42+rnd()*.20)/12,p=at(s),side=q%2?1:-1,ang=phase+side*1.1+s*.67;
            const lx=Math.cos(ang),lz=Math.sin(ang),size=.20+.16*rnd(),w=.026+.016*rnd();
            const end=[p[0]+lx*size*.59,p[1]-size*(.67+.32*s),p[2]+lz*size*.59];
            const m=mix(p,end,.47),c=colors[Math.floor(rnd()*colors.length)];
            d.quad([p,[m[0]-lz*w,m[1]+w*.32,m[2]+lx*w],end,[m[0]+lz*w,m[1]-w*.32,m[2]-lx*w]],c,'foliage',q%4?1:0);
          }
        }
      }
    }
  }
  return d.groups;
}

export function sportFinish(x,z,sport){
  if(z<247||z>402)return null;
  if(sport==='tennis'&&x>110&&x<158)return {apron:'#84967e',play:'#687e91'};
  if(sport==='basketball'&&x>162&&x<295)return {apron:'#a5a49a',play:'#a4a59e',key:'#989e98'};
  return null;
}
const hasCourts=data=>data.sport.some(([p,,sport])=>sport==='tennis'&&sportFinish(...p[0],sport));
export function surveyedCourtPlan(p,sport){
  const finish=sportFinish(...p[0],sport);if(!finish)return null;
  // Basketball backboards face the southern street. Align each small court
  // along north–south even though the combined footprint is longest east–west.
  const corners=p.slice(0,4),westEast=corners.map((a,i)=>{
    const b=corners[(i+1)%4],x=b[0]-a[0],z=b[1]-a[1],l=Math.hypot(x,z);
    return [x/l*Math.sign(x),z/l*Math.sign(x)];
  }).sort((a,b)=>b[0]-a[0])[0];
  const u=westEast,v=[-u[1],u[0]],c=corners.reduce((o,q)=>[o[0]+q[0]/4,o[1]+q[1]/4],[0,0]);
  const span=e=>{const s=corners.map(q=>q[0]*e[0]+q[1]*e[1]);return Math.max(...s)-Math.min(...s);};
  const w=span(u),l=span(v),cols=sport==='tennis'?1:Math.round(w/16),rows=sport==='tennis'?1:Math.round(l/32);
  const cells=[];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=w*((i+.5)/cols-.5),z=l*((j+.5)/rows-.5);
    cells.push({c:[c[0]+u[0]*x+v[0]*z,c[1]+u[1]*x+v[1]*z],u,v,angle:-Math.atan2(u[1],u[0]),width:w/cols,length:l/rows});
  }
  return {cells,finish};
}
function equipment(data){
  const groups=[];
  for(const [p,,sport] of data.sport){
    const layout=surveyedCourtPlan(p,sport);if(!layout)continue;
    for(const f of layout.cells){
      const d=frame(...f.c,...f.v);
      if(sport==='tennis'){
        const w=11.58,h=1.77;
        d.group([0,1.32,0]);
        for(const s of [-1,1])d.bar([s*w/2,.66,0],[s*w/2,h+.06,0],.054,'#4d6958',0);
        for(let j=0;j<6;j++){
          const y=.89+j*.17;d.bar([-w/2,y,0],[0,y-.07,0],j===5?.025:.012,j===5?'#d7d8c8':'#52665a',j===5?0:1);
          d.bar([0,y-.07,0],[w/2,y,0],j===5?.025:.012,j===5?'#d7d8c8':'#52665a',j===5?0:1);
        }
        for(let x=-w/2;x<w/2;x+=.34)d.bar([x,.87,0],[x,h-.08*(1-Math.abs(x)*2/w),0],.012,'#53675c');
      }else{
        const half=Math.min(28,f.length-3)/2;
        for(const sign of [-1,1]){
          const z=sign*(half+1.12),board=sign*(half-.18),rim=sign*(half-.79);
          d.group([0,2.70,z]);
          const p=[[0,.66,z],[0,2.87,z],[0,3.48,z-sign*.045],[0,3.78,z-sign*.12],[0,3.97,z-sign*.27],[0,4.07,z-sign*.46],[0,4.10,board]];
          for(let i=1;i<p.length;i++)d.bar(p[i-1],p[i],i<3?.115:.095,'#4279a3',0);
          d.bar([0,2.84,z],[0,3.86,board],.056,'#43799f',0);
          d.box(-.89,.89,3.45,4.54,board-.045,board+.045,'#c4c3ac');
          d.group([0,3.73,rim]);
          for(const s of [-1,1])d.bar([0,4.01,board+sign*.08],[s*.79,4.45,board+sign*.08],.035,'#567b92');
          for(let j=0;j<12;j++){
            const a=j*TAU/12,b=(j+1)*TAU/12;
            d.bar([.23*Math.cos(a),3.71,rim+.23*Math.sin(a)],[.23*Math.cos(b),3.71,rim+.23*Math.sin(b)],.027,'#ad7354',0);
            if(!(j%2))d.bar([.22*Math.cos(a),3.68,rim+.22*Math.sin(a)],[.15*Math.cos(a+.3),3.36,rim+.15*Math.sin(a+.3)],.012,'#d5d0be');
          }
        }
      }
      groups.push(...d.groups);
    }
  }
  return groups;
}
// Only runs corroborated along the west and south approaches. The interruption
// in the low concrete curb also remains a real passage in the collision plan.
const fences=[
  [[115.8,249.3],[113.93,321.95],3.62],[[113.8,326.6],[111.9,399.6],3.62],
  [[111.9,399.6],[137.0,400.23],3.62],[[140.0,400.30],[152.8,400.7],3.62],
  [[163.4,397.9],[224.6,399.20],1.50],[[229.3,399.30],[290.5,400.6],1.50]
];
function fenceFrame(a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  return [frame(a[0],a[1],-dz/len,dx/len),len];
}
function enclosures(){
  const out=[];
  for(const [a,b,h] of fences){
    const [d,len]=fenceFrame(a,b),low=h<2,base=low?1.03:.80,top=base+h,panels=Math.ceil(len/(low?3.15:4.1));
    if(low)d.box(0,len,.64,base+.04,-.15,.15,'#a29e94');
    for(let j=0;j<=panels;j++){
      const u=len*j/panels;d.group([u,(base+top)/2,0]);d.bar([u,base,0],[u,top+.10,0],low?.048:.062,'#4c695a',0);
      if(j===panels)break;
      const span=len/panels;
      d.bar([u,top,0],[u+span,top,0],.046,'#526d5d',0);
      d.bar([u,base+.14,0],[u+span,base+.14,0],.030,'#5f7567');
      // Individual clipped diagonal wires. The open cells show the court and
      // sky without a flat opaque face, from either side of the enclosure.
      const dh=h-.22,slope=1.32;
      for(const sign of [-1,1])for(let k=-dh/slope;k<span;k+=low?.122:.136){
        const x0=Math.max(0,k),x1=Math.min(span,k+dh/slope);
        if(x1-x0<.025)continue;
        const y0=base+.15+(sign===1?(x0-k)*slope:dh-(x0-k)*slope),y1=y0+sign*(x1-x0)*slope,r=low?.006:.007;
        d.quad([[u+x0,y0-r,.017],[u+x1,y1-r,.017],[u+x1,y1+r,.017],[u+x0,y0+r,.017]],low?'#63796a':'#536f62','wall',1);
      }
    }
    out.push(...d.groups);
  }
  // Slim twin floodlights visible behind the high tennis net.
  const d=world();
  for(const [x,z] of [[138,283],[135.9,324.7],[134.7,365.2],[154.4,363.5]]){
    d.group([x,4.4,z]);d.bar([x,.75,z],[x,7.50,z],.072,'#73837c',0);
    for(const s of [-1,1]){
      d.bar([x,7.06,z],[x+s*.48,7.62,z],.056,'#71817b');
      d.box(x+s*.50-.22,x+s*.50+.22,7.45,7.72,z-.20,z+.18,'#89968c');
    }
  }
  return out.concat(d.groups);
}
export function publicModels(data){
  return [...(hasMarco(data)?bowl():[]),...(hasNorth(data)?northGate():[]),
    ...(hasCuiting(data)?waterside():[]),...(hasCourts(data)?enclosures():[]),...equipment(data)];
}
export function publicBlockers(data){
  const p=[];
  if(hasNorth(data)){
    const d=gate();for(const q of [[-9.07,9.07,-.95,.86],[-22.3,-18.1,-4.75,-1.6]])p.push(rect(...q).map(d.world));
    for(const u of [18.4,21.7])for(const v of [-4.83,-1.95])p.push(rect(u-.11,u+.11,v-.11,v+.11).map(d.world));
  }
  if(hasCourts(data))for(const [a,b,h] of fences){
    const [d,l]=fenceFrame(a,b),w=h<2?.20:.14;p.push(rect(0,l,-w,w).map(d.world));
  }
  return p;
}
export function publicGround(data,{surfaces,forecourts,shrubs},tree){
  if(hasNorth(data)){
    const d=gate(),apron=[[-23.8,-9],[23.8,-9],[26,6],[23.5,16],[-23.5,16],[-25.5,7]].map(d.world);
    surfaces.push([apron,.764,'#a7a39b']);forecourts.push(apron);
    for(let u=-7.9;u<=8;u+=1.42){
      const [x,z]=d.world([u,-1.92]);shrubs.push([x,z,.9,.63,.50,.43,'#66794f',.76]);
    }
    for(const [x,z,h,kind] of [[-6.8,-597,9.2,'shade'],[-5.1,-588,9.5,'spire'],[-4.4,-580.6,7.3,'vase'],
      [-2.2,-564.8,8.7,'shade'],[41.5,-597,8.9,'shade'],[44,-588.2,10.1,'spire'],[42.8,-580.8,8.4,'shade'],[43.8,-563.3,9.2,'spire']])
      tree(x,z,h,kind,false,'open');
  }
  if(hasCuiting(data)){
    const line=offset=>bank.map(([x,z])=>[x,z-offset]);
    const strip=(a,b)=>[...line(a),...line(b).reverse()];
    surfaces.push([strip(.14,.68),.57,'#b7ab94'],[strip(2.55,4.15),.63,'#c1b49d']);
    forecourts.push(strip(-.25,4.65));
    for(let i=0;i<33;i++){
      const x=102+i*1.55,z=-467.7-.2*Math.cos(i/6);
      if(i<13||i>17)shrubs.push([x,z,1.02,.91,.71,.57,'#697d4d',.66]);
      if(i%3===1)shrubs.push([x+1.3,z+3.8,1.63,1.47,1.24,.42,i%2?'#846952':'#767851',.56]);
    }
    for(const [i,x] of [106,114.4,123.1,132.6,142.7,151.4].entries())tree(x,-468.55,5.4+.65*Math.sin(i),'vase',true,'open');
  }
}
