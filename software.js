import { Matrix4 } from 'three';
import { libraryFacade } from './facade.js';

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

export function softwareRenderer(data,palette,trees){
  const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d',{alpha:false});
  const matrix=new Matrix4();
  const floor=[], shadows=[], objects=[];
  let width=1,height=1,dpr=1,previous='';
  function surface(points,y,color){floor.push([poly(points,y),color]);}
  function line(points,w,y,color){for(const face of ribbon(points,w,y))floor.push([face,color]);}
  surface([[-2400,-2400],[2400,-2400],[2400,2400],[-2400,2400]],0,'#718069');
  surface(data.boundary,.07,'#748861');
  for(const [p,kind] of data.green)surface(p,.14,kind==='farmland'?'#7c835f':'#667d56');
  for(const p of data.plaza)surface(p,.22,'#a7a590');
  for(const p of data.water){
    surface(p,.25,'#417879');
    line(p,1.2,.28,'#99ae95');
  }
  const sortedSport=[...data.sport].sort((a,b)=>+(b[1]==='sports_centre')-+(a[1]==='sports_centre'));
  for(const [p,kind,sport,name] of sortedSport){
    const xs=p.map(x=>x[0]),zs=p.map(x=>x[1]);
    const x=Math.min(...xs),z=Math.min(...zs),u=Math.max(...xs),v=Math.max(...zs);
    const cx=(x+u)/2,cz=(z+v)/2;
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
  for(const [p,w,,type,bridge] of data.road){
    const major=roadTypes.includes(type), y=bridge?.8:.55;
    line(p,w+1.7,y,major?'#57645d':'#7a876f');
    line(p,w,y+.03,major?'#9a9d8f':w>3?'#aaa995':'#a1a78b');
    if(major)line(p,.55,y+.05,'#c5c3ac');
  }
  line(data.boundary,1.4,.63,'#a7be82');
  for(const [p,height,type,,,campus] of data.building){
    const [wall,roof]=campus?palette[type]:palette.context;
    const top=poly(p,height),base=poly(p,.08), c=center(base);
    const faces=[];
    const orientation=p.slice(1).reduce((s,[x,z],i)=>s+p[i][0]*z-x*p[i][1],0);
    for(let i=1;i<p.length;i++){
      const [x,z]=p[i-1],[a,b]=p[i];
      const orientationSign=Math.sign(orientation)||1;
      const normal=[(b-z)*orientationSign,(x-a)*orientationSign];
      const len=Math.hypot(...normal);
      if(len<.4)continue;
      const shade=.76+.23*(1+(-normal[0]-.6*normal[1])/len)/2;
      faces.push({normal,points:[base[i-1],base[i],top[i],top[i-1]],color:tint(wall,shade),len});
    }
    shadows.push([p.map(([x,z])=>[x+height*.31,.07,z+height*.24]),'#27372d4a']);
    objects.push({center:c,top,roof,faces,height,windows:campus&&height>11,library:type==='library'});
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
    objects.push({center:[x,0,z],tree:{h,style,conifer:form==='spire',base:style.base+(roadside?.04:0),
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
    }
    ctx.save();ctx.translate(sx,sy);ctx.scale(t.mirror*r,ry);
    // Steep views see the footprint of even a pointed evergreen.
    const shape=t.conifer&&Math.abs(m[7])>.84?forms.shade:style;
    ctx.fillStyle=t.colors[0];ctx.fill(shape.shape);
    if(r>3.4){ctx.fillStyle=t.colors[1];ctx.fill(shape.light);}
    ctx.restore();
  }
  function building(obj,distance){
    for(const face of obj.faces){
      const [x,,z]=face.points[0], [nx,nz]=face.normal;
      if((cam.position.x-x)*nx+(cam.position.z-z)*nz<0)continue;
      path(face.points,face.color,'#4d554e53');
      if(obj.library&&x===-176&&Math.abs(face.len-70)<1){
        for(const [points,color] of libraryFacade)path(points,color);
        continue;
      }
      if(!obj.windows||distance>225||face.len<9)continue;
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
  }
  return {
    domElement:canvas,
    setPixelRatio(value){dpr=Math.min(value,1.45);},
    setSize(w,h){width=w;height=h;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);previous='';},
    setAnimationLoop(fn){const loop=t=>{fn(t);requestAnimationFrame(loop);};requestAnimationFrame(loop);},
    render(scene,camera){
      camera.updateMatrixWorld();
      matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      const state=matrix.elements.map(n=>n.toFixed(6)).join(',');
      if(state===previous)return;
      previous=state;
      cam=camera;m=matrix.elements;
      const sky=ctx.createLinearGradient(0,0,0,height);
      sky.addColorStop(0,camera.position.y<20?'#a2b9bd':'#687b71');
      sky.addColorStop(1,camera.position.y<20?'#e3dbb5':'#596c60');
      ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
      for(const [p,c] of floor)path(p,c);
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
        else building(obj,w);
      }
    }
  };
}
