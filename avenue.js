// Render the two offset survey lines of 伯襄路 as a single road surface.
// This is a presentation-only view of the input; all other roads are retained.
export function campusAvenueData(data){
  if(data.avenue)return data;
  const lines=data.road.filter(([,w,name,kind,bridge])=>name==='伯襄路'&&kind==='service'&&!bridge&&w>0);
  if(lines.length!==2)return data;
  const [[p,w],[q,v]]=lines,z0=p[0][1],z1=q[0][1];
  if(!p.every(a=>Math.abs(a[1]-z0)<.1)||!q.every(a=>Math.abs(a[1]-z1)<.1)||Math.abs(z0-z1)>(w+v)/2)return data;
  const north=Math.min(z0-w/2,z1-v/2),south=Math.max(z0+w/2,z1+v/2),z=(north+south)/2;
  const xs=[...new Set([...p,...q].map(a=>a[0]))].sort((a,b)=>a-b);
  const road=[xs.map(x=>[x,z]),south-north,'伯襄路','service',false];
  // The western and lake-side panoramas support the planted verges on this
  // stretch; do not extend the close row of trees round the whole campus.
  const avenue={road,originalRoad:data.road,min:xs[0],max:xs.at(-1),north,south,
    start:Math.max(xs[0],-296),end:Math.min(xs.at(-1),100)};
  const shaped={...data,road:data.road.flatMap(r=>r===lines[0]?[road]:r===lines[1]?[]:[r]),avenue};
  avenue.curbs=avenueCurbRuns(shaped);
  return shaped;
}

function roadDistance(x,z,p,q){
  const dx=q[0]-p[0],dz=q[1]-p[1],len=dx*dx+dz*dz;
  const t=len?Math.max(0,Math.min(1,((x-p[0])*dx+(z-p[1])*dz)/len)):0;
  return Math.hypot(x-p[0]-dx*t,z-p[1]-dz*t);
}
function checks(data){
  const segments=data.road.flatMap(r=>r===data.avenue.road?[]:r[0].slice(1).map((q,i)=>[r[0][i],q,r[1]/2]));
  const polygons=[...data.water,...data.building.map(b=>b[0]),...data.plaza,...data.sport.map(s=>s[0])];
  const bbox=p=>p.reduce(([l,t,r,b],[x,z])=>[Math.min(l,x),Math.min(t,z),Math.max(r,x),Math.max(b,z)],[Infinity,Infinity,-Infinity,-Infinity]);
  const blocks=polygons.map(p=>[bbox(p),p]);
  const roadClear=(x,z,gap)=>!segments.some(([p,q,r])=>roadDistance(x,z,p,q)<r+gap);
  const landscapeClear=(x,z,gap,inside)=>!blocks.some(([[l,t,r,b],p])=>{
    if(x<l-gap||x>r+gap||z<t-gap||z>b+gap)return false;
    return inside(x,z,p)||p.some((a,i)=>roadDistance(x,z,a,p[(i+1)%p.length])<gap);
  });
  return {roadClear,landscapeClear};
}

// Produce solid runs, with deliberate breaks at junctions and shore crossings.
function runs(start,end,z,pass){
  const intervals=[];let from=null;
  for(let x=start;x<end;x+=.8){
    const stop=Math.min(x+.8,end), ok=pass(x,z)&&pass(stop,z);
    if(ok&&from===null)from=x;
    if(!ok && from!==null){intervals.push([from,x,z]);from=null;}
  }
  if(from!==null)intervals.push([from,end,z]);
  return intervals.filter(([a,b])=>b-a>1);
}
export function avenueHedgeRuns(data,inside){
  if(!data.avenue)return [];
  const {north,south,start,end}=data.avenue,{roadClear,landscapeClear}=checks(data);
  return [north-.88,south+.88].flatMap(z=>runs(start,end,z,(x,y)=>
    inside(x,y,data.boundary)&&roadClear(x,y,2.1)&&landscapeClear(x,y,.8,inside)));
}
export function avenueTrees(data,previous,inside){
  if(!data.avenue)return previous;
  const {north,south,start,end}=data.avenue,{roadClear,landscapeClear}=checks(data),rows=[];
  let seed=291861;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(const [side,z] of [[0,north-2],[1,south+2]]){
    for(let x=start+4+side*2;x<=end-2;x+=10.2+random()*.8){
      const h=10.6+random()*1.6;
      if(!inside(x,z,data.boundary)||!roadClear(x,z,4)||!landscapeClear(x,z,2.1,inside))continue;
      // The vase profile lifts the crown above the avenue without changing its
      // alignment; the street flag selects the whitewashed trunk base.
      rows.push([x,z,h,'vase',true,random(),random()*Math.PI*2,.99+.1*random(),.96+.10*random(),'open']);
    }
  }
  return [...previous.filter(([x,z,,,roadside])=>
    !(roadside&&x>=start-2&&x<=end+2&&z>=north-8&&z<=south+8)
    && !rows.some(([u,v])=>(x-u)**2+(z-v)**2<64)),...rows];
}
function avenueCurbRuns(data){
  if(!data.avenue)return [];
  const {north,south,min,max}=data.avenue,{roadClear}=checks(data);
  return [north-.22,south+.22].flatMap(z=>runs(min,max,z,(x,y)=>roadClear(x,y,.35)));
}
