import * as T from 'three';

const TAU = 2 * Math.PI;
const polar = (angle, distance, height) => new T.Vector3(Math.cos(angle)*distance, height, Math.sin(angle)*distance);
const rgb = hex => new T.Color(hex);
const bark = rgb('#716251'), paleBark = rgb('#dbd8c6');
const greens = {
  shade: ['#395e41', '#62834b', '#8caa61'],
  vase:  ['#405e39', '#768c49', '#a1b364'],
  spire: ['#284f47', '#47715b', '#74947a']
};

function prng(seed) {
  return () => ((seed = (Math.imul(1664525,seed) + 1013904223) >>> 0) / 4294967296);
}

// Two cutout patterns share one local atlas: a mass of broad leaves, and a
// feathered evergreen bough. Clear gaps at their edges reveal the branches.
function leafAtlas(open=false) {
  const canvas=document.createElement('canvas');
  canvas.width=512; canvas.height=256;
  const c=canvas.getContext('2d'), random=prng(3145);
  c.scale(.5,.5);
  c.fillStyle='#fff';c.fillRect(0,0,40,512);
  function dab(x,y,rx,ry,a,tone) {
    const v=Math.round(Math.min(255,Math.max(70,tone)));
    c.fillStyle='rgb('+v+','+v+','+v+')';
    c.beginPath(); c.ellipse(x,y,rx,ry,a,0,TAU); c.fill();
  }
  // Each twig carries a different number of leaves. Paint from the shade
  // underneath toward the light, retaining gaps between the outermost twigs.
  const groups=[];
  for(let i=0;i<110;i++){
    const a=random()*TAU, r=Math.sqrt(random())*(.90+.10*Math.sin(a*5)+.055*Math.sin(a*9));
    groups.push([286+178*r*Math.cos(a),257+191*r*Math.sin(a),15+random()*30,random()]);
  }
  groups.sort((a,b)=>b[1]-a[1]);
  for(const [x,y,size,v] of groups){
    const tone=113+v*52+49*(1-y/512)+15*Math.sin(x/23)*Math.cos(y/29);
    for(let i=0;i<(open?7:48);i++){
      const a=random()*TAU, r=size*Math.sqrt(random());
      const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.86;
      dab(px,py,(open?2.2:3.0)+random()*(open?3.0:5.5),(open?1.5:2.1)+random()*(open?2.2:4.0),a,tone+27*(1-(py-y)/size)+random()*30);
    }
  }
  // Open spring templates are only used on broadleaf avenue trees; skip unused conifer half.
  if(!open){
    c.save();c.translate(512,0);
    for(let i=0;i<28;i++)for(const side of [-1,1]){
      const t=i/29, y=452-t*408, dx=side*(.7+.30*random())*(34+157*Math.sin(Math.PI*(.1+.9*t)))*(1-.42*t);
      const dy=-57*(1-.65*t);
      for(let j=0;j<28;j++){
        const k=j/27, px=256+dx*k,py=y+dy*k+Math.sin(k*Math.PI)*8;
        const len=(9+random()*13)*(1-.6*k);
        dab(px,py,len,3.3+random()*2,side>0?-.85:-2.3,166+60*t+21*random());
        dab(px,py+2,len*.87,3.3+random()*2,side>0?.36:2.78,151+57*t+22*random());
      }
    }
    c.restore();
  }
  const tex=new T.CanvasTexture(canvas); tex.colorSpace=T.SRGBColorSpace;
  return tex;
}

