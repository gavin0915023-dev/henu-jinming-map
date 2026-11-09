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
  for(const [x,z,h] of trees)objects.push({center:[x,0,z],tree:h});

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
  function tree([x,,z],h,w){
    if(w<3)return;
    const [a,b,d]=point([x,h*.9,z]);
    if(d<=.65||Math.abs(a/d)>1.13||Math.abs(b/d)>1.13)return;
    const sx=(.5+a/(2*d))*width,sy=(.5-b/(2*d))*height;
    const r=Math.max(1.1,height*Math.abs(m[5])*h*.29/d);
    if(cam.position.y<60&&d<130){
      const p=point([x,0,z]);
      if(p[2]>.65){
        const bottom=(.5-p[1]/(2*p[2]))*height;
        ctx.fillStyle='#686348';ctx.fillRect(sx-r*.09,sy,r*.18,Math.max(0,bottom-sy));
      }
    }
    ctx.fillStyle='#3c5637';
    ctx.beginPath();ctx.ellipse(sx+r*.15,sy+r*.13,r*1.02,r*.87,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=['#59754a','#688451','#50734d','#748955'][Math.abs(Math.floor(x+z))%4];
    ctx.beginPath();ctx.ellipse(sx,sy,r,r*.85,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#a0ac633b';
    ctx.beginPath();ctx.ellipse(sx-r*.23,sy-r*.19,r*.61,r*.49,0,0,Math.PI*2);ctx.fill();
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
