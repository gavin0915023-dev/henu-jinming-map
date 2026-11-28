// The same local frame positions the name wall in both renderers and on foot.
export function westGatePlacement(data) {
  const axis=data.road.find(([, ,name])=>name==='明德广场中轴')?.[0];
  if(!axis?.length || axis.length<2)return null;
  const [start,end]=[axis[0],axis.at(-1)].sort((a,b)=>a[0]-b[0]);
  const angle=Math.atan2(end[1]-start[1],end[0]-start[0]);
  return [start[0]+5*Math.cos(angle)+6*Math.sin(angle),start[1]+5*Math.sin(angle)-6*Math.cos(angle),angle];
}

export function westGateWall(data){
  const pose=westGatePlacement(data);
  if(!pose)return null;
  const [x,z,angle]=pose,c=Math.cos(angle),s=Math.sin(angle);
  return [[-.68,-13.35],[.68,-13.35],[.68,13.35],[-.68,13.35]].map(([u,v])=>[x+c*u-s*v,z+s*u+c*v]);
}
