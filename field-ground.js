// Local observations only: the entrance forecourt on Wenfu Road, the grove
// on Fangqiu Lake's north side, and the tree-planted verge beside Jiuzhang Bridge.
export function fieldGround(data,inside){
  const trees=[],shrubs=[],surfaces=[],gateways=[];
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
  if(data.building.some(b=>b[4]==='712688906')){
    surfaces.push([[[-15,-191.25],[1.8,-191.3],[1.8,-202.35],[40.4,-202.5],[40.4,-181.55],[-15,-181.5]],.69,'#c4b9a6']);
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
  const spans=data.road.filter(([p,,name,,bridge])=>bridge && name==='九章路' && p.length===2 &&
    Math.hypot((p[0][0]+p[1][0])/2-137,(p[0][1]+p[1][1])/2+229)<16);
  const sides=spans.length===2?spans.map(([p,w],i)=>{
    const [a,b]=p[0][0]<p[1][0]?p:[p[1],p[0]],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    const other=spans[1-i][0],vx=a[0]+b[0]-other[0][0]-other[1][0],vz=a[1]+b[1]-other[0][1]-other[1][1];
    const k=Math.sign(-dz*vx+dx*vz)*(w/2-.12)/len;
    return [a,b].map(([x,z])=>[x-dz*k,z+dx*k]);
  }):[];
  return {trees,shrubs,surfaces,gateways,bridge:{spans,sides}};
}

export function entryGap(ground,x,z,margin=0){
  return ground?.gateways.some(([a,b,kerb])=>x>a-margin && x<b+margin && Math.abs(z-kerb)<3+margin);
}

export function putFieldTrees(planned,ground,inside){
  return [...planned.filter(([x,z])=>!ground.trees.some(t=>(t[0]-x)**2+(t[1]-z)**2<19) &&
    !ground.surfaces.some(([p,,color])=>color==='#c4b9a6'&&inside(x,z,p))),...ground.trees];
}
