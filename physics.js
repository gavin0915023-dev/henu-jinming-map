import { surfaceBuilder } from './survey-mesh.js';
// Local metres: u runs east along the long wall of C, v faces its entrance court.
// The cone axis is estimated by intersecting bearings from the two courtyard views.
export const labId='712688931', coneId='1272439408';
const length=Math.hypot(43.6,7.1), dx=43.6/length,dz=7.1/length;
const at=([u,y,v])=>[-135.8+u*dx-v*dz,y,227+u*dz+v*dx];
const local=(x,z)=>[(x+135.8)*dx+(z-227)*dz,-(x+135.8)*dz+(z-227)*dx];
const plan=p=>p.map(([u,v])=>{const [x,,z]=at([u,0,v]);return [x,z];});
const rectangle=(u0,u1,v0,v1)=>plan([[u0,v0],[u1,v0],[u1,v1],[u0,v1],[u0,v0]]);
export const cone={u:60.1,v:-9.9,radius:10.65,platform:10.35,top:36.8};
const steps=4, paving=.94, rise=.15, landing=paving+steps*rise;
const brick='#a65b46', brickDark='#914b3d', mortar='#d5c4b7', white='#dad8ce', frame='#c7c9c2';
const steel='#9caaad',metal='#afb2ad',baseStone='#a59b89',glass='#536773',darkGlass='#455660';
const sill='#cfc9b9', tread='#c8beac', radial=(a,r,h)=>[cone.u+r*Math.cos(a),h,cone.v+r*Math.sin(a)];
const circle=(r,n=40)=>plan(Array.from({length:n+1},(_,i)=>{const a=2*Math.PI*(i%n)/n;return [cone.u+r*Math.cos(a),cone.v+r*Math.sin(a)];}));
const courtOutline=[[22,-1],[46,-1],[46,-20],[54,-25],[68,-26],[77,-19],[77,-1],[70,5.8],[58,9],[43,11],[30,12],[21.3,10]];
export const physicsCourt=plan(courtOutline);
export const labPlaque={text:'普通物理分中心',point:at([43.27,2.97,2.72]),yaw:-Math.atan2(dz,dx),width:.36,height:2.05};
export function physicsGroundHeight(x,z){
  const [u,v]=local(x,z),r=Math.hypot(u-cone.u,v-cone.v);
  if(u>=23.4&&u<=44.7&&v>=0&&v<=5.2){
    return Math.min(landing,paving+rise*(1+Math.floor((5.2-v)/.40)));
  }
  if(r<=cone.radius+1.98)return Math.min(landing,paving+rise*(1+Math.floor((cone.radius+1.98-r)/.39)));
  return null;
}
export function* physicsSolids(record){
  const solid=(p,base,top)=>({record,p,base,top,custom:true});
  if(record[4]===labId){
    for(const u of [38.2,43.27])yield solid(rectangle(u-.32,u+.32,2.02,2.69),landing,5.02);
  }else if(record[4]===coneId){
    yield solid(circle(cone.radius),.08,cone.top);
    yield solid(rectangle(43.98,58,-13.7,-5.6),.08,12.5);
  }
}

