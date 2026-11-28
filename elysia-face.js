import {group,curve,mix} from './elysia-mesh.js';
import {createFaceTextures,createFaceSdfTexture} from './elysia-face-tex.js';
import {createFaceToonMaterial} from './elysia-toon.js';

// Smooth anime-proportioned head surface mapped with 1:1 isotropic front-planar
// UVs to the 1024px painted anime Elysia face texture + Honkai Face SDF lightmap.
// Eliminates muddy 3D nose/jaw shadows while keeping vertex-color eye/smile
// fallbacks for headless Node & Canvas compatibility.
export function sculptFace(head,art,P,coarse){
  const {surface}=art,tau=Math.PI*2;
  const gauss=(x,y,sx,sy)=>Math.exp(-((x/sx)**2+(y/sy)**2));
  // Delicate anime V-taper chin & soft rounded cheek contour
  const rows=[
    [.013,.002,.011,-.027],[.022,.018,.034,-.029],[.036,.040,.053,-.022],
    [.054,.059,.070,-.015],[.078,.079,.084,-.009],[.102,.092,.091,-.003],
    [.129,.099,.094,.001],[.152,.102,.096,.003],[.181,.103,.095,.006],
    [.209,.098,.090,.009],[.233,.082,.076,.014],[.251,.052,.051,.015],[.263,.003,.004,.015]];
  function section(y){
    let lo=0,hi=rows.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1;if(rows[m][0]<=y)lo=m;else hi=m;}
    return curve(rows,(lo+Math.max(0,Math.min(1,(y-rows[lo][0])/(rows[hi][0]-rows[lo][0]))))/(rows.length-1));
  }
  // Subtle anime profile relief (tiny cute nose tip + soft cheek volume)
  function relief(x,y){
    const a=Math.abs(x);
    return .0045*gauss(x,y-.110,.006,.022)+.0075*gauss(x,y-.091,.0065,.0065)
      +.0030*gauss(x,y-.061,.018,.010)+.0040*gauss(a-.056,y-.094,.028,.020)
      +.0022*gauss(x,y-.032,.024,.009);
  }
  // u = 0.5 is exact front center (x = 0, z = -rz), seam hidden at rear (u = 0 / 1)
  function point(u,v){
    const a=(u-.5)*tau,y=.013+.250*v,[,rx,rz,cz]=section(y),x=rx*Math.sin(a),c=Math.cos(a);
    return [x,y,c>0?cz-rz*c**.82-relief(x,y)*c:cz-rz*c];
  }
  // 1:1 isotropic front-planar UV mapping for crisp 1024px anime eyes, lashes & smile;
  // back of head clamps to clean porcelain border inside the hair cap.
  function faceUv(u,v,p){
    const front=Math.cos((u-.5)*tau);
    const pu=front>-.05?Math.max(.02,Math.min(.98,.5+p[0]/.26)):.02;
    const pv=Math.max(.02,Math.min(.98,(p[1]-.010)/.26));
    return [pu,pv];
  }

  const faceNode=group(head,'anime face',0,0,0,'skin');
  const {openMap,closedMap,openCanvas}=createFaceTextures();
  const sdfMap=createFaceSdfTexture();
  const faceMat=createFaceToonMaterial(openMap,closedMap,sdfMap);
  faceNode.userData.customMaterial=faceMat;
  faceNode.userData.outline=[0xd49c96,.0009];
  faceNode.userData.faceCanvas=openCanvas;

  // Populate vertex colors cleanly too so Canvas fallback & Node verification read right
  surface(faceNode,coarse?48:72,coarse?34:50,point,(u,v)=>{
    const [x,y]=point(u,v),front=Math.max(0,Math.cos((u-.5)*tau)),a=Math.abs(x);
    let col=0xfff3ec;
    const blush=.45*gauss(a-.058,y-.095,.024,.013);
    col=mix(col,0xffaac2,front*blush);
    if(front>.35){
      const eyeD=Math.hypot((a-.045)/.023,(y-.121)/.016);
      if(eyeD<1.02){
        const irisD=Math.hypot((a-.045)/.013,(y-.121)/.014);
        col=irisD<1?mix(0xffb5e2,0x733ea0,Math.max(0,Math.min(1,(y-.108)/.026))):0xfffbff;
        if(y-.121>.010&&eyeD<.98)col=0x482442;
      }
      if(Math.abs(x)<.017&&Math.abs(y-.062-.004*(x/.017)**2)<.0032)col=0xe67c92;
    }
    return col;
  },true,faceUv);

  return {faceMat,faceNode};
}
