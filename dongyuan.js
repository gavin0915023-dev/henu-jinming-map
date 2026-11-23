import { orientedFrame, panel, streetEdges } from './survey-mesh.js';

// OSM marks the site outside the main campus. Only the eight named residences
// belong to this group. Roof patches are estimated from the level-18 aerial;
// the exterior colours and the profile of the stair caps come from Yishan St.
// head: x, facade (north/south), width, curved cover seen from the street.
const rows = [
  ['712688783',19,'#a7947d','#aeaa9b',[[545,-1,5.6,1],[599,-1,5.7,1]],[[.03,.43],[.46,.96]]],
  ['712688787',20,'#9e8c76','#b4aa98',[[541,-1,4.2],[584,-1,4.6]],[[.36,.89]]],
  ['712688789',21,'#a5927b','#bab09e',[[543,-1,4.5],[577,1,4.0]],[[.08,.32],[.57,.86]]],
  ['712688795',22,'#a28e76','#948a77',[[551,1,5.0,1],[608,1,4.4]],[[.60,.75],[.83,.97]]],
  ['712688784',23,'#ad9c85','#ada99a',[[647,-1,4.7],[712,-1,5.7]],[[.04,.52],[.54,.83],[.88,.98]]],
  ['712688791',24,'#aa9983','#beb4a1',[[673,-1,4.0],[711,1,4.2]],[[.13,.42],[.54,.96]]],
  ['712688793',25,'#ae9e88','#c6bcaa',[[678,1,4.1],[718,-1,4.2]],[[.08,.26],[.51,.94]]],
  ['712688794',26,'#ad9b82','#9e9481',[[674,1,4.6],[717,-1,4.3]],[[.23,.44],[.56,.73],[.84,.96]]]
];
export const residences = new Map(rows.map(([id,number,wall,roof,heads,patches]) =>
  [id,{number,wall,roof,heads,patches}]));
export const residenceColors = Object.fromEntries(rows.map(([id,,wall,roof]) => [id,[wall,roof]]));
// Four short, unnamed low-rise footprints between the western gables: these
// read as shops in the street imagery and must never become residence places.
export const streetPlinths=new Map([['712688782',7.55],['712688786',7.2],['712688788',7.7],['712688790',6.65]]);
for(const id of streetPlinths.keys())residenceColors[id]=['#cbbfac','#b7ad98'];
const silver='#ced0c6',pane='#566a73',ledge='#b6a991';
const windowTones=[pane,'#596c72','#63777c','#53656c','#697a7c'];

// Intersect a vertical plan line with the actual polygon: the two northern
// blocks change depth half way along and must not get one bridging roof.
function limitsAt(ring,x){
  const zs=[];
  for(let i=1;i<ring.length;i++){
    const [a,b]=ring[i-1],[c,d]=ring[i];
    if((a<=x&&c>x)||(c<=x&&a>x))zs.push(b+(d-b)*(x-a)/(c-a));
  }
  return [Math.min(...zs),Math.max(...zs)];
}
function stairs(record){
  return residences.get(record[4]).heads.map(([x,sign,width,curved])=>{
    const bounds=limitsAt(record[0],x),z=bounds[sign>0?1:0]+(record[0].length<=20&&curved?.72:-.22)*sign;
    const d=orientedFrame(x,z,0,sign),half=width/2;
    const p=[[-half,-4.2],[half,-4.2],[half,0],[-half,0],[-half,-4.2]].map(d.world);
    return {x,sign,d,p,half,curved,top:record[1]+(curved?1.38:.93)};
  });
}
export function* residenceSolids(record){
  yield {record,p:record[0],base:.08,top:record[1]+.08};
  for(const head of stairs(record))yield {record,p:head.p,base:record[1]+.08,top:head.top};
}

