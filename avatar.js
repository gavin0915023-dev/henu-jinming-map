import * as T from './assets/three.module.min.js';
import {buildElysia} from './elysia-costume.js';
import {animateElysia} from './elysia-motion.js';

export function createPlayerAvatar(options) {
  const rig=buildElysia(options?.coarse),motion=animateElysia(rig);
  // Keep the contact shadow on the ground while the body jumps.
  const n=48,bytes=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const r=Math.max(0,1-Math.hypot((x+.5)*2/n-1,(y+.5)*2/n-1)),i=(y*n+x)*4;
    bytes.set([47,37,65,Math.round(255*r*r*(3-2*r))],i);
  }
  const tex=new T.DataTexture(bytes,n,n,T.RGBAFormat);tex.needsUpdate=true;tex.magFilter=T.LinearFilter;
  const shadow=new T.Mesh(new T.PlaneGeometry(.85,.62),new T.MeshBasicMaterial({
    map:tex,transparent:true,opacity:.32,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2
  }));
  shadow.geometry.rotateX(-Math.PI/2);shadow.position.y=.032;rig.root.add(shadow);
  let fps=null, showHands=false;
  function applyVisibility(){
    for(const piece of rig.upper)piece.visible=!fps;
    // Keep rear trains & hip brooches hidden in FPS; looking straight down shows
    // the clean petal skirt, pale-lilac stockings & heels without any uncanny FPS hand.
    for(const piece of rig.skirts)piece.visible=!fps||piece===rig.skirt;
    if(rig.fpsArms){
      rig.fpsArms.visible=Boolean(fps&&showHands);
      if(!rig.fpsArms.visible){
        rig.fpsArms.position.set(0,1.35,0);
        rig.fpsArms.rotation.set(0,0,0);
      }
    }
  }
  function setFirstPerson(value,hands=false){
    const nextFps=Boolean(value), nextHands=Boolean(hands);
    if(fps===nextFps&&showHands===nextHands)return;
    fps=nextFps;showHands=nextHands;
    applyVisibility();
  }
  setFirstPerson(true,false);rig.root.visible=false;
  function update(p){
    const offset=fps?.19:0;
    const yaw=p.yaw??0;
    rig.root.position.set(p.x-Math.sin(yaw)*offset,p.groundY,p.z+Math.cos(yaw)*offset);
    rig.root.rotation.y=-yaw;rig.body.position.y=p.jumpY;
    shadow.scale.setScalar(Math.max(.52,1-p.jumpY*.24));shadow.material.opacity=.32/(1+p.jumpY*.74);
    if(fps&&rig.fpsArms?.visible){
      const camYaw=p.camYaw??yaw;
      const yawDelta=Math.atan2(Math.sin(camYaw-yaw),Math.cos(camYaw-yaw));
      const eyeY=(p.eyeHeight??1.70)+(p.jumpY??0)+(p.landDip??0)+(p.bobY??0);
      rig.fpsArms.position.set(p.bobX??0,eyeY,-offset);
      rig.fpsArms.rotation.order='YXZ';
      rig.fpsArms.rotation.set(p.pitch??0,-yawDelta,0);
    }
    motion.update(p);
  }
  return {root:rig.root,meshes:rig.meshes,setFirstPerson,reset:motion.reset,update,
    setVisible(value){rig.root.visible=Boolean(value);}};
}
