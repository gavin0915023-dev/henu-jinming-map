import { Matrix4,ShapeUtils,Vector2 } from 'three';
import { libraryFacade } from './facade.js';
import { observedTeachingFace, computingElevation, computingSignColumns } from './building-detail.js';
import { buildingSolids, softwareSign, softwareId, hallId, reportFacade } from './wenfu.js';
import { physicsModel, labId, labPlaque } from './physics.js';
import { eastModels, protectedTeachingEdge, teachingId, isStandFront, stadiumSign, standId, boundaryLines } from './east-campus.js';
import { centralModels, axisCustomEdge } from './central-axis.js';
import { facultyModels, facultyColors, facultyEdge, visibleSigns } from './faculty-sites.js';
import { hasMarco,isMarcoRing,marcoHole,surveyedCourtPlan } from './campus-commons.js';
import { westGatePlacement } from './west-gate.js';
import { avenueHedgeRuns } from './avenue.js';
import { bridgeDeck } from './field-ground.js';

const tint = (hex, factor) => {
  const n=parseInt(hex.slice(1),16);
  const channels=[n>>16,(n>>8)&255,n&255].map(c=>Math.max(0,Math.min(255,Math.round(c*factor))));
  return 'rgb('+channels.join(',')+')';
};
const poly = (points,y) => points.map(([x,z])=>[x,y,z]);
const center = points => points.reduce(([x,y,z],p)=>[x+p[0]/points.length,y+p[1]/points.length,z+p[2]/points.length],[0,0,0]);
const ribbon = (p,w,y) => p.slice(1).flatMap(([x,z],i)=>{
  const [a,b]=p[i], d=Math.hypot(x-a,z-b);
  if(d<.15)return [];
  const dx=(z-b)*w/(2*d),dz=(a-x)*w/(2*d);
  return [[[a+dx,y,b+dz],[a-dx,y,b-dz],[x-dx,y,z-dz],[x+dx,y,z+dz]]];
});

// Keep the same observed bays and entrance when WebGL is unavailable. Only the
// flat face of each element is painted; fine louvers are omitted at this level.
function flatElevation(e,h,kind,software){
  const parts=[],at=(u,y,o)=>[e.ax+e.tx*u+e.nx*o,y,e.az+e.tz*u+e.nz*o];
  function wall(_,edge,u,y,w,h,o,color){
    if(w<.11||h<.065)return;
    parts.push([o,[at(u-w/2,y-h/2,o),at(u+w/2,y-h/2,o),at(u+w/2,y+h/2,o),at(u-w/2,y+h/2,o)],color]);
  }
  computingElevation(e,h,kind,{wall,stats:{windows:0,entrances:0},
    box(x,y,z,w,h,d,color){wall(null,e,(x-e.ax)*e.tx+(z-e.az)*e.tz,y,w,h,(x-e.ax)*e.nx+(z-e.az)*e.nz+d/2,color);},
    ledge(edge,y,d,h,color,a=0,b=e.length){wall(null,e,(a+b)/2,y-h/2,b-a,h,d,color);},
    recessedOpening(edge,u,y,w,h,trim,shadow,color){wall(null,e,u,y,w,h,.10,color);}
  },software);
  return parts.sort((a,b)=>a[0]-b[0]);
}

