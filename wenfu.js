// The 2014 Wenfu Road panoramas show a lower, peach-clad link between the
// two white wings. Its middle opening is visible through to daylight. Only
// the front roofline is constrained by the street views; the deeper hall
// retains the source footprint and estimated rear height.
export const hallId='712688908',softwareId='712688905';
export const passage={left:15.0,right:23.5,clear:4.85,front:-205.15,rear:-251,frontTop:12.5,setback:-231};
export const softwareSign={x:55.0,z:-183.1,angle:-.98,width:1.04,height:3.16,base:.65};

function clip(poly,axis,limit,lower){
  const out=[];let a=poly.at(-1);
  const inside=p=>lower?p[axis]<=limit:p[axis]>=limit;
  for(const b of poly){
    if(inside(a)!==inside(b)){
      const t=(limit-a[axis])/(b[axis]-a[axis]);
      out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
    }
    if(inside(b))out.push(b);
    a=b;
  }
  return out;
}

// Both renderers and the walking collision check consume these same solids.
export function* buildingSolids(records){
  for(const record of records){
    const [p,h,,,id]=record;
    if(id!==hallId){yield {p,base:.08,top:h+.08,record};continue;}
    const {left,right,clear,setback,frontTop}=passage,ring=p.slice(0,-1);
    for(const [strip,base] of [[clip(ring,0,left,true),.08],
      [clip(clip(ring,0,left,false),0,right,true),clear],[clip(ring,0,right,false),.08]]){
      for(const [rear,top] of [[false,frontTop],[true,h+.08]]){
        const q=clip(strip,1,setback,rear);
        if(q.length>=3)yield {p:[...q,q[0]],base,top,record};
      }
    }
  }
}

// One shared list of rectangles, returned in painter's order per bay. No
// panel, glazing or trim spans the ground-level opening. z follows the slight
// obliqueness of the surveyed front edge.
export function reportFacade(ring){
  const pair=ring.slice(1).map((b,i)=>[ring[i],b]).find(([a,b])=>b[0]-a[0]>45&&Math.abs(b[1]-a[1])<1);
  if(!pair)return [];
  const [[x0,z0],[x1,z1]]=pair,{left,right,clear,frontTop:h}=passage,groups=[];
  const at=(x,y,off)=>[x,y,z0+(z1-z0)*(x-x0)/(x1-x0)+off];
  const wall='#c59e83',mortar='#a98671',sill='#c5c7c0',steel='#9aa4a4',dark='#465257';
  function bay(a,b,base,paint){
    const parts=[];
    const rect=(l,r,d,u,o,color,glass=false)=>{
      if(r<=l||u<=d)return;
      parts.push([[at(l,d,o),at(r,d,o),at(r,u,o),at(l,u,o)],color,glass]);
    };
    rect(a,b,base,h,.03,wall);
    // Fine joints in the peach tile cladding, occluded by the window panels.
    for(let y=base+.7;y<h;y+=.85)rect(a,b,y-.017,y+.017,.044,mortar);
    for(let x=a+1.1;x<b;x+=1.28)rect(x-.014,x+.014,base,h,.047,mortar);
    paint(rect);groups.push({center:at((a+b)/2,(h+base)/2,.20),parts});
  }
  const upper=(rect,a,b,columns)=>{
    const bottom=5.72,top=h-.22;
    rect(a-.16,b+.16,bottom-.24,top+.12,.14,sill);rect(a,b,bottom,top,.20,dark,true);
    const dx=(b-a)/columns;
    for(let i=0;i<columns;i++){
      const l=a+i*dx,r=l+dx;
      rect(l+.04,r-.04,bottom+.09,top-1.66,.23,['#64747b','#586c72','#708187'][i%3],true);
      rect(l+.04,r-.04,top-1.59,top-.06,.24,'#8c9c9e',true);
      rect(l-.04,l+.04,bottom,top,.32,steel);
    }
    for(const y of [bottom+.72,top-1.61])rect(a,b,y-.045,y+.045,.30,steel);
    rect(b-.035,b+.035,bottom,top,.32,steel);
  };
  const lower=(rect,a,b,n)=>{
    const gap=(b-a)/n;
    for(let i=0;i<n;i++){
      const l=a+i*gap+.32,r=a+(i+1)*gap-.32;
      rect(l-.09,r+.09,.72,4.46,.09,sill);rect(l,r,.84,4.36,.12,'#647476',true);
      rect((l+r)/2-.045,(l+r)/2+.045,.84,4.36,.21,steel);
      for(const y of [1.85,3.36])rect(l,r,y-.05,y+.05,.21,steel);
    }
  };
  bay(x0,left,.08,rect=>{upper(rect,x0+.74,9.8,9);lower(rect,x0+.8,9.8,6);});
  bay(left,right,clear,rect=>{
    upper(rect,left+.08,right-.08,7);
    rect(left,right,clear,clear+.32,.25,sill);
  });
  bay(right,x1,.08,rect=>{upper(rect,28.45,x1-.64,9);lower(rect,28.45,x1-.7,6);});
  return groups;
}