// Each opening has its own fixed-size frame and a transom. The panes and
// masonry go to the same spatial streams as all other campus facades.
function windowBay(d,x,width,y,height,v,divisions){
  const a=x-width/2,b=x+width/2;
  // One sortable pane group in Canvas; keep frame, glazing and mullions in
  // painter order. The GPU still batches the individual indexed surfaces.
  d.group([x,y+height/2,v],[0,0,1]);
  const face=(l,r,base,top,depth,color,kind,fine)=>d.face([r,depth],[l,depth],base,top,color,kind,fine);
  face(a-.06,b+.06,y-.06,y+height+.06,v,silver,'wall',1);
  const [wx,wz]=d.world([x,v]),key=Math.abs(Math.round(wx*2.9)+Math.round(wz*1.7)+Math.round(y*3.9));
  face(a,b,y,y+height,v+.025,windowTones[key%windowTones.length],'glass');
  if(divisions===3 && key%7===0)
    face(a,a+width/3,y,y+height*.69,v+.043,'#44565c','glass');
  if(divisions>1){
    for(let j=1;j<divisions;j++){
      const u=a+width*j/divisions;face(u-.04,u+.04,y,y+height,v+.055,silver,'wall',1);
    }
    face(a,b,y+height*.69,y+height*.69+.075,v+.06,silver,'wall',1);
  }
}
function rooms(d,x,width,h,v,paired,ac=false){
  const floor=(h-.65)/6;
  for(let i=0;i<6;i++){
    const y=i*floor+floor*.31+.2;
    if(paired){
      const spacing=Math.min(width*.23,.82),w=Math.min(.48,width*.20);
      d.group([x,y+floor*.4,v],[0,0,1]);
      for(const offset of (width<2.4?[0]:[-spacing,spacing]))
        d.face([x+offset+w/2,v],[x+offset-w/2,v],y+.32,y+floor*.61,pane,'glass');
    }else{
      windowBay(d,x,Math.min(4.4,width*.82),y,floor*.57,v,width>3.1?3:2);
      // A few exterior units are visible beside the enclosed bays on the
      // street row. No invented equipment on the unsurveyed courtyard row.
      if(ac && (i===2||i===4)){
        const u=x+width*.34;
        d.box(u-.39,u+.39,y-.45,y+.04,v,v+.35,'#c6c2b3','wall',1);
        panel(d,u-.31,u+.04,y-.36,y-.04,v+.369,'#918f81','wall',1);
      }
    }
  }
}
// A projecting pier has a front and two returns, not a copy of the glass bay.
function pier(d,x,width,h,depth,wall){
  const first=d.groups.length,a=x-width/2,b=x+width/2,top=h+.42;
  panel(d,a,b,.13,top,depth,wall);
  for(const u of [a,b]){
    d.group([u,h/2,depth/2],[u===a?-1:1,0,0]);d.face([u,0],[u,depth],.13,top,wall);
  }
  d.group([x,top,depth/2],[0,1,0]);
  d.quad([[a,top,0],[a,top,depth],[b,top,depth],[b,top,0]],ledge);
  for(let i=first;i<d.groups.length;i++)d.groups[i].castSilhouette=true;
}
function endWall(d,len,h,street){
  // Street-facing ends have broad unperforated walls and just one vertical
  // stack of white sash windows. The low cream frontage is a different scale.
  const w=Math.min(2.25,len*.17),pitch=(h-.65)/6;
  for(let i=street?2:0;i<6;i++){
    windowBay(d,0,w,i*pitch+pitch*.28+.18,pitch*.59,.055,2);
    if(street)panel(d,-len*.49,len*.49,i*pitch+.26,i*pitch+.30,.035,'#897963','wall',1);
  }
  if(street){
    shopFront(d,len,2*pitch+.11);
    for(const u of [-len*.38,len*.38])d.box(u-.061,u+.061,2*pitch+.23,h-.51,.065,.17,'#897c67','wall',1);
  }
}
function shopFront(d,len,top){
  const pitch=(top-.11)/2;
  panel(d,-len/2,len/2,.13,top,.08,'#cbbfac');
  const shops=Math.max(2,Math.round(len/4.9)),span=len/shops;
  for(let i=0;i<shops;i++){
    const x=-len/2+(i+.5)*span;
    panel(d,x-span*.41,x+span*.41,.86,pitch*.83,.115,i%3?'#535b59':'#626d6a','glass');
    panel(d,x-.042,x+.042,.86,pitch*.83,.147,'#a4a398','wall',1);
    panel(d,x-span*.48,x+span*.48,pitch*.84,pitch*1.13,.14,i%2?'#8c7062':'#727d75');
    windowBay(d,x,span*.65,pitch*1.24,pitch*.55,.13,2);
  }
  panel(d,-len/2,len/2,top-.15,top+.07,.19,'#e1d9c8');
}
export function plinthModel(record){
  const top=streetPlinths.get(record[4]),groups=[];
  for(const {d,len} of streetEdges(record[0]))if(d.nx<-.9&&len>3.5){
    shopFront(d,len,top);
    for(const g of d.groups)g.castSilhouette=false;
    groups.push(...d.groups);
  }
  return groups;
}
export function residenceGround(data,{surfaces,forecourts,trees},contains){
  if(!data.building.some(r=>residences.has(r[4])))return;
  // Paving around each distinct footprint and around the central service
  // building. Keep it below the mapped road surfaces, including intersections.
  for(const [ring,,,,id] of data.building)if(residences.has(id)){
    const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]);
    const l=Math.min(...xs),r=Math.max(...xs),n=Math.min(...zs),s=Math.max(...zs);
    const apron=ring.map(([x,z])=>[x+(2*x-l-r)*2.2/(r-l),z+(2*z-n-s)*2.6/(s-n)]);
    surfaces.push([apron,.56,'#b5aa96']);forecourts.push(apron);
  }
  const court=[[640,250],[648,250],[649,294],[660,299],[661,396],[611,397],[604,390],[604,299],[637,296]];
  surfaces.push([court,.51,'#b7ad99']);forecourts.push(court);
  // Paved sidewalk just outside the east carriageway (7 m half-width).
  // Tree positions are impressions of the frontage, not a tree inventory.
  const roadside=z=>507.9-(z-249.5)*9.9/189.7;
  const sidewalk=[[roadside(257)+7.4,257],[529,257],[530.5,315],[526,418],[roadside(418)+7.4,418]];
  surfaces.push([sidewalk,.78,'#bdb4a2']);forecourts.push(sidewalk);
  for(const [i,z] of [265,284,312,333,348,377,393,414].entries()){
    const x=roadside(z)+9.8;
    if(data.building.some(r=>contains(x,z,r[0])))continue;
    const well=[[x-.9,z-.9],[x+.9,z-.9],[x+.9,z+.9],[x-.9,z+.9]];
    surfaces.push([well,.79,'#827d62']);
    trees.push([x,z,6.2+(i%3)*.7,i%3?'vase':'shade',true,(i*.37)%1,i*1.49,.83,.88,'high-summer']);
  }
}
function roof(record,profile,heads){
  const [ring,h]=record,groups=[],xs=ring.map(p=>p[0]),min=Math.min(...xs),span=Math.max(...xs)-min;
  const d=orientedFrame(0,0,0,1),y=h+.114;
  for(const [start,end] of profile.patches){
    const a=min+start*span,b=min+end*span;
    // Stop each piece at every change in the silhouette (including setbacks).
    const cuts=[...new Set([a,...xs.filter(x=>x>a&&x<b),b])].sort((l,r)=>l-r);
    for(let i=1;i<cuts.length;i++){
      const l=cuts[i-1],r=cuts[i];if(r-l<.035)continue;
      const [n,s]=limitsAt(ring,(l+r)/2);
      d.group([(l+r)/2,y,(n+s)/2],[0,1,0]);
      d.quad([[l,y,n+.85],[l,y,s-.85],[r,y,s-.85],[r,y,n+.85]],'#dfdbcf','terrace');
    }
  }
  groups.push(...d.groups);
  for(const {d,half,top,curved} of heads){
    const a=-half-.57,b=half+.57,n=-4.6,s=.78,count=curved?6:1;
    const cap=u=>top+.13+(curved?.40*(1-((2*u-a-b)/(b-a))**2):0);
    for(let i=0;i<count;i++){
      const l=a+(b-a)*i/count,r=a+(b-a)*(i+1)/count,yl=cap(l),yr=cap(r);
      d.group([(l+r)/2,(yl+yr)/2,(n+s)/2],[0,1,0]);
      d.quad([[l,yl,n],[l,yl,s],[r,yr,s],[r,yr,n]],'#c6bca5');
      for(const [v,dir] of [[s,1],[n,-1]]){
        d.group([(l+r)/2,yl-.14,v],[0,0,dir]);
        d.quad([[l,yl-.24,v],[r,yr-.24,v],[r,yr,v],[l,yl,v]],'#8e806b');
      }
    }
    for(const u of [a,b]){d.group([u,cap(u)-.12,(n+s)/2],[u===a?-1:1,0,0]);d.face([u,n],[u,s],cap(u)-.24,cap(u),'#958973');}
    if(curved)windowBay(d,0,half*.76,h+.25,.80,.045,2);
    groups.push(...d.groups);
  }
  return groups;
}
export function residenceModel(record){
  const [ring,h,,,id]=record,profile=residences.get(id),heads=stairs(record);
  const edges=streetEdges(ring),groups=[],jagged=ring.length>20,street=profile.number<=22;
  for(const sign of [-1,1]){
    const side=edges.filter(({d})=>d.nz*sign>.97);
    const least=Math.min(...side.map(({d})=>d.at([0,0,0])[2]*sign));
    for(const {d,len} of side){
      const x=d.at([0,0,0])[0];
      if(len<1.58)continue;
      if(jagged){
        const projects=d.at([0,0,0])[2]*sign-least>.58;
        const head=heads.some(s=>s.sign===sign&&Math.abs(s.x-x)<1.2);
        if(head){
          for(let i=0;i<6;i++)windowBay(d,0,Math.min(1.7,len*.48),(.34+i)*(h-.65)/6,1.68,.06,2);
        }else if(projects)rooms(d,0,len,h,.055,true);
        else {
          const count=Math.max(1,Math.round(len/5.9)),w=len/count;
          for(let i=0;i<count;i++)rooms(d,-len/2+w*(i+.5),w,h,.06,false,street&&len>4.3&&x%13<4);
        }
      }else{
        // Coarser outlines: fit the rhythm to each real wing separately.
        // In the rear row the relief is deliberately shallower.
        const spans=[],depth=street?.78:.42;
        let left=-len/2;
        const tower=heads.find(s=>s.curved&&s.sign===sign&&Math.abs(s.x-x)<len/2-s.half);
        if(tower){
          const u=d.local(tower.p[2])[0]-tower.half;
          spans.push([left,u-tower.half]);left=u+tower.half;
          pier(d,u,tower.half*2,h,.72,profile.wall);
          for(let i=0;i<6;i++)windowBay(d,u,1.7,(.34+i)*(h-.65)/6,1.68,.77,2);
        }
        spans.push([left,len/2]);
        for(const [a,b] of spans){
          const n=Math.max(1,Math.round((b-a)/7.25)),w=(b-a)/n;
          for(let i=0;i<n;i++){
            const l=a+i*w,p=w*.33;
            pier(d,l+p/2,p,h,depth,profile.wall);
            rooms(d,l+p/2,p,h,depth+.045,true);
            rooms(d,l+(p+w)/2,w-p,h,.055,false,street&&i%5===2);
          }
        }
      }
      groups.push(...d.groups);
    }
  }
  for(const {d,len} of edges){
    if(Math.abs(d.nx)<.97||len<10)continue;
    endWall(d,len,h,street&&d.nx<-.97);groups.push(...d.groups);
  }
  // The footprint already casts the shadow of flush window panes and end
  // walls. Only projecting piers and roof caps need independent shadow faces.
  for(const g of groups)g.castSilhouette??=false;
  return groups.concat(roof(record,profile,heads));
}