export function softwareRenderer(data,palette,trees,inside){
  const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d',{alpha:false});
  const matrix=new Matrix4();
  const floor=[], shadows=[], objects=[];
  let width=1,height=1,dpr=1,previous='',lighting='noon',routeFaces=[];
  function surface(points,y,color,holes=[]){
    if(!holes.length){floor.push([poly(points,y),color]);return;}
    const verts=p=>(p.length>1&&p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1]?p.slice(0,-1):p).map(([x,z])=>new Vector2(x,z));
    const border=verts(points),cuts=holes.map(verts),indices=ShapeUtils.triangulateShape(border,cuts),v=border.concat(...cuts);
    for(const tri of indices)floor.push([tri.map(i=>[v[i].x,y,v[i].y]),color]);
  }
  function line(points,w,y,color){for(const face of ribbon(points,w,y))floor.push([face,color]);}
  const holes=hasMarco(data)?[marcoHole()]:[];
  surface([[-2400,-2400],[2400,-2400],[2400,2400],[-2400,2400]],0,'#718069',holes);
  surface(data.boundary,.07,'#748861',holes);
  for(const [p,kind] of data.green)surface(p,.14,kind==='farmland'?'#7c835f':'#667d56');
  for(const p of data.plaza)surface(p,.45,'#a7a590',isMarcoRing(p)?holes:[]);
  for(const [p,y,color] of data.field.surfaces)surface(p,y,color);
  for(const p of data.water){
    surface(p,.25,'#417879');
    line(p,1.2,.28,'#99ae95');
  }
  const sortedSport=[...data.sport].sort((a,b)=>+(b[1]==='sports_centre')-+(a[1]==='sports_centre'));
  for(const [p,kind,sport,name] of sortedSport){
    const xs=p.map(x=>x[0]),zs=p.map(x=>x[1]);
    const x=Math.min(...xs),z=Math.min(...zs),u=Math.max(...xs),v=Math.max(...zs);
    const cx=(x+u)/2,cz=(z+v)/2;
    const surveyed=surveyedCourtPlan(p,sport);
    if(surveyed){
      surface(p,.60,surveyed.finish.apron);
      for(const f of surveyed.cells){
        const tennis=sport==='tennis',w=tennis?10.97:Math.min(15,f.width-2.3),len=tennis?23.77:Math.min(28,f.length-3),l=-w/2,r=w/2,t=-len/2,b=len/2;
        const at=([x,z])=>[f.c[0]+f.u[0]*x+f.v[0]*z,f.c[1]+f.u[1]*x+f.v[1]*z];
        const mark=q=>line(q.map(at),.17,.71,'#e1e0cf');
        surface([[l-1,t-1.1],[r+1,t-1.1],[r+1,b+1.1],[l-1,b+1.1]].map(at),.63,surveyed.finish.play);
        mark([[l,t],[r,t],[r,b],[l,b],[l,t]]);mark([[l,0],[r,0]]);
        if(tennis){for(const x of [l*.75,r*.75])mark([[x,t],[x,b]]);
          for(const z of [-6.4,6.4])mark([[l*.75,z],[r*.75,z]]);mark([[0,-6.4],[0,6.4]]);}
        else{for(const s of [-1,1])mark([[-2.45,s*b],[-2.45,s*(b-5.8)],[2.45,s*(b-5.8)],[2.45,s*b]]);
          mark(Array.from({length:25},(_,i)=>[1.8*Math.cos(i*Math.PI/12),1.8*Math.sin(i*Math.PI/12)]));}
      }
      continue;
    }
    const ball=/soccer|football/.test(sport);
    surface(p,.31,kind==='track'?'#9f6754':kind==='sports_centre'?'#586f50':ball?'#557a4c':'#688353');
    if(kind==='sports_centre'&&name==='志义体育场'){
      const track=[];
      for(let j=0;j<=48;j++){
        const a=j*Math.PI/24, s=Math.sin(a),c=Math.cos(a);
        track.push([cx+c*59,cz+s*50+Math.sign(s)*55]);
      }
      surface(track,.34,'#9e6151');
      line(track,1,.35,'#ceb391');
    }
    if(!ball||u-x<20||v-z<24)continue;
    const a=x+4,b=z+5,c=u-4,d=v-5;
    line([[a,b],[c,b],[c,d],[a,d],[a,b]],.65,.37,'#c9d3ad');
    line([[a,cz],[c,cz]],.65,.37,'#c9d3ad');
    const ring=Array.from({length:25},(_,i)=>[cx+8*Math.cos(i*Math.PI/12),cz+8*Math.sin(i*Math.PI/12)]);
    line(ring,.65,.37,'#c9d3ad');
    line([[cx-12,b],[cx-12,b+11],[cx+12,b+11],[cx+12,b]],.65,.37,'#c9d3ad');
    line([[cx-12,d],[cx-12,d-11],[cx+12,d-11],[cx+12,d]],.65,.37,'#c9d3ad');
  }
  const roadTypes=['trunk','primary','secondary','tertiary'];
  for(const road of data.road){
    const [p,w,,type,bridge]=road;
    const major=roadTypes.includes(type), y=bridge?.8:.55;
    line(p,w+1.7,y,major?'#57645d':'#7a876f');
    line(p,w,y+.03,road===data.avenue?.road?'#aaa092':major?'#9a9d8f':w>3?'#aaa995':'#a1a78b');
    if(major)line(p,.55,y+.05,'#c5c3ac');
  }
  for(const p of boundaryLines(data))line(p,1.4,.63,'#a7be82');
  const sides=data.field.bridge.sides;
  if(sides.length){
    surface(bridgeDeck(data.field),1.055,'#b6afa4');
    for(const [s,t] of sides){
      const length=Math.hypot(t[0]-s[0],t[1]-s[1]),bays=Math.max(1,Math.round(length/1.9));
      const v=(f,y)=>[s[0]+(t[0]-s[0])*f,y,s[1]+(t[1]-s[1])*f];
      for(let i=0;i<bays;i++){
        const lo=i/bays,hi=(i+1)/bays;
        const slab=(a,b,y,h)=>[v(a,y),v(b,y),v(b,h),v(a,h)];
        objects.push({center:v((lo+hi)/2,1.5),parts:[[slab(lo,hi,.65,1.12),'#969687'],[slab(lo,hi,1.12,1.53),'#bebcb2'],
          [slab(lo,hi,1.74,1.88),'#c9c7bb'],[slab(lo,lo+.11/length,1.1,2.06),'#c5c4b9'],[slab(hi-.11/length,hi,1.1,2.06),'#c5c4b9']]});
      }
    }
  }
  for(const [x,z,rx,h,rz,tone,leaf,lift=0] of data.field.shrubs){
    const ring=Array.from({length:9},(_,i)=>[x+rx*Math.cos(i*Math.PI/4),z+rz*Math.sin(i*Math.PI/4)]);
    const rim=poly(ring,lift+h*.48),parts=[];
    for(let i=0;i<8;i++)parts.push([[rim[i],rim[i+1],[x,h+lift,z]],tint(leaf??'#657c4b',.90+tone*.16)],
      [[rim[i],rim[i+1],[ring[i+1][0],lift+.20,ring[i+1][1]],[ring[i][0],lift+.20,ring[i][1]]],leaf??'#566b45']);
    objects.push({center:[x,lift+h*.48,z],parts});
  }
  for(const [a,b,z] of avenueHedgeRuns(data,inside)){
    for(let x=a;x<b;x+=9){
      const u=Math.min(x+9,b),top=poly([[x,z-.55],[u,z-.55],[u,z+.55],[x,z+.55]],1.07);
      objects.push({center:[(x+u)/2,.64,z],parts:[[top,'#708654'],
        [[top[0],top[1],[u,.26,z-.55],[x,.26,z-.55]],'#506c49'],
        [[top[2],top[3],[x,.26,z+.55],[u,.26,z+.55]],'#56754d']]});
    }
  }
  const gate=westGatePlacement(data);
  if(gate){
    const [gx,gz,angle]=gate,co=Math.cos(angle),si=Math.sin(angle);
    const at=(x,y,z)=>[gx+x*co-z*si,y,gz+x*si+z*co];
    const part=(x,bottom,top,from,to)=>[at(x,bottom,from),at(x,bottom,to),at(x,top,to),at(x,top,from)];
    objects.push({center:at(0,2,0),parts:[[part(.5,.74,3.64,-13.1,13.1),'#c2a583'],
      [[at(.5,3.64,-13.1),at(.5,3.64,13.1),at(-.52,3.64,13.1),at(-.52,3.64,-13.1)],'#d8bf99'],
      [part(-.52,.74,3.59,-13.1,13.1),'#ccb08a'],[part(-1.2,.55,1.03,-13,13),'#79644e']],
      sign:()=>{if((cam.position.x-gx)*co+(cam.position.z-gz)*si<0)
        [...'河南大学'].forEach((ch,i)=>glyph(ch,at(-.56,2.31,(i-1.5)*5.5),1.98));}});
  }
  if(data.building.some(b=>b[4]===softwareId)){
    const {x,z,width,height,base,angle}=softwareSign;
    const at=(a,y)=>[x+a*Math.cos(angle),base+y,z-a*Math.sin(angle)];
    objects.push({center:at(0,height/2),parts:[[[at(-width/2,0),at(width/2,0),at(width/2,height),at(-width/2,height)],'#c9bfa8']],
      sign:()=>[...'软件学院'].forEach((ch,i)=>glyph(ch,at(0,height*(.84-.21*i)),.59,'#9e3f33'))});
  }
  const hall=data.building.find(b=>b[4]===hallId);
  if(hall)for(const bay of reportFacade(hall[0]))objects.push({center:bay.center,parts:bay.parts,southFace:true});
  if(data.building.some(b=>b[2]==='library'))objects.push({center:[-181,16,-73],normal:[-1,0,0],parts:libraryFacade});
  for(const g of [...physicsModel(data.building),...eastModels(data),...centralModels(data),...facultyModels(data)])objects.push(g);
  for(const {text,point:[x,y,z],height,width,yaw,color,horizontal} of visibleSigns(data))
    objects.push({center:[x,y,z],normal:[Math.sin(yaw),0,Math.cos(yaw)],parts:[],sign:()=>{
      [...text].forEach((ch,i)=>{const t=(i+.5)/text.length-.5;glyph(ch,horizontal?[x+width*t*Math.cos(yaw),y,z-width*t*Math.sin(yaw)]:[x,y-height*t,z],(horizontal?height:width)*.83,color);});
    }});
  if(data.building.some(b=>b[4]===standId)){
    const {point:[x,y,z],text,width,color}=stadiumSign;
    objects.push({center:[x,y,z],normal:[-1,0,0],parts:[],sign:()=>{
      [...text].forEach((ch,i)=>glyph(ch,[x,y,z+width*((i+.5)/text.length-.5)],1.82,color));
    }});
  }
  if(data.building.some(b=>b[4]===labId)){
    const {point:[x,y,z],text,height,yaw}=labPlaque;
    objects.push({center:[x,y,z],normal:[Math.sin(yaw),0,Math.cos(yaw)],parts:[],sign:()=>{
      [...text].forEach((ch,i)=>glyph(ch,[x,y+height*(.43-i*.14),z],.28,'#343c36'));
    }});
  }
  for(const {p,base:floor,top:height,record,custom} of buildingSolids(data.building)){
    if(custom)continue;
    const [,,type,,id,campus]=record;
    const [wall,roof]=facultyColors[id]??(id===hallId?['#b99880','#bfbaa9']:id===teachingId||id===standId?['#d8d7ce','#c3c2b9']:campus?palette[type]:palette.context);
    const top=poly(p,height),base=poly(p,floor), c=center(base);
    const faces=[];
    const orientation=p.slice(1).reduce((s,[x,z],i)=>s+p[i][0]*z-x*p[i][1],0);
    for(let i=1;id!==labId&&i<p.length;i++){
      const [x,z]=p[i-1],[a,b]=p[i];
      const orientationSign=Math.sign(orientation)||1;
      const normal=[(b-z)*orientationSign,(x-a)*orientationSign];
      const len=Math.hypot(...normal);
      if(len<.4)continue;
      const shade=.76+.23*(1+(-normal[0]-.6*normal[1])/len)/2;
      const edge={ax:x,az:z,nx:normal[0]/len,nz:normal[1]/len,tx:(a-x)/len,tz:(b-z)/len,length:len,sign:orientationSign};
      const obs=observedTeachingFace(id,edge);
      faces.push({normal,points:[base[i-1],base[i],top[i],top[i-1]],color:tint(wall,shade),len,
        plain:facultyEdge(id,edge)||axisCustomEdge(id,edge)||isStandFront(id,edge)||id===teachingId&&protectedTeachingEdge(x,z,a,b),
        elevation:obs?flatElevation(obs.edge,record[1],obs.kind,obs.software):null,sign:id==='712688906'&&obs?.kind==='south'});
    }
    shadows.push([p.map(([x,z])=>[x+height*.31,.07,z+height*.24]),'#27372d4a']);
    objects.push({center:c,top,roof:id===labId?'#b0aba0':roof,faces,height,soffit:floor>2?base:null,windows:id!==hallId&&campus&&height>11,library:type==='library'});
  }
  // Unit silhouettes can be reused at every zoom, even without WebGL.
  const forms={
    shade:{
      shape:new Path2D('M-.94 .28 Q-1.1 -.05 -.87 -.26 Q-.94 -.65 -.55 -.72 Q-.35 -1.05 -.02 -.93 Q.32 -1.11 .55 -.75 Q.92 -.77 .89 -.34 Q1.12 -.1 .91 .32 Q.91 .65 .54 .79 Q.21 1 .01 .77 Q-.37 1.04 -.57 .76 Q-.91 .78 -.94 .28Z'),
      light:new Path2D('M-.81 -.05 Q-.94 -.48 -.57 -.57 Q-.27 -1.04 .07 -.8 Q.33 -.88 .5 -.62 Q.37 -.34 .04 -.4 Q-.08 -.13 -.37 -.2 Q-.62 .02 -.81 -.05Z'),
      tones:[['#526e49','#75915b'],['#617a4b','#839958'],['#4c6d50','#698861']], radius:.36, base:.34
    },
    vase:{
      shape:new Path2D('M-.12 .91 Q-.51 .59 -.78 .22 Q-1.04 -.18 -.91 -.56 Q-.81 -.78 -.64 -.65 Q-.67 -.91 -.42 -.91 Q-.19 -1 -.04 -.72 Q.16 -1 .38 -.94 Q.66 -1 .72 -.65 Q.96 -.75 .98 -.42 Q1.03 -.03 .76 .36 Q.49 .68 .13 .91 Q0 1 -.12 .91Z'),
      light:new Path2D('M-.76 -.31 Q-.91 -.71 -.65 -.6 Q-.63 -.88 -.43 -.81 Q-.24 -.97 -.07 -.63 Q-.13 -.27 -.01 -.03 Q-.32 -.17 -.43 -.44 Q-.57 -.33 -.53 -.12Z'),
      tones:[['#69824f','#8f9e60'],['#58754a','#81915a'],['#708753','#96aa66']], radius:.27, base:.31
    },
    spire:{
      shape:new Path2D('M.01 -1 L.38 -.41 L.24 -.45 L.7 .08 L.48 .02 L.98 .7 Q.65 .74 .44 .67 Q.37 .81 0 .9 Q-.54 .84 -.97 .69 L-.5 .04 L-.69 .12 L-.25 -.42 L-.38 -.37Z'),
      light:new Path2D('M.01 -.96 L.09 -.39 L-.15 -.35 L.14 .02 L-.35 .12 L.09 .42 L-.6 .53 L-.29 .06 L-.5 .11 L-.17 -.39 L-.28 -.36Z'),
      tones:[['#385e50','#547866'],['#466b56','#628470'],['#3f6257','#60816e']], radius:.22, base:.20
    }
  };
  for(const [x,z,h,form,roadside,variant,yaw,scaleX,scaleZ] of trees){
    const style=forms[form], i=Math.min(style.tones.length-1,Math.max(0,Math.floor(variant*style.tones.length)));
    objects.push({center:[x,0,z],tree:{h,style,roadside,conifer:form==='spire',base:style.base+(roadside?.04:0),
      colors:style.tones[i],mirror:Math.cos(yaw)>=0?1:-1,rx:scaleX,rz:scaleZ,cos:Math.cos(yaw),sin:Math.sin(yaw)}});
  }

  let cam, m;
  function point([x,y,z]){
    return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[3]*x+m[7]*y+m[11]*z+m[15]];
  }
  function path(points,fill,stroke=null){
    const pointsClip=points.map(point);
    if(pointsClip.every(p=>p[2]<.65))return;
    const clipped=[];
    let a=pointsClip.at(-1);
    for(const b of pointsClip){
      if((a[2]>=.65)!==(b[2]>=.65)){
        const t=(.65-a[2])/(b[2]-a[2]);
        clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,.65]);
      }
      if(b[2]>=.65)clipped.push(b);
      a=b;
    }
    if(clipped.length<3||clipped.every(([x,y,w])=>x < -w)||clipped.every(([x,y,w])=>x > w)||
       clipped.every(([x,y,w])=>y < -w)||clipped.every(([x,y,w])=>y > w))return;
    ctx.beginPath();
    for(const [x,y,w] of clipped)ctx.lineTo((.5+x/(2*w))*width,(.5-y/(2*w))*height);
    ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.6;ctx.stroke();}
  }
  function tree([x,,z],t,w){
    if(w<3)return;
    const {h,base,style}=t, cy=h*(1+base)*.5, d=w+m[7]*cy;
    const topW=w+m[7]*h;
    if(d<.65||topW<.65)return;
    const a=m[0]*x+m[8]*z+m[12], b=m[1]*x+m[9]*z+m[13];
    const sx=(.5+(a+m[4]*cy)/(2*d))*width, sy=(.5-(b+m[5]*cy)/(2*d))*height;
    const p=cam.projectionMatrix.elements;
    const rightX=m[0]/p[0],rightZ=m[8]/p[0];
    const axisX=rightX*t.cos-rightZ*t.sin,axisZ=rightX*t.sin+rightZ*t.cos;
    const r=Math.max(.65,height*p[5]*h*style.radius*Math.hypot(axisX*t.rx,axisZ*t.rz)/(2*d));
    const top=(.5-(b+m[5]*h)/(2*topW))*height, foot=(.5-b/(2*w))*height;
    const ry=Math.max(.65,Math.hypot(sy-top,r*m[7]));
    if(sx+r<0||sx-r>width||Math.max(foot,sy+ry)<0||sy-ry>height)return;
    if(r>2&&foot>sy+ry*.78){
      ctx.strokeStyle='#70644e';ctx.lineWidth=Math.max(.7,r*.11);
      ctx.beginPath();ctx.moveTo(sx,foot);ctx.lineTo(sx,sy+ry*.35);
      if(!t.conifer&&r>6){
        ctx.moveTo(sx,sy+ry*.97);ctx.lineTo(sx-r*.31*t.mirror,sy+ry*.51);
        ctx.moveTo(sx,sy+ry*.83);ctx.lineTo(sx+r*.36*t.mirror,sy+ry*.42);
      }
      ctx.stroke();
      if(t.roadside){
        const y=1.35,tip=(.5-(b+m[5]*y)/(2*(w+m[7]*y)))*height;
        ctx.strokeStyle='#d6d8c8';ctx.beginPath();ctx.moveTo(sx,foot);ctx.lineTo(sx,tip);ctx.stroke();
      }
    }
    ctx.save();ctx.translate(sx,sy);ctx.scale(t.mirror*r,ry);
    // Steep views see the footprint of even a pointed evergreen.
    const shape=t.conifer&&Math.abs(m[7])>.84?forms.shade:style;
    ctx.fillStyle=t.colors[0];ctx.fill(shape.shape);
    if(r>3.4){ctx.fillStyle=t.colors[1];ctx.fill(shape.light);}
    ctx.restore();
  }
  function glyph(ch,world,size,ink='#d1ab56'){
    const [x,y,w]=point(world);if(w<.65)return;
    const px=size*height*cam.projectionMatrix.elements[5]/(2*w);
    if(px<3||px>height*2)return;
    ctx.font='bold '+px+'px KaiTi,STKaiti,SimSun,serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const sx=(.5+x/(2*w))*width,sy=(.5-y/(2*w))*height;
    ctx.fillStyle='#785a32';ctx.fillText(ch,sx+.8,sy+.8);ctx.fillStyle=ink;ctx.fillText(ch,sx,sy);
  }
  function building(obj,distance){
    for(const face of obj.faces){
      const [x,,z]=face.points[0], [nx,nz]=face.normal;
      if((cam.position.x-x)*nx+(cam.position.z-z)*nz<0)continue;
      path(face.points,face.color,'#4d554e53');
      if(obj.library&&nx/face.len<-.55)continue;
      if(face.elevation){
        if(distance<225){
          for(const [,points,color] of face.elevation)path(points,color);
          if(face.sign)for(const [word,x,top] of computingSignColumns)
            [...word].forEach((ch,i)=>glyph(ch,[-8+(x/224-.5)*4.3,13.8+(.5-(top+i*72)/520)*11.5,-190.40],1.35));
        }
        continue;
      }
      if(face.plain||!obj.windows||distance>225||face.len<9)continue;
      const [[a,,b],[c,,d]]=face.points, floors=Math.max(2,Math.round(obj.height/3.7));
      for(let row=1;row<=floors;row++){
        const y=(row-.55)*obj.height/floors;
        const count=Math.floor(face.len/4.2);
        for(let col=0;col<count;col++){
          const l=(col+.25)/count,r=(col+.64)/count;
          const u=a+(c-a)*l,v=b+(d-b)*l, s=a+(c-a)*r,t=b+(d-b)*r;
          path([[u,y,v],[s,y,t],[s,y+1.25,t],[u,y+1.25,v]],'#3e4a44aa');
        }
      }
    }
    if(cam.position.y>obj.height)path(obj.top,obj.roof,'#7c806d80');
    else if(obj.soffit&&cam.position.y<obj.soffit[0][1])path(obj.soffit,'#676057');
  }
  return {
    domElement:canvas,
    setPixelRatio(value){dpr=Math.min(value,1.45);},
    setSize(w,h){width=w;height=h;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);previous='';},
    setLighting(name){lighting=name;previous='';},
    setRoute(points){routeFaces=points&&points.length>1?ribbon(points,2.2,1.2):[];previous='';},
    setAnimationLoop(fn){const loop=t=>{fn(t);requestAnimationFrame(loop);};requestAnimationFrame(loop);},
    render(scene,camera){
      camera.updateMatrixWorld();
      matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      const state=matrix.elements.map(n=>n.toFixed(6)).join(',')+lighting+routeFaces.length;
      if(state===previous)return;
      previous=state;
      cam=camera;m=matrix.elements;
      const sky=ctx.createLinearGradient(0,0,0,height);
      const skies={
        noon:camera.position.y<20?['#a2b9bd','#e3dbb5']:['#687b71','#596c60'],
        morning:camera.position.y<20?['#9ab9d1','#f0dfd0']:['#6d7e7a','#63736b'],
        sunset:camera.position.y<20?['#667099','#f0b48d']:['#6c6266','#755f5c'],
        night:['#141f33','#25364d']
      };
      const [topSky,botSky]=skies[lighting]??skies.noon;
      sky.addColorStop(0,topSky);
      sky.addColorStop(1,botSky);
      ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
      for(const [p,c] of floor)path(p,c);
      for(const face of routeFaces)path(face,'#27b883');
      for(const [p,c] of shadows)path(p,c);
      const visible=[];
      for(const obj of objects){
        const [x,y,w]=point(obj.center);
        const margin=obj.tree?80:250;
        if(w < -margin || x < -w-margin || x > w+margin || y < -w-margin || y > w+margin)continue;
        visible.push([w,obj]);
      }
      visible.sort((a,b)=>b[0]-a[0]);
      for(const [w,obj] of visible){
        if(obj.tree)tree(obj.center,obj.tree,w);
        else if(obj.parts){
          if(obj.southFace&&cam.position.z<obj.center[2])continue;
          if(obj.normal&&obj.normal[0]*(cam.position.x-obj.center[0])+obj.normal[1]*(cam.position.y-obj.center[1])+obj.normal[2]*(cam.position.z-obj.center[2])<0)continue;
          for(const [points,color,material,detail] of obj.parts)if(!detail||w<160)path(points,material==='canopy'?color+'50':material==='fence'?color+'28':color,material==='fence'?color:null);
          obj.sign?.();
        }
        else building(obj,w);
      }
    }
  };
}
