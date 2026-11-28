import {Matrix4,Euler,DynamicDrawUsage} from './assets/three.module.min.js';

// Four weighted joints down each lock or textile, shared by GPU and Canvas.
// Vertices at a pin have no motion; tip joints spring later than the roots.
export function drape(rig){
  const links=4,rot=new Matrix4(),angle=new Euler();
  const swatches=[];
  function bind(node,kind,index){
    const m=node.children.find(m=>m.isMesh),g=m.geometry,p=g.attributes.position,n=g.attributes.normal;
    const src=p.array.slice(),norm=n.array.slice(),count=p.count;
    let top=-Infinity,bottom=Infinity;
    for(let j=1;j<src.length;j+=3){top=Math.max(top,src[j]);bottom=Math.min(bottom,src[j]);}
    const len=(top-bottom)/links,lo=new Uint8Array(count),frac=new Float32Array(count);
    for(let i=0;i<count;i++){
      const k=Math.min(links-.00001,Math.max(0,(top-src[i*3+1])/len));
      lo[i]=Math.floor(k);frac[i]=k-lo[i];
    }
    p.setUsage(DynamicDrawUsage);n.setUsage(DynamicDrawUsage);g.boundingSphere.radius+=.35;
    const mats=Array.from({length:links+1},()=>new Matrix4());
    swatches.push({kind,index,top,len,lo,frac,p,n,src,norm,mats,state:new Float32Array(links*4),last:''});
  }
  rig.locks.forEach((o,i)=>bind(o,'hair',i));rig.veilSides.forEach((o,i)=>bind(o,'veil',i));rig.trains.forEach((o,i)=>bind(o,'silk',i));
  function reset(){for(const b of swatches){b.state.fill(0);b.last='';}}
  function update(dt,time,phase,motion,run,air,turn,still){
    for(const b of swatches){
      const {kind,index:i,top,len,src,norm,lo,frac,p,n,mats,state}=b,veil=kind==='veil',cloth=kind!=='hair';
      const mag=veil?1.15:cloth?1:.65,offset=i*(cloth?1.9:.53),stepWave=phase*2*Math.PI;
      const h=Math.min(.13,dt),sub=Math.max(1,Math.ceil(h/.022));
      let change=0;
      for(let k=1;k<=links;k++){
        const t=k/links,idx=(k-1)*4,beat=Math.sin(stepWave-2.7*t+offset);
        const wind=still?0:Math.sin(time*1.67-2.85*t+offset);
        const tx=-mag*(motion*(.025+.073*run)+.031*air+.020*beat*motion+.008*wind);
        const tz=mag*(-turn*.039+.027*beat*motion+.011*wind)*(cloth?1:.74);
        const hz=16-6*t,oldX=state[idx],oldZ=state[idx+2];
        for(let s=0;s<sub;s++){
          const d=h/sub;
          state[idx+1]+=((tx-state[idx])*hz*hz-1.57*hz*state[idx+1])*d;
          state[idx]+=state[idx+1]*d;
          state[idx+3]+=((tz-state[idx+2])*hz*hz-1.62*hz*state[idx+3])*d;
          state[idx+2]+=state[idx+3]*d;
        }
        change+=Math.abs(oldX-state[idx])+Math.abs(oldZ-state[idx+2]);
        rot.makeRotationFromEuler(angle.set(state[idx],state[idx+2]*(veil?.81:.37),state[idx+2]));
        const e=rot.elements,y=top-(k-1)*len;
        e[12]=-e[4]*y;e[13]=y-e[5]*y;e[14]=-e[6]*y;
        mats[k].multiplyMatrices(mats[k-1],rot);
      }
      if(change<.000002&&b.last)continue;b.last='set';
      for(let i=0,j=0;i<lo.length;i++,j+=3){
        const a=mats[lo[i]].elements,c=mats[lo[i]+1].elements,w=frac[i],v=1-w;
        const x=src[j],y=src[j+1],z=src[j+2],nx=norm[j],ny=norm[j+1],nz=norm[j+2];
        for(let d=0;d<3;d++){
          const ax=v*a[d]+w*c[d],ay=v*a[d+4]+w*c[d+4],az=v*a[d+8]+w*c[d+8];
          p.array[j+d]=ax*x+ay*y+az*z+v*a[d+12]+w*c[d+12];
          n.array[j+d]=ax*nx+ay*ny+az*nz;
        }
      }
      p.needsUpdate=true;n.needsUpdate=true;
    }
  }
  return {reset,update};
}
