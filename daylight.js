import * as T from 'three';

const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};

// A static panorama drives both the visible sky and the light reflected in glass.
// Sample by direction, so turning on the spot never reveals a seam in the clouds.
export function campusSky(sunDirection) {
  const w=768,h=384,canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const c=canvas.getContext('2d'), img=c.createImageData(w,h);
  const noise=new Float32Array(256*256);
  let state=47971;
  for(let i=0;i<noise.length;i++)noise[i]=(state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296;
  function sample(x,z){
    const a=Math.floor(x),b=Math.floor(z),u=smooth(x-a),v=smooth(z-b);
    const k=(a&255)+((b&255)<<8),l=((a+1)&255)+((b&255)<<8);
    return mix(mix(noise[k],noise[l],u),mix(noise[(k+256)&65535],noise[(l+256)&65535],u),v);
  }
  const horizon=[220,228,228],blue=[95,152,207],earth=[109,122,99],cloud=[246,246,239],sun=[255,232,200];
  for(let y=0;y<h;y++){
    const lat=(.5-(y+.5)/h)*Math.PI,dy=Math.sin(lat),r=Math.cos(lat);
    const fade=smooth(dy*8),height=Math.pow(Math.max(0,dy),.55);
    for(let x=0;x<w;x++){
      const az=((x+.5)/w-.5)*Math.PI*2,dx=r*Math.cos(az),dz=r*Math.sin(az);
      const mu=Math.max(0,dx*sunDirection.x+dy*sunDirection.y+dz*sunDirection.z);
      let cover=0;
      if(dy>0){
        const scale=2.2/(dy+.09),u=dx*scale+27,v=dz*scale+60;
        const n=.40*sample(u,v)+.25*sample(u*2+.7,v*2)+.17*sample(u*4,v*4)+.11*sample(u*8,v*8)+.07*sample(u*16,v*16);
        cover=fade*.64*smooth((n-.50)*4.7);
      }
      const warm=Math.pow(mu,9)*.23,glow=Math.pow(mu,1600)*.8;
      const i=4*(y*w+x);
      for(let ch=0;ch<3;ch++){
        let value=dy>=0?mix(horizon[ch],blue[ch],height):mix(horizon[ch],earth[ch],smooth(-dy*4));
        value=mix(value,cloud[ch],cover);value=mix(value,sun[ch],warm);
        img.data[i+ch]=mix(value,255,glow);
      }
      img.data[i+3]=255;
    }
  }
  c.putImageData(img,0,0);
  const sky=new T.CanvasTexture(canvas);
  sky.name='Campus daylight';sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;
  return sky;
}

// Bake ambient shade from actual footprints and root positions into the existing
// ground material. It softens wall/ground junctions without a second ground plane.
export function shadeGround(mesh,data,trees) {
  const edge=data.boundary, xs=edge.map(p=>p[0]),zs=edge.map(p=>p[1]);
  const left=Math.min(...xs)-24, top=Math.min(...zs)-24;
  const span=Math.max(Math.max(...xs)-left,Math.max(...zs)-top)+24;
  const n=1024,s=n/span;
  function layer(){const a=document.createElement('canvas');a.width=a.height=n;return a;}
  const mask=layer(),result=layer(),c=mask.getContext('2d'),out=result.getContext('2d');
  c.fillStyle='#000';
  for(const [points,,,,,campus] of data.building){
    if(!campus||points.length<3)continue;
    c.beginPath();
    points.forEach(([x,z],i)=>{if(i===0)c.moveTo((x-left)*s,(z-top)*s);else c.lineTo((x-left)*s,(z-top)*s);});
    c.closePath();c.fill();
  }
  c.fillStyle='rgba(0,0,0,.55)';c.beginPath();
  for(const [x,z,h] of trees){
    const r=h*s*.19,a=(x-left)*s,b=(z-top)*s;
    c.moveTo(a+r,b);c.arc(a,b,r,0,2*Math.PI);
  }
  c.fill();
  out.fillStyle='#fff';out.fillRect(0,0,n,n);
  for(const [radius,alpha] of [[4*s,.39],[1.25*s,.64]]){
    out.filter='blur('+radius+'px)';out.globalAlpha=alpha;out.drawImage(mask,0,0);
  }
  const geometry=mesh.geometry,p=geometry.getAttribute('position'),uv=new Float32Array(2*p.count);
  for(let i=0;i<p.count;i++){uv[i*2]=(p.getX(i)-left)/span;uv[i*2+1]=1-(p.getZ(i)-top)/span;}
  geometry.setAttribute('uv1',new T.BufferAttribute(uv,2));
  const map=new T.CanvasTexture(result);map.name='Ambient shade at ground contacts';map.channel=1;
  mesh.material.aoMap=map;mesh.material.aoMapIntensity=.94;
}
