// Both renderers use the mapped inner and outer edges, including their slight
// misalignment. A synthetic oval would put the western lanes on the apron.
const open=p=>p.length>1&&p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1]?p.slice(0,-1):p;
export const signedArea=ring=>open(ring).reduce((sum,p,i,a)=>{
  const q=a[(i+1)%a.length];return sum+p[0]*q[1]-q[0]*p[1];
},0)/2;
export function inset(ring,amount){
  const a=open(ring),sign=signedArea(a)>0?1:-1;
  return a.map((p,i)=>{
    const prev=a[(i+a.length-1)%a.length],next=a[(i+1)%a.length];
    const l1=Math.hypot(p[0]-prev[0],p[1]-prev[1])||1,l2=Math.hypot(next[0]-p[0],next[1]-p[1])||1;
    const nx1=sign*(prev[1]-p[1])/l1,nz1=sign*(p[0]-prev[0])/l1;
    const nx2=sign*(p[1]-next[1])/l2,nz2=sign*(next[0]-p[0])/l2;
    const len=Math.hypot(nx1+nx2,nz1+nz2)||1,x=(nx1+nx2)/len,z=(nz1+nz2)/len;
    const m=Math.min(Math.abs(amount)*3,Math.abs(amount)/Math.max(.35,x*nx2+z*nz2))*Math.sign(amount);
    return [p[0]+x*m,p[1]+z*m];
  });
}
export function runningTracks(sport){
  const rings=sport.filter(([p,kind,game])=>kind==='pitch'&&!game&&p.length>20).map(([p])=>{
    const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]);
    return {p,c:[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2],area:Math.abs(signedArea(p))};
  });
  const near=(a,b)=>Math.hypot(a.c[0]-b.c[0],a.c[1]-b.c[1])<20;
  const tracks=rings.filter(r=>!rings.some(q=>near(q,r)&&q.area>r.area*1.1)).map(r=>({
    outer:r.p,inner:rings.find(q=>near(q,r)&&q.area<r.area*.85)?.p??inset(r.p,6.8),c:r.c
  }));
  return {rings:new Set(rings.map(r=>r.p)),tracks};
}
