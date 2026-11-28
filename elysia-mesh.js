import * as T from './assets/three.module.min.js';
import {createCelToonMaterial, buildOutlineMesh} from './elysia-toon.js';

// Modelling vocabulary for Elysia with miHoYo-style multi-material NPR cel
// shading (hair angel-ring, warm porcelain skin, lilac-shaded silk, sparkling
// crystal) and distance-adaptive colored inverted-hull anime outlines.
const TAU = Math.PI * 2;
const linear = Float32Array.from({length:256}, (_,i) => T.ColorManagement.toWorkingColorSpace(new T.Color().setRGB(i/255,0,0),T.SRGBColorSpace).r);
export const group = (parent, name, x=0,y=0,z=0, kind=null) => {
  const g=new T.Group(); g.name=name; g.position.set(x,y,z);
  if(kind)g.userData.toonKind=kind;
  parent.add(g); return g;
};
export function mix(a,b,t) {
  t=Math.max(0,Math.min(1,t)); const u=1-t;
  return (Math.round((a>>16)*u+(b>>16)*t)<<16) |
    (Math.round(((a>>8)&255)*u+((b>>8)&255)*t)<<8) | Math.round((a&255)*u+(b&255)*t);
}
export function curve(keys,t) {
  const x=Math.max(0,Math.min(1,t))*(keys.length-1),i=Math.min(keys.length-2,Math.floor(x)),u=x-i;
  const a=keys[Math.max(0,i-1)],b=keys[i],c=keys[i+1],d=keys[Math.min(i+2,keys.length-1)];
  return b.map((v,k)=>v+.5*u*((c[k]-a[k])+u*((2*a[k]-5*v+4*c[k]-d[k])+u*(3*v-3*c[k]+d[k]-a[k]))));
}
export function sculpt({coarse=false}={}) {
  const buckets=new Map();
  const materials={
    silk:createCelToonMaterial({name:'Elysia · Silk Toon',shadowTint:0xc8bce8,rimTint:0xfff4ff,rimStrength:.26,specular:.20}),
    skin:createCelToonMaterial({name:'Elysia · Skin Toon',shadowTint:0xf4c5bf,rimTint:0xfff6f2,rimStrength:.14,specular:0}),
    hair:createCelToonMaterial({name:'Elysia · Hair Toon',shadowTint:0xdc82b2,rimTint:0xffeef8,rimStrength:.30,angelRing:true}),
    crystal:createCelToonMaterial({name:'Elysia · Crystal Toon',shadowTint:0xbfb5ec,rimTint:0xe2fbff,rimStrength:.38,specular:.58,emissive:.16})
  };
  const outlineSpec={
    silk:[0x78659c,.0013],
    skin:[0xc9938f,.0010],
    hair:[0xa65b82,.0014],
    crystal:[0x7a5c9e,.0012]
  };
  function surface(joint,nu,nv,position,colour,flip=false,uvFn=null) {
    if(!buckets.has(joint))buckets.set(joint,{p:[],c:[],uv:[],ix:[]});
    const b=buckets.get(joint),offset=b.p.length/3;
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
      const u=i/nu,v=j/nv,p=position(u,v);
      const col=typeof colour==='function'?colour(u,v):colour;
      b.p.push(...p); b.c.push(linear[col>>16],linear[(col>>8)&255],linear[col&255]);
      if(uvFn){const uv=uvFn(u,v,p);b.uv.push(uv[0],uv[1]);}
      else b.uv.push(u,v);
    }
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
      const a=offset+j*(nu+1)+i,c=a+nu+1;
      if(flip)b.ix.push(a,c,a+1,a+1,c,c+1);else b.ix.push(a,a+1,c,a+1,c+1,c);
    }
  }
  function loft(j,rows,col,n=24) {
    const ordered=rows.map(([y,w,d,z=0,x=0])=>[y,w,d,z,x]).sort((a,b)=>a[0]-b[0]);
    surface(j,coarse?Math.max(8,Math.round(n*.65)):n,ordered.length-1,(u,v)=>{
      const [y,w,d,z,x]=ordered[Math.round(v*(ordered.length-1))],a=TAU*u;
      return [x+w*Math.sin(a),y,z-d*Math.cos(a)];
    },col,true);
  }
  function oval(j,center,r,col,n=16,m=10) {
    surface(j,coarse?Math.max(8,n>>1):n,coarse?Math.max(5,m>>1):m,(u,v)=>{
      const a=TAU*u,b=Math.PI*v,s=Math.sin(b);
      return [center[0]+r[0]*s*Math.sin(a),center[1]+r[1]*Math.cos(b),center[2]-r[2]*s*Math.cos(a)];
    },col);
  }
  function strand(j,knots,col,axis=[1,0,0],steps,radial=8){
    const stepsV=steps??Math.max(4,(knots.length-1)*(coarse?2:3)),frames=[];
    const guide=new T.Vector3(...axis);
    for(let k=0;k<=stepsV;k++){
      const t=k/stepsV,p=curve(knots,t),l=curve(knots,t-.001),r=curve(knots,t+.001);
      const tan=new T.Vector3(r[0]-l[0],r[1]-l[1],r[2]-l[2]).normalize();
      const w=guide.clone().addScaledVector(tan,-guide.dot(tan));
      if(w.lengthSq()<.001){
        if(Math.abs(tan.z)<.8)w.set(0,0,1).addScaledVector(tan,-tan.z);
        else w.set(0,1,0).addScaledVector(tan,-tan.y);
      }
      w.normalize(); const d=new T.Vector3().crossVectors(w,tan).normalize();
      frames.push([p,w,d]);
    }
    surface(j,coarse?Math.min(6,radial):radial,stepsV,(u,v)=>{
      const [p,w,d]=frames[Math.round(v*stepsV)],a=TAU*u;
      const s=Math.max(.0001,p[3])*Math.cos(a),c=Math.max(.0001,p[4])*Math.sin(a);
      return [p[0]+w.x*s+d.x*c,p[1]+w.y*s+d.y*c,p[2]+w.z*s+d.z*c];
    },col);
  }
  function line(j,points,r,col,axis=[1,0,0]){
    strand(j,points.map(p=>[...p,r,r]),col,axis,Math.max(4,(points.length-1)*2),coarse?4:6);
  }
  function gem(j,x,y,z,w,h,col,front=-1){
    const flat=[[x,y+h,z],[x+w,y,z],[x,y-h,z],[x-w,y,z]];
    surface(j,4,1,(u,v)=>{
      const p=flat[Math.round(u*4)%4];return v===0?p:[x-w*.16,y+h*.14,z+front*w*.62];
    },(u,v)=>mix(col,v?0xffffff:0x7968b7,v?.58:Math.max(0,.22*Math.cos(u*TAU))),front<0);
  }
  function cloth(j,nu,nv,fn,outer,lining,thickness=.003,faceSign=1){
    const xyz=(u,v)=>new T.Vector3(...fn(u,v));
    function inset(u,v){
      const du=xyz(Math.min(1,u+.002),v).sub(xyz(Math.max(0,u-.002),v));
      const dv=xyz(u,Math.min(1,v+.002)).sub(xyz(u,Math.max(0,v-.002)));
      const n=du.cross(dv).normalize();
      return xyz(u,v).addScaledVector(n,-thickness*faceSign).toArray();
    }
    surface(j,nu,nv,fn,outer,faceSign<0);surface(j,nu,nv,inset,lining,faceSign>0);
    for(const side of [0,1])for(const edge of [0,1]){
      const where=t=>side?[edge,t]:[t,edge];
      surface(j,side?nv:nu,1,(t,f)=>{
        const [u,v]=where(t);return f?inset(u,v):fn(u,v);
      },lining);
    }
  }
  function finish() {
    const meshes=[];
    for(const [joint,b] of buckets){
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));
      g.setAttribute('color',new T.Float32BufferAttribute(b.c,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));
      g.setIndex(b.ix);g.computeVertexNormals();g.computeBoundingSphere();
      const kind=joint.userData.toonKind??'silk';
      const customMat=joint.userData.customMaterial;
      const mat=customMat??materials[kind]??materials.silk;
      const m=new T.Mesh(g,mat);m.name=joint.name+' · mesh';
      m.frustumCulled=true;joint.add(m);meshes.push(m);
      if(!coarse&&!joint.userData.noOutline){
        const [oc,ow]=joint.userData.outline??outlineSpec[kind]??outlineSpec.silk;
        joint.add(buildOutlineMesh(m,oc,ow));
      }
    }
    return meshes;
  }
  return {surface,loft,oval,strand,line,gem,cloth,finish,materials};
}