function template(form, street, style, open=false) {
  const random=prng(5243 + 397*style + (form==='shade'?1:form==='vase'?2:3)*31);
  const colors=(open?['#70814b','#9aa75d','#b4bb73']:greens[form]).map(rgb);
  const positions=[], shades=[], uvs=[], indices=[], foliageNormals=[];
  function point(p, color, u=.016, v=.5) {
    const i=positions.length/3;
    positions.push(p.x,p.y,p.z); shades.push(color.r,color.g,color.b); uvs.push(u,v);
    return i;
  }
  function join(lo,hi) {
    for(let i=0;i<lo.length;i++) {
      const j=(i+1)%lo.length;
      indices.push(lo[i],hi[i],lo[j],lo[j],hi[i],hi[j]);
    }
  }
  // Parallel rings share the same phase at joints and shrink towards the tip.
  function limb(a,b,r0,r1,color,n=5) {
    const axis=b.clone().sub(a).normalize();
    const u=new T.Vector3().crossVectors(axis,new T.Vector3(0,0,1)).normalize();
    const v=new T.Vector3().crossVectors(u,axis);
    const lo=[],hi=[];
    for(let i=0;i<n;i++) {
      const angle=i*TAU/n, d=u.clone().multiplyScalar(Math.cos(angle)).addScaledVector(v, Math.sin(angle));
      const shade=color.clone().multiplyScalar(.85+.14*(1+Math.cos(angle)));
      lo.push(point(a.clone().addScaledVector(d,r0),shade)); hi.push(point(b.clone().addScaledVector(d,r1),shade));
    }
    join(lo,hi);
  }
  // Both sides of the twigs are lit with the crown's rounded normal field.
  // That keeps a leaf mass from flashing dark as the camera turns past a card.
  function foliage(mid, right, up, conifer, variation) {
    const corners=[],u0=conifer?.501:.055,u1=conifer?.999:.497;
    for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
      const off=right.clone().multiplyScalar(x).addScaledVector(up,y);
      const light=Math.max(0,Math.min(1,.46+off.y*1.5+variation));
      const color=colors[1].clone().lerp(colors[light>.5?2:0],Math.abs(light-.5)*1.2);
      const i=point(mid.clone().add(off),color,x<0?u0:u1,y<0?.003:.997);
      const normal=off.normalize();normal.y=.98+normal.y*.42;normal.normalize();
      corners.push(i);foliageNormals.push([i,normal]);
    }
    const [a,b,c,d]=corners;
    const center=mid.clone();center.y+=(conifer?.17:.12)*up.length();
    const i=point(center,colors[1].clone().lerp(colors[2],.22+variation), (u0+u1)/2,.5);
    foliageNormals.push([i,new T.Vector3(0,1,0)]);
    for(const [from,to] of [[a,b],[b,d],[d,c],[c,a]])indices.push(from,to,i,i,to,from);
  }
  function cluster(mid,rx,ry,rz,phase){
    for(let j=0;j<5;j++){
      const a=phase+j*2.40, tilt=[.1,-.25,.38,-.85,1.15][j];
      const r=new T.Vector3(Math.cos(a)*rx,0,-Math.sin(a)*rz).multiplyScalar(1.35);
      const up=new T.Vector3(Math.sin(a)*rx*Math.sin(tilt),ry*Math.cos(tilt),Math.cos(a)*rz*Math.sin(tilt)).multiplyScalar(1.36);
      const p=mid.clone().add(polar(a,rx*(j===4?.05:.12),ry*(random()-.5)*.38));
      foliage(p,r,up,false,(random()-.5)*.24);
    }
  }
  const base=new T.Vector3(), split=new T.Vector3(.011,form==='spire'?.43:street?.43:.32,-.009);
  const root=split.clone().multiplyScalar(.135/split.y);
  limb(base,root,.024,.019,street?paleBark:bark,6); limb(root,split,.019,.014,bark,6);
  if(form==='spire'){
    limb(split,polar(.6,.021,.97),.014,.003,bark);
    for(let tier=0;tier<8;tier++){
      const y=.38+tier*.080, radius=.258-tier*.03, n=tier===7?5:8;
      for(let k=0;k<n;k++){
        const a=k*TAU/n+tier*.95+random()*.25, r=radius*(.90+.23*random());
        const up=polar(a,r*.69,-r*(.39+random()*.3));
        const mid=polar(a,r*.48,y-r*.26);
        foliage(mid,polar(a+Math.PI/2,r*.58,r*.15),up,true,(random()-.45)*.26);
      }
    }
    for(let j=0;j<3;j++)foliage(polar(j,.002,.94),polar(j,.036,0),polar(j+1,.012,.085),true,.18);
  }else if(open){
    // The April avenue views show separate forks and early leaves all the way
    // to the tips. This template is only used on the observed street frontages.
    const phase=random()*TAU,leader=polar(phase+.7,.056,.82);
    function branch(points,radii,sides=5){
      let previous;
      for(let i=0;i<points.length;i++){
        const axis=points[Math.min(points.length-1,i+1)].clone().sub(points[Math.max(i-1,0)]).normalize();
        const u=axis.clone().cross(new T.Vector3(0,0,1)).normalize(),v=u.clone().cross(axis),ring=[];
        for(let j=0;j<sides;j++){
          const a=j*TAU/sides,p=points[i].clone().addScaledVector(u,radii[i]*Math.cos(a)).addScaledVector(v,radii[i]*Math.sin(a));
          ring.push(point(p,bark));
        }
        if(previous)join(previous,ring);previous=ring;
      }
    }
    branch([split,leader,polar(phase,.045,.95)],[.017,.006,.0011]);
    for(let k=0;k<7;k++){
      const a=phase+k*2.4,reach=.20+random()*.115,top=.82+random()*.15;
      const start=split.clone().lerp(leader,(k%4)*.12);
      const bend=polar(a-.11,reach*.47,.60+random()*.06),fork=polar(a+.06,reach*.70,top-.15);
      branch([start,bend,fork],[.013,.008,.0043],4);
      const side=polar(a-.57,reach*.88,top-.10);
      branch([bend,bend.clone().lerp(side,.50).add(polar(a,.012,-.014)),side],[.005,.003,.0009],3);
      foliage(side,polar(a,.087,0),polar(a+.8,.028,.091),false,random()*.13);
      for(let j=-1;j<=1;j++){
        const t=a+j*.31,tip=polar(t,reach*(.91+random()*.33),top+random()*.06);
        const twig=fork.clone().lerp(tip,.55);twig.x+=.014;
        branch([fork,twig,tip],[.0043,.0025,.0008],3);
        for(let l=0;l<2;l++){
          const az=t+l*1.62,mid=twig.clone().lerp(tip,.48);
          foliage(mid,polar(az,.084,0),polar(az+.9,.029,.105),false,random()*.14);
        }
      }
    }
  }else{
    const wide=form==='shade', phase=random()*TAU;
    const levels=wide?[.63,.72,.65,.76,.68,.71]:[.65,.74,.71,.79,.69];
    for(let k=0;k<levels.length;k++){
      const a=phase+k*TAU/levels.length+.36*(random()-.5);
      const reach=(wide?.238:.144)*(.81+.38*random()), y=levels[k]+(random()-.5)*.065;
      const start=split.clone();start.y+=k%3*.04;
      const end=polar(a,reach,y), bend=polar(a+.24,reach*.42,start.y+(y-start.y)*.44);
      limb(start,bend,.013,.0085,bark); limb(bend,end,.0085,.0035,bark,4);
      const radius=(wide?.215:.167)*(.89+.22*random());
      cluster(end,radius,wide?.161:.191,radius*(.85+random()*.20),a);
    }
    const lead=polar(phase+.9,wide?.065:.028,wide?.843:.811);
    limb(split,lead,.014,.004,bark);
    cluster(lead,wide?.214:.15,1-lead.y,wide?.19:.142,phase+.54);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(shades,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  for(const [i,n] of foliageNormals)geometry.attributes.normal.setXYZ(i,n.x,n.y,n.z);
  return geometry;
}

export function addTreeModels(scene, positions) {
  const batches=new Map(), helper=new T.Object3D();
  const materials=new Map();
  for(const tree of positions) {
    const [,,,form,street,variant]=tree;
    const open=tree[9]==='open', style=variant<.5?0:1, key=form+'/'+Number(street)+'/'+style+'/'+Number(open);
    if(!batches.has(key)) batches.set(key,{form,street,style,open,trees:[]});
    batches.get(key).trees.push(tree);
  }
  for(const {form,street,style,open,trees} of batches.values()){
    if(!materials.has(open))materials.set(open,new T.MeshStandardMaterial({map:leafAtlas(open),vertexColors:true,alphaTest:.32,roughness:1}));
    const mesh=new T.InstancedMesh(template(form,street,style,open),materials.get(open),trees.length);
    mesh.name='Trees: '+form+(street?' (avenue)':' (lawn)');
    trees.forEach(([x,z,h,,,variant,yaw,sx,sz],i)=>{
      helper.position.set(x,0,z); helper.scale.set(h*sx,h,h*sz); helper.rotation.y=yaw; helper.updateMatrix();
      mesh.setMatrixAt(i,helper.matrix);
      mesh.setColorAt(i,new T.Color().setRGB(.88+.12*variant,.90+.1*variant,.79+.21*(1-variant)));
    });
    mesh.castShadow=mesh.receiveShadow=true; scene.add(mesh);
  }
}
