import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import * as T from '../assets/three.module.min.js';
import {createPlayerAvatar} from '../avatar.js';
import {makeAvatarRasterizer} from '../avatar-canvas.js';
import {WALK_PACE,RUN_PACE} from '../elysia-motion.js';

const camera=new T.OrthographicCamera(-.64,.64,1.03,-1.03,.1,20);
const output=process.argv[2];
if(output)await mkdir(output,{recursive:true});
for(const coarse of [false,true]){
  const actor=createPlayerAvatar({coarse}),raster=makeAvatarRasterizer();
  actor.setVisible(true);actor.setFirstPerson(false);
  const input={x:0,z:0,groundY:0,jumpY:0,landDip:0,velY:0,yaw:0,speed:0,grounded:true,dt:1/60};
  const frame=p=>actor.update({...input,...p});
  frame({});
  assert(actor.meshes.every(m=>m.geometry.attributes.position.array.every(Number.isFinite)));
  const triangles=actor.meshes.reduce((n,m)=>n+m.geometry.index.count/3,0);
  const bounds=new T.Box3().setFromObject(actor.root,true);
  assert(bounds.max.y>1.60&&bounds.max.y<1.85&&bounds.min.y>-.045);
  const foot=[-1,1].map(s=>actor.root.getObjectByName('heel '+s+' · mesh'));
  const toes=()=>foot.map(m=>new T.Vector3(0,-.076,-.105).applyMatrix4(m.matrixWorld));
  let prev=null,totalSlip=0,contacts=0,minY=1;
  actor.reset();
  for(let i=0;i<150;i++){
    frame({speed:WALK_PACE,distance:WALK_PACE/60,z:-i*WALK_PACE/60});
    actor.root.updateMatrixWorld(true);
    const pts=toes();
    if(i>45){
      minY=Math.min(minY,...pts.map(p=>p.y));
      if(prev)for(let k=0;k<2;k++)if(pts[k].y<.017&&prev[k].y<.017){
        totalSlip+=Math.abs(pts[k].z-prev[k].z);contacts++;
      }
    }
    prev=pts;
  }
  assert(contacts>18&&totalSlip/contacts<.015&&minY>-.04,'a supporting foot stays near its contact while the root advances');
  function stand(){actor.reset();for(let i=0;i<100;i++)frame({});}
  async function picture(name,az,pose){
    stand();if(pose)pose();
    camera.position.set(4*Math.sin(az),1.13,-4*Math.cos(az));camera.lookAt(0,.865,0);camera.updateMatrixWorld();
    const p=raster(actor,camera,420,676,'noon',650);
    assert(p&&p.displayHeight>480&&p.displayWidth>110,name+' has a visible silhouette');
    if(output&&!coarse){
      await writeFile(join(output,name+'.rgba'),p.rgba);
      const {rgba,...bounds}=p;
      await writeFile(join(output,name+'.json'),JSON.stringify(bounds));
    }
    return Buffer.from(p.rgba);
  }
  const front=await picture('front',-.14),back=await picture('back',Math.PI-.11);
  assert(!front.equals(back),'front and back must be different views of the model');
  await picture('gesture',-.48,()=>{for(let i=0;i<96;i++)frame({});});
  actor.root.updateMatrixWorld(true);
  const finger=new T.Vector3(0,-.091,-.013).applyMatrix4(actor.root.getObjectByName('hand 1').matrixWorld);
  const cheek=new T.Vector3(.084,.069,-.066).applyMatrix4(actor.root.getObjectByName('head').matrixWorld);
  assert(finger.distanceTo(cheek)<.085,'raised fingertips reach the side of the face');
  await picture('walk',2.17,()=>{for(let i=0;i<47;i++)frame({speed:WALK_PACE,distance:WALK_PACE/60});});
  await picture('run',-1.07,()=>{for(let i=0;i<53;i++)frame({speed:RUN_PACE,distance:RUN_PACE/60,sprinting:true});});
  await picture('jump',.54,()=>{for(let i=0;i<19;i++)frame({speed:1,grounded:false,velY:2});});
  if(output&&!coarse&&process.argv.includes('--reel')){
    for(const pose of ['idle','stride']){
      actor.reset();
      for(let n=0;n<72;n++){
        for(let i=0;i<4;i++)frame(pose==='idle'?{}:{speed:WALK_PACE,distance:WALK_PACE/60});
        const a=pose==='idle'?-.48:2.13;
        camera.position.set(4*Math.sin(a),1.12,-4*Math.cos(a));camera.lookAt(0,.866,0);camera.updateMatrixWorld();
        const p=raster(actor,camera,266,432,'noon',460),name=pose+'-'+String(n).padStart(2,'0');
        const {rgba,...box}=p;await writeFile(join(output,name+'.rgba'),rgba);await writeFile(join(output,name+'.json'),JSON.stringify(box));
      }
    }
  }
  actor.setFirstPerson(true);
  assert(!actor.root.getObjectByName('bodice').visible&&actor.root.getObjectByName('thigh 1').visible&&actor.root.getObjectByName('fps arms').visible);
  actor.setFirstPerson(true,false);
  assert(!actor.root.getObjectByName('fps arms').visible);
  console.log(JSON.stringify({mesh:coarse?'Canvas':'WebGL',triangles,draws:actor.meshes.length,
    height:bounds.max.y.toFixed(3),supportSlipPerFrame:(totalSlip/contacts).toFixed(4)}));
}
