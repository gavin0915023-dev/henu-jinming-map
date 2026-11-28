import {campusAvenueData} from './avenue.js';
import {bridgeDeck,fieldGround} from './field-ground.js';
import {buildingSolids} from './wenfu.js';
import {eastGateBlockers,hasEastGate,standId} from './east-campus.js';
import {publicBlockers} from './campus-commons.js';
import {stadiumFence} from './stadium-bowl.js';
import {westGateWall} from './west-gate-plan.js';

export const contains = (x, z, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a,b] = ring[i], [c,d] = ring[j];
    if ((b > z) !== (d > z) && x < (c - a) * (z - b) / (d - b) + a) inside = !inside;
  }
  return inside;
};
export const bounds = points => points.reduce(([a,b,c,d],[x,z]) =>
  [Math.min(a,x),Math.min(b,z),Math.max(c,x),Math.max(d,z)],[Infinity,Infinity,-Infinity,-Infinity]);

const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const region=ring=>({ring,box:bounds(ring)});
const inRegion=(x,z,{ring,box:[l,n,r,s]})=>x>=l&&x<=r&&z>=n&&z<=s&&contains(x,z,ring);

// Take the cuts at polygon edges, then inspect the intervals. Sampling every
// few metres could miss a thin fence or reject a bridge across otherwise wet land.
export function createWalkingSpace({walls=[],water=[],deck=null}={}){
  const solid=walls.map(region),wet=water.map(region),crossing=deck&&region(deck);
  const regions=crossing?[...solid,...wet,crossing]:[...solid,...wet];
  const onDeck=(x,z)=>Boolean(crossing&&inRegion(x,z,crossing));
  const blocked=(x,z)=>solid.some(p=>inRegion(x,z,p))||(!onDeck(x,z)&&wet.some(p=>inRegion(x,z,p)));
  function openIntervals(a,b){
    const l=Math.min(a[0],b[0]),r=Math.max(a[0],b[0]),n=Math.min(a[1],b[1]),s=Math.max(a[1],b[1]);
    const overlaps=regions.filter(({box:[x,z,u,v]})=>u>=l&&x<=r&&v>=n&&z<=s);
    if(!overlaps.length)return [[0,1]];
    const dx=b[0]-a[0],dz=b[1]-a[1],cuts=[0,1];
    for(const {ring} of overlaps)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const p=ring[j],q=ring[i],ex=q[0]-p[0],ez=q[1]-p[1];
      const denom=dx*ez-dz*ex;
      if(Math.abs(denom)<1e-10)continue;
      const x=p[0]-a[0],z=p[1]-a[1],t=(x*ez-z*ex)/denom,u=(x*dz-z*dx)/denom;
      if(t>0&&t<1&&u>=-1e-9&&u<=1+1e-9)cuts.push(t);
    }
    cuts.sort((a,b)=>a-b);
    const intervals=[];
    for(let i=1;i<cuts.length;i++){
      const u=cuts[i-1],v=cuts[i];
      if(v-u<1e-9||blocked(...lerp(a,b,(u+v)/2)))continue;
      if(intervals.length&&u-intervals.at(-1)[1]<1e-9)intervals.at(-1)[1]=v;
      else intervals.push([u,v]);
    }
    return intervals;
  }
  function clear(a,b){
    if(blocked(...a)||blocked(...b))return false;
    const spans=openIntervals(a,b);
    return spans.length===1&&spans[0][0]===0&&spans[0][1]===1;
  }
  function openSegments(a,b){
    const setback=.38/Math.max(.01,Math.hypot(b[0]-a[0],b[1]-a[1]));
    return openIntervals(a,b).flatMap(([u,v])=>{
      if(u>0||blocked(...a))u+=setback;
      if(v<1||blocked(...b))v-=setback;
      return v>u?[[lerp(a,b,u),lerp(a,b,v)]]:[];
    });
  }
  return {blocked,clear,onDeck,openSegments};
}

export function prepareWalkingMap(source){
  const shaped=campusAvenueData(source),data={...shaped,field:fieldGround(shaped,contains)};
  const solids=[...buildingSolids(data.building)];
  const walls=solids.filter(s=>s.base<2.45&&!s.walkSurface).map(s=>s.p);
  walls.push(...publicBlockers(data));
  if(hasEastGate(data))walls.push(...eastGateBlockers());
  const fence=data.building.some(r=>r[4]===standId)&&stadiumFence(data),west=westGateWall(data);
  if(fence)walls.push(fence);
  if(west)walls.push(west);
  return {data,solids,space:createWalkingSpace({walls,water:data.water,deck:bridgeDeck(data.field)})};
}
