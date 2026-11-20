// A small shared polygon stream for the GPU batches and the Canvas painter.
export function surfaceBuilder(at,vector){
  const groups=[];let g;
  function group(center,normal=null){
    g={center:at(center),normal:normal&&vector(normal),parts:[]};
    groups.push(g);
  }
  function quad(points,color,material='wall',detail=0){g.parts.push([points.map(at),color,material,detail]);}
  function face(a,b,lo,hi,color,kind='wall',detail=0){
    quad([[a[0],lo,a[1]],[a[0],hi,a[1]],[b[0],hi,b[1]],[b[0],lo,b[1]]],color,kind,detail);
  }
  function box(l,r,b,t,n,s,color,kind='wall',fine=0){
    const u=(l+r)/2,y=(b+t)/2,v=(n+s)/2;
    for(const [a,q,mid,norm] of [
      [[r,s],[l,s],[u,y,s],[0,0,1]],[[l,n],[r,n],[u,y,n],[0,0,-1]],
      [[r,n],[r,s],[r,y,v],[1,0,0]],[[l,s],[l,n],[l,y,v],[-1,0,0]]]){
      group(mid,norm);face(a,q,b,t,color,kind,fine);
    }
    group([u,t,v],[0,1,0]);quad([[l,t,n],[l,t,s],[r,t,s],[r,t,n]],color,kind,fine);
    group([u,b,v],[0,-1,0]);quad([[l,b,n],[r,b,n],[r,b,s],[l,b,s]],color,kind,fine);
  }
  // Four-sided bars used for short shade brackets and stair handrails.
  function bar(a,b,r,color,detail=1){
    const sub=b.map((x,i)=>x-a[i]),len=Math.hypot(...sub);if(len<.001)return;
    const [x,y,z]=sub.map(q=>q/len),h=Math.hypot(x,z);
    const p=h?[-z/h,0,x/h]:[1,0,0],s=[y*p[2]-z*p[1],z*p[0]-x*p[2],x*p[1]-y*p[0]];
    const edge=(v,i)=>v.map((q,j)=>q+r*((i<2?1:-1)*p[j]+(i===0||i===3?1:-1)*s[j]));
    for(let k=0;k<4;k++)quad([edge(a,k),edge(a,(k+1)%4),edge(b,(k+1)%4),edge(b,k)],color,'wall',detail);
  }
  return {groups,group,quad,face,box,bar};
}

export const frame=({x,z,out})=>{
  const at=([u,y,v])=>[x+out*v,y,z-out*u],vec=([u,y,v])=>[out*v,y,-out*u];
  return {...surfaceBuilder(at,vec),at};
};
export const patch=(f,l,r,n,s)=>[[l,n],[r,n],[r,s],[l,s]].map(([u,v])=>[f.x+f.out*v,f.z-f.out*u]);

export function clip(p,axis,q,less){
  if(!p.length)return [];
  const out=[],sign=less?1:-1;let a=p.at(-1);
  for(const b of p){
    if((sign*(a[axis]-q)<0)!==(sign*(b[axis]-q)<0)){
      const t=(q-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,i)=>v+t*(b[i]-v)));
    }
    if(sign*(b[axis]-q)<0)out.push(b);
    a=b;
  }
  return out;
}

export function panel(draw,l,r,lo,hi,v,col,kind='wall',detail=0){
  draw.group([(l+r)/2,(lo+hi)/2,v],[0,0,1]);
  draw.quad([[l,lo,v],[r,lo,v],[r,hi,v],[l,hi,v]],col,kind,detail);
}
export function panelWindow(d,l,r,lo,hi,v,count=3){
  panel(d,l-.055,r+.055,lo-.065,hi+.065,v,'#b3b6b3');
  panel(d,l,r,lo,hi,v+.033,'#586973','glass');
  for(let j=1;j<count;j++){const x=l+(r-l)*j/count;panel(d,x-.034,x+.034,lo,hi,v+.072,'#d7d3c6','wall',1);}
}