// Each group is a small facade bay, a flat side, or a sector of the cone.
// Keep the surface, its glazing and its trim together in the Canvas painter.
// Parts are shared with the WebGL batches; detail 1/2 may be culled at distance.
export function physicsModel(records){
  const {groups,group,quad,face,box,bar}=surfaceBuilder(at,([x,y,z])=>[dx*x-dz*z,y,dz*x+dx*z]);
  // Attach overlays in increasing depth to a single wall bay. u always runs
  // west to east, even on the reverse side; flip winding on the north face.
  function bay(l,r,v,side,height,paint){
    group([(l+r)/2,height/2,v],[0,0,side]);
    const pane=(a,b,lo,hi,d,color,kind='wall',detail=0)=>{
      const q=v+side*d,pts=[[a,lo,q],[b,lo,q],[b,hi,q],[a,hi,q]];
      quad(side>0?pts:pts.reverse(),color,kind,detail);
    };
    paint(pane);
  }
  function punched(pane,a,b,y,h,ac=false){
    pane(a-.09,b+.09,y-.08,y+h+.08,.071,sill);
    pane(a,b,y,y+h,.094,glass,'glass');
    pane(b-.066,b,y,y+h,.117,'#e0dfd7','wall',1);
    pane((a+b)/2-.037,(a+b)/2+.037,y,y+h,.121,frame,'wall',1);
    if(ac){pane(b-.62,b+.27,y-.65,y-.10,.20,'#bcbcaf');pane(b-.51,b+.02,y-.56,y-.22,.25,'#888f8d','wall',1);}
  }
  function brickBays(l,r,v,side,count,north=false){
    const w=(r-l)/count;
    for(let j=0;j<count;j++){
      const a=l+j*w,b=a+w;
      bay(a,b,v,side,21,(q)=>{
        q(a,b,.09,21.11,.034,brick,'brick');
        q(a,b,.18,1.38,.058,baseStone);
        if(north)q(a+.14,b-.14,1.39,4.13,.06,'#cecac0');
        const service=north&&j>=2&&j<=4;
        for(let k=0;k<5;k++){
          const y=1.64+k*3.57;
          if(k===0&&service){
            if(j===2||j===3){q(a+.12,b-.12,.98,3.81,.096,'#5c6567');}
            else q(a+.22,a+1.05,1.0,3.25,.10,darkGlass,'glass');
            continue;
          }
          const wl=a+w*.17,wr=b-w*.16;
          punched(q,wl,wr,y,1.85,k>0&&(j+2*k)%9===1&&k%2===1);
          if(k>0){
            q(wl,wr,y-.75,y-.64,.105,mortar,'wall',1);
            q(b-.16,b-.07,y+.08,y+1.62,.103,mortar,'wall',1);
          }
        }
        if(north){
          q(a,b,18.26,21.1,.070,'#d7d8cf');punched(q,a+.24,b-.24,18.68,1.4);
        }
      });
    }
  }
  function curtain(l,r,v,side,lo,hi,cols,rows){
    bay(l,r,v,side,hi,q=>{
      q(l,r,lo,hi,.095,darkGlass,'glass');
      const w=(r-l)/cols,h=(hi-lo)/rows;
      for(let j=0;j<cols;j++)for(let k=0;k<rows;k++){
        const a=l+j*w,b=lo+k*h;
        q(a+.028,a+w-.028,b+.031,b+h-.032,.119,['#556570','#4c5c69','#61717c','#536575'][(j+2*k)%4],'glass');
      }
      for(let j=1;j<cols;j++)q(l+w*j-.036,l+w*j+.036,lo,hi,.16,'#858f92','wall',1);
    });
  }
  const lab=records.find(b=>b[4]===labId),hall=records.some(b=>b[4]===coneId);
  if(lab){
    // Cover the source shell with brick right around its returns, leaving the
    // east gable mostly solid. Front and rear bays follow the original bends.
    const ring=lab[0].map(([x,z])=>local(x,z));
    for(let i=1;i<ring.length;i++){
      const [a,b]=[ring[i-1],ring[i]],du=b[0]-a[0],dv=b[1]-a[1],w=Math.hypot(du,dv);
      if(w<.1)continue;
      const n=[dv/w,-du/w];const push=q=>[q[0]+.017*n[0],q[1]+.017*n[1]];
      group([(a[0]+b[0])/2,10,(a[1]+b[1])/2],[n[0],0,n[1]]);face(push(a),push(b),.08,21.08,brick,'brick');
    }
    brickBays(.05,24.55,.03,1,8);
    brickBays(-32.8,-.1,-8.65,1,10);
    brickBays(-27.05,39.45,-21.95,-1,21,true);
    curtain(39.45,41.5,-21.96,-1,1.2,21.2,2,12);
    // Upper white strip and its open roof colonnade belong to the north wall.
    for(let u=-26;u<40;u+=5.15)box(u,u+.35,21.02,23.32,-21.91,-21.51,white);
    box(-27.1,40.0,23.29,23.5,-22.93,-16.6,'#b9bcb8');
    // The narrow windows on the east return do not continue across the
    // taller blank gable by the stair tower.
    for(const v of [-12.0,-8.5])for(let j=0;j<3;j++){
      group([46.07,3+j*3.7,v],[1,0,0]);
      const x=46.08;quad([[x,2+j*3.7,v-.52],[x,3.44+j*3.7,v-.52],[x,3.44+j*3.7,v+.52],[x,2+j*3.7,v+.52]],glass,'glass');
    }
    box(24.55,44.16,20.96,22.05,-7.1,.026,brick,'brick');
    box(39.0,44.13,22.03,23.78,-4.3,.02,brickDark,'brick');
    curtain(24.53,37.25,.08,1,5.07,21.37,8,9);
    for(let k=0;k<4;k++){
      const y=7.12+k*3.52;box(24.48,43.92,y,y+.16,-.01,.44,'#c7c6bc');
      bay(24.6,37.2,.10,1,21,q=>{
        for(const a of [26.03,34.91]){q(a,a+1.02,y+1.10,y+1.76,.19,'#899397','wall',1);q(a,a+1.02,y+1.07,y+1.16,.24,'#404e55','wall',1);}
      });
    }
    // Glass lobby, deep overhang on two brick piers, and the broad stair.
    bay(24,38.6,.06,1,5.2,q=>{
      q(24,38.6,landing,5.19,.08,'#515f61','glass');
      for(let i=0;i<=10;i++){const x=24.1+i*1.43;q(x-.045,x+.045,landing,5.15,.15,frame);}
      for(const y of [2.16,2.69,3.39,4.09])q(24.03,38.52,y-.034,y+.034,.16,frame);
      for(const x of [27.0,33.45]){q(x,x+1.33,landing,3.65,.18,darkGlass,'glass');q(x+.64,x+.70,landing,3.62,.21,frame);}
    });
    box(23.42,45.48,4.89,5.55,-.01,3.22,brick,'brick');
    box(23.42,45.48,4.80,4.91,-.01,3.22,'#ded7c6');
    for(const u of [38.2,43.27]){
      box(u-.32,u+.32,landing,4.85,2.02,2.69,brick,'brick');
      bay(u-.2,u+.2,2.692,1,4.5,q=>q(u-.20,u+.20,1.86,4.04,.012,'#b4ad95'));
    }
    for(let i=0;i<steps;i++)box(23.4,44.7,paving+i*rise,paving+(i+1)*rise,0,5.2-i*.40,tread);
  }
  if(hall)makeHall();
  return groups;

  function makeHall(){
    const {u,v,radius:R,platform:H,top}=cone,n=40;
    // The three-storey link spans the visible gap between the separate source rings.
    box(43.98,58,.09,12.48,-13.7,-5.6,brick,'brick');
    for(const [edge,side] of [[-5.59,1],[-13.71,-1]])for(let j=0;j<4;j++){
      const a=44.25+j*3.33;
      bay(a,a+3.33,edge,side,12.5,q=>{
        for(let k=0;k<3;k++){
          const y=1.42+k*3.54;
          q(a+.15,a+3.17,y-.12,y+3.30,.04,white);punched(q,a+.20,a+3.12,y+1.12,1.61);
          q(a+.21,a+3.1,y+1.66,y+1.72,.15,frame,'wall',1);
        }
      });
    }
    const rc=y=>7.36*(top-y)/(top-H)+.10;
    const bands=[H,12.75,14.70,16.7,18.55,20.55,22.45,24.40,26.25,28.56,30.4,32.37,34.12,35.55,top];
    for(let j=0;j<n;j++){
      const a=2*Math.PI*j/n,b=2*Math.PI*(j+1)/n,m=(a+b)/2,normal=[Math.cos(m),0,Math.sin(m)];
      const bucket=(r,h,side=normal)=>group(radial(m,r,h),side);
      function skin(ra,ha,rb,hb,c,kind='wall',detail=0,l=a,r=b){
        quad([radial(l,ra,ha),radial(l,rb,hb),radial(r,rb,hb),radial(r,ra,ha)],c,kind,detail);
      }
      bucket(R,3.8);
      skin(R,landing,10.18,3.13,['#b9b9b0','#aaa99f','#c5c4b9'][j%3]);
      skin(10.18,3.13,8.74,7.7,['#697779','#687683','#738086','#818a87'][j%4],'glass');
      skin(8.74,7.7,8.3,9.35,'#aa9b81');
      for(const [r,y] of [[10.18,3.13],[9.54,5.17],[8.74,7.7]])skin(r+.015,y-.035,r+.015,y+.035,metal,'wall',1);
      skin(R+.018,landing,8.3+.018,9.35,'#a3a6a0','wall',1,a,a+.005);
      bucket(R+1,landing,[0,1,0]);
      for(let k=0;k<steps;k++){
        const outer=R+1.98-k*.39,inner=k===steps-1?R-.05:outer-.39,y=paving+(k+1)*rise;
        skin(outer,y-rise,outer,y,baseStone);skin(outer,y,inner,y,tread);
      }
      bucket(9.2,H);
      skin(8.28,9.35,9.74,9.60,'#918c7d');skin(9.74,9.60,9.74,H,'#b1b0a3');skin(9.74,H,7.40,H,'#bcbab0');
      for(const y of [H+.27,H+.56,H+.88,H+1.07])skin(9.60,y-.034,9.60,y+.034,'#d3d5ce','wall',1);
      bar(radial(a,9.60,H),radial(a,9.60,H+1.10),.045,steel);
      bucket(4.4,(H+top)/2);
      for(let k=0;k<bands.length-1;k++){
        const lo=bands[k],hi=bands[k+1],light=k===2||k===6||k===10||k===13||((k===4||k===12)&&j%9<5);
        skin(rc(lo),lo,rc(hi),hi,light?['#bdbbb1','#cfccbb','#b6b8af','#bfbbac'][j%4]:
          ['#65727d','#586775','#69737d','#5e6a75'][j%4],light?'wall':'glass');
        skin(rc(lo)+.012,lo,rc(hi)+.012,hi,'#8a9498','wall',1,a,a+.006);
        skin(rc(lo)+.016,lo,rc(lo+.035)+.016,lo+.035,'#8d9698','wall',1);
      }
    }
    // A south-east double door and light canopy interrupt the base glazing.
    const doorAngle=37*Math.PI/180,door=(s,y,r)=>[u+Math.cos(doorAngle)*r-Math.sin(doorAngle)*s,y,v+Math.sin(doorAngle)*r+Math.cos(doorAngle)*s];
    group(door(0,3.1,R),[Math.cos(doorAngle),0,Math.sin(doorAngle)]);
    const panel=(l,r,lo,hi,c,extra=0)=>quad([door(l,lo,R+.035+extra),door(l,hi,R+.035+extra),door(r,hi,R+.035+extra),door(r,lo,R+.035+extra)],c);
    panel(-1.54,1.54,landing,4.47,frame);panel(-1.41,1.41,landing,4.34,darkGlass,.028);panel(-.035,.035,landing,4.34,frame,.055);
    quad([door(-3.65,5.83,9.05),door(-3.65,5.68,11.38),door(3.65,5.68,11.38),door(3.65,5.83,9.05)],'#a9bab8','glass');
    for(const s of [-3.5,-1.75,0,1.75,3.5])bar(door(s,5.70,11.31),door(s,6.16,8.98),.035,steel);
    // Open metal switchback on the eastern side: three flights with daylight between treads.
    const zStart=v+2.6,zEnd=v-3.35,flights=3,count=17;
    for(let f=0;f<flights;f++){
      const x=u+R+2.10-f*1.44,left=x-.66,right=x+.66;
      const z0=f%2?zEnd:zStart,z1=f%2?zStart:zEnd;
      const y0=landing+(H-landing)*f/flights,y1=landing+(H-landing)*(f+1)/flights;
      for(let i=0;i<count;i++){
        const a=z0+(z1-z0)*i/count,b=z0+(z1-z0)*(i+1)/count,y=y0+(y1-y0)*(i+1)/count;
        const n=Math.min(a,b),s=Math.max(a,b);
        box(left,right,y-.075,y,n,s,'#929b98','wall',1);
      }
      const outward=Math.sign(z1-z0),l=f===2?u+8.55:left-1.43;
      box(l,right,y1-.15,y1,Math.min(z1,z1+outward*1.02),Math.max(z1,z1+outward*1.02),'#9daba9');
      group([x,(y0+y1)/2,(z0+z1)/2]);
      for(const side of [left,right]){
        for(const h of [.55,1])bar([side,y0+h,z0],[side,y1+h,z1],.041,steel);
        for(const t of [0,.33,.66,1]){const z=z0+(z1-z0)*t,y=y0+(y1-y0)*t;bar([side,y,z],[side,y+1.02,z],.035,steel);}
        bar([side,y0-.13,z0],[side,y1-.13,z1],.10,'#737d7b');
      }
      for(const side of [left,right])bar([side,paving,z1+outward*.80],[side,y1,z1+outward*.80],.085,metal);
    }
  }
}
