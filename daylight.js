import * as T from 'three';

const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};

export const LIGHTING_PRESETS = {
  noon: {
    label: '正午',
    sunPos: [-530, 750, -620],
    sunColor: '#fff0dc',
    sunIntensity: 2.55,
    hemiSky: '#e2efff',
    hemiGround: '#a09c8d',
    hemiIntensity: 1.28,
    exposure: 1.12,
    envIntensity: 0.46,
    orbitFog: ['#cad6d6', 0.00019],
    walkFog: ['#dce4e4', 0.00082],
    sky: { horizon: [220, 228, 228], zenith: [95, 152, 207], earth: [109, 122, 99], cloud: [246, 246, 239], sun: [255, 232, 200], cloudCover: 0.64, stars: 0 },
    lampEmissive: 0.25,
    lampHalo: 0,
    windowGlow: 0,
    darkUi: false
  },
  morning: {
    label: '清晨',
    sunPos: [720, 310, 260],
    sunColor: '#ffe0b8',
    sunIntensity: 2.35,
    hemiSky: '#d9eeff',
    hemiGround: '#929788',
    hemiIntensity: 1.12,
    exposure: 1.08,
    envIntensity: 0.42,
    orbitFog: ['#dad8cf', 0.00023],
    walkFog: ['#e6e2d8', 0.00095],
    sky: { horizon: [244, 228, 210], zenith: [108, 160, 214], earth: [104, 114, 94], cloud: [255, 244, 228], sun: [255, 214, 164], cloudCover: 0.56, stars: 0 },
    lampEmissive: 0.45,
    lampHalo: 0.12,
    windowGlow: 0,
    darkUi: false
  },
  sunset: {
    label: '黄昏',
    sunPos: [-820, 210, 340],
    sunColor: '#ffa559',
    sunIntensity: 2.7,
    hemiSky: '#ffba92',
    hemiGround: '#635958',
    hemiIntensity: 0.92,
    exposure: 1.04,
    envIntensity: 0.38,
    orbitFog: ['#d8b9a5', 0.00024],
    walkFog: ['#e2c1ab', 0.00094],
    sky: { horizon: [246, 174, 130], zenith: [64, 88, 144], earth: [82, 76, 70], cloud: [255, 202, 164], sun: [255, 172, 102], cloudCover: 0.62, stars: 0 },
    lampEmissive: 1.9,
    lampHalo: 0.55,
    windowGlow: 0.42,
    darkUi: false
  },
  night: {
    label: '夜景',
    sunPos: [380, 560, -480],
    sunColor: '#8fb2eb',
    sunIntensity: 0.65,
    hemiSky: '#44608d',
    hemiGround: '#242f3b',
    hemiIntensity: 0.72,
    exposure: 1.06,
    envIntensity: 0.28,
    orbitFog: ['#1a2638', 0.00023],
    walkFog: ['#203046', 0.00084],
    sky: { horizon: [32, 47, 70], zenith: [11, 18, 34], earth: [22, 28, 34], cloud: [44, 60, 84], sun: [176, 204, 245], cloudCover: 0.34, stars: 0 },
    lampEmissive: 3.6,
    lampHalo: 1.0,
    windowGlow: 0.92,
    darkUi: true
  }
};

const skyCache = new Map();

// A static panorama drives both the visible sky and the light reflected in glass.
// Sample by direction, so turning on the spot never reveals a seam in the clouds.
export function campusSky(sunDirection, presetName = 'noon') {
  if (skyCache.has(presetName)) return skyCache.get(presetName);
  const preset = LIGHTING_PRESETS[presetName] ?? LIGHTING_PRESETS.noon;
  const { horizon, zenith, earth, cloud, sun, cloudCover, stars } = preset.sky;
  const w=512,h=256,canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const c=canvas.getContext('2d'), img=c.createImageData(w,h), data=img.data;
  const noise=new Float32Array(256*256);
  let state=47971;
  for(let i=0;i<noise.length;i++)noise[i]=(state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296;
  function sample(x,z){
    const a=Math.floor(x),b=Math.floor(z),u=smooth(x-a),v=smooth(z-b);
    const k=(a&255)+((b&255)<<8),l=((a+1)&255)+((b&255)<<8);
    return mix(mix(noise[k],noise[l],u),mix(noise[(k+256)&65535],noise[(l+256)&65535],u),v);
  }
  const sdx=sunDirection.x,sdy=sunDirection.y,sdz=sunDirection.z;
  const cosAz=new Float32Array(w),sinAz=new Float32Array(w);
  for(let x=0;x<w;x++){const az=((x+.5)/w-.5)*Math.PI*2;cosAz[x]=Math.cos(az);sinAz[x]=Math.sin(az);}
  for(let y=0;y<h;y++){
    const lat=(.5-(y+.5)/h)*Math.PI,dy=Math.sin(lat),r=Math.cos(lat);
    const above=dy>=0;
    const fade=above?smooth(dy*8):0,height=above?Math.pow(dy,.55):smooth(-dy*4);
    const scale=above?2.2/(dy+.09):0;
    const baseR=above?mix(horizon[0],zenith[0],height):mix(horizon[0],earth[0],height);
    const baseG=above?mix(horizon[1],zenith[1],height):mix(horizon[1],earth[1],height);
    const baseB=above?mix(horizon[2],zenith[2],height):mix(horizon[2],earth[2],height);
    for(let x=0;x<w;x++){
      const dx=r*cosAz[x],dz=r*sinAz[x];
      const mu=dx*sdx+dy*sdy+dz*sdz;
      let vr=baseR,vg=baseG,vb=baseB;
      if(dy>0){
        const u=dx*scale+27,v=dz*scale+60;
        const n=.40*sample(u,v)+.25*sample(u*2+.7,v*2)+.17*sample(u*4,v*4)+.11*sample(u*8,v*8)+.07*sample(u*16,v*16);
        const cover=fade*cloudCover*smooth((n-.50)*4.7);
        if(cover>0){vr=mix(vr,cloud[0],cover);vg=mix(vg,cloud[1],cover);vb=mix(vb,cloud[2],cover);}
        if(stars && dy>.08 && cover<.15){
          const sh=noise[((x*37+y*91)&255)+(((x*13^y*53)&255)<<8)];
          if(sh>.9945){
            const tw=(sh-.9945)/(.0055)*smooth((dy-.08)*4);
            vr=mix(vr,235,tw);vg=mix(vg,242,tw);vb=mix(vb,255,tw);
          }
        }
      }
      if(mu>.2){
        const warm=Math.pow(mu,9)*(stars?.14:.23);
        vr=mix(vr,sun[0],warm);vg=mix(vg,sun[1],warm);vb=mix(vb,sun[2],warm);
        if(mu>.99){
          const glow=Math.pow(mu,1600)*(stars?.65:.8);
          vr=mix(vr,255,glow);vg=mix(vg,255,glow);vb=mix(vb,255,glow);
        }
      }
      const i=4*(y*w+x);
      data[i]=vr;data[i+1]=vg;data[i+2]=vb;data[i+3]=255;
    }
  }
  c.putImageData(img,0,0);
  const sky=new T.CanvasTexture(canvas);
  sky.name='Campus sky: '+presetName;sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;
  skyCache.set(presetName, sky);
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
