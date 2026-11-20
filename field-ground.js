import { hallId, softwareId, passage } from './wenfu.js';
import { labId, physicsCourt } from './physics.js';
import { easternCourts, teachingId, standId, hasEastGate } from './east-campus.js';
import { rearCourt, libraryId, teachingFrontId, plantSquare } from './central-axis.js';
import { facultyGround } from './faculty-sites.js';

// Local observations only: the entrance forecourt on Wenfu Road, the grove
// on Fangqiu Lake's north side, and the tree-planted verge beside Jiuzhang Bridge.
export function fieldGround(data,inside){
  const trees=[],shrubs=[],surfaces=[],gateways=[],forecourts=[];
  let seed=18273;
  const rnd=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
  const streets=data.road.flatMap(([p,w])=>p.slice(1).map((b,i)=>[p[i],b,w/2]));
  function clear(x,z,r){
    if(!inside(x,z,data.boundary)||data.water.some(p=>inside(x,z,p))||data.building.some(([p])=>inside(x,z,p)))return false;
    return !streets.some(([[a,b],[c,d],w])=>{
      const dx=c-a,dz=d-b,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-a)*dx+(z-b)*dz)/l)):0;
      return (x-a-t*dx)**2+(z-b-t*dz)**2<(w+r)**2;
    });
  }
  const tree=(x,z,h,form,street,profile)=>{
    if(clear(x,z,.65))trees.push([x,z,h,form,street,rnd(),rnd()*6.28,.92+rnd()*.12,.90+rnd()*.14,profile]);
  };
  if(data.building.some(b=>b[4]===labId)){
    surfaces.push([physicsCourt,.94,'#c4b7a5']);forecourts.push(physicsCourt);
    for(const [x,z,h] of [[-124,234,4.6],[-133,232,5.2],[-142,222,5.6],[-66,246,6.9],[-59,240,7.2]])
      tree(x,z,h,'vase',false,'open');
  }
  [data.building.some(b=>b[4]===teachingId),data.building.some(b=>b[4]===standId),hasEastGate(data)].forEach((show,i)=>{
    if(show){surfaces.push(easternCourts[i]);forecourts.push(easternCourts[i][0]);}
  });
  if(data.building.some(b=>b[4]===libraryId)){surfaces.push([rearCourt,.91,'#c8b9a7']);forecourts.push(rearCourt);}
  if(data.building.some(b=>b[4]===teachingFrontId))plantSquare({surfaces,shrubs,forecourts},tree);
  if(data.building.some(b=>b[4]===labId)){
    surfaces.push([[[-161,194],[-85.8,207],[-83,208.7],[-85.2,214.1],[-162.8,201.6]],.84,'#bdb6a9']);
    for(const [x,z] of [[-146,200],[-135,201.5],[-126,203.1],[-113,205.3],[-99.5,207.6],[-129.5,232.2],[-123.4,233],[-119,234.2]])
      shrubs.push([x,z,1.25,1.0,.94,.38]);
  }
  if(data.building.some(b=>b[4]===standId)){
    for(const z of [-224.8,-190.2])for(let x=324.4;x<337;x+=1.85)for(const dz of [-.75,.75])
      shrubs.push([x,z+dz,1.15,.96,1.07,.5,'#875c50',.75]);
  }
  if(hasEastGate(data)){
    for(const [x,z,h] of [[479,-103.2,8.5],[477.5,-52.4,8.2],[487,-108.5,7.7],[487,-45.8,7.8],[470,-88.8,8.6],[470,-64.2,8.0],[455,-89.8,9.3],[454,-64.8,9.0],[440,-89.2,9],[440,-64.4,8.5]])
      tree(x,z,h,'vase',false,'open');
  }
  // Keep the established Wenfu/lakeside planting independent of the new courts.
  facultyGround(data,{surfaces,forecourts,shrubs},tree);
  seed=18273;
  if(data.building.some(b=>b[4]==='712688906')){
    const court=data.building.some(b=>b[4]===hallId)&&data.building.some(b=>b[4]===softwareId);
    surfaces.push([court?[[-15,-191.25],[1.8,-191.3],[1.8,-205.12],[40.65,-205.19],[40.65,-191.72],[56.9,-191.72],[56.9,-181.55],[-15,-181.50]]:
      [[-15,-191.25],[1.8,-191.3],[1.8,-202.35],[40.4,-202.5],[40.4,-181.55],[-15,-181.5]],.69,'#c4b9a6']);
    if(court){
      const {left,right,front,rear}=passage;
      surfaces.push([[[left,front],[left,rear-.5],[right,rear-.5],[right,front]],.692,'#aca294']);
      surfaces.push([[[57.1,-191.6],[84,-191.68],[84,-181.55],[57.1,-181.55]],.27,'#a99b7d']);
      gateways.push([12,26.5,-181.6],[38,53.5,-181.6]);
    }
    surfaces.push([[[-58,-190.95],[-15.1,-191.0],[-15.1,-181.6],[-58,-181.6]],.27,'#a99b7d']);
    gateways.push([-15,3,-181.6]);
    for(const [x,z,h] of [[-54,-185.6,5.7],[-43,-185,6.2],[-32,-184.9,5.3],[-21,-185,6.4],[6.8,-184.7,6.9]])
      tree(x,z,h,'vase',false);
  }
  if(data.avenue && data.water.some(p=>p.some(([x,z])=>Math.abs(x-86.7)<.3&&Math.abs(z-51.1)<.3))){
    // Two uneven, overlapping clumps sit between the road and the water.
    // Leave a gap at the western path and avoid planting inside the shoreline.
    surfaces.push([[[52,30],[98,30],[102,37],[94,41],[86,48],[73,50],[58,46],[52,41]],.215,'#a39c82']);
    for(let row=0;row<2;row++)for(let x=57.5+row*1.8;x<102;x+=2.7+rnd()*1.8){
      const z=39.5+row*4.5+Math.sin(x*.23)*1.5+rnd()*1.3;
      if(clear(x,z,2.4))shrubs.push([x,z,2.1+rnd()*1.7,2.2+rnd()*1.5,1.8+rnd()*.95,rnd()]);
    }
  }
  if(data.road.some(r=>r[2]==='九章路'&&r[4])){
    for(const [x,z,h] of [[116.7,-230.1,9.6],[119.9,-232.3,9.2],[116.3,-236.1,10.8],[109.8,-237,10.2]])
      tree(x,z,h,'vase',true,'open');
    for(let i=0;i<11;i++){
      const x=111.2+i*1.66,z=-255.5+i*1.56;
      if(clear(x,z,1.3))shrubs.push([x,z,1.8+rnd()*.8,1.35+rnd()*.65,1.4+rnd()*.7,rnd()]);
    }
  }
  if(data.building.some(b=>b[4]===hallId))for(const x of [3,6.4,9.9,13.1,26.7,30.2,34,37.5]){
    if(clear(x,-203.4,.3))shrubs.push([x,-203.4,1.5+rnd()*.28,1.8+rnd()*.38,1.12,rnd()]);
  }
  if(data.building.some(b=>b[4]===softwareId)){
    for(const [x,h] of [[34,6.5],[59,5.3],[67,5.9],[76,6.3],[83,5.5]])tree(x,-184.8,h,'vase',false);
    for(let q=7;q<62;q+=5.6){
      const x=46.3+.808*q,z=-254+.590*q,d=2.7+rnd();
      if(clear(x+.59*d,z-.808*d,.65))shrubs.push([x+.59*d,z-.808*d,1.04+rnd()*.4,1.1+rnd()*.55,.96,rnd()]);
      if(Math.round((q-7)/5.6)%2===0)tree(x+6.8,z-9.2,9.5+rnd(),'vase',true,'open');
    }
  }
  const spans=data.road.filter(([p,,name,,bridge])=>bridge && name==='九章路' && p.length===2 &&
    Math.hypot((p[0][0]+p[1][0])/2-137,(p[0][1]+p[1][1])/2+229)<16);
  const sides=spans.length===2?spans.map(([p,w],i)=>{
    const [a,b]=p[0][0]<p[1][0]?p:[p[1],p[0]],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    const other=spans[1-i][0],vx=a[0]+b[0]-other[0][0]-other[1][0],vz=a[1]+b[1]-other[0][1]-other[1][1];
    const k=Math.sign(-dz*vx+dx*vz)*(w/2-.12)/len;
    return [a,b].map(([x,z])=>[x-dz*k,z+dx*k]);
  }):[];
  return {trees,shrubs,surfaces,gateways,forecourts,bridge:{spans,sides}};
}

export function entryGap(ground,x,z,margin=0){
  return ground?.gateways.some(([a,b,kerb])=>x>a-margin && x<b+margin && Math.abs(z-kerb)<3+margin);
}

export function putFieldTrees(planned,ground,inside){
  return [...planned.filter(([x,z])=>!ground.trees.some(t=>(t[0]-x)**2+(t[1]-z)**2<19) &&
    !ground.forecourts.some(p=>inside(x,z,p)) &&
    !ground.surfaces.some(([p,,color])=>color==='#c4b9a6'&&inside(x,z,p))),...ground.trees];
}
