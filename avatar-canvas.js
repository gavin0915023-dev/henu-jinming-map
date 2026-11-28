import {Matrix4} from './assets/three.module.min.js';

// Render the very same animated costume in the no-WebGL viewer. Only the
// character's small screen rectangle needs a depth buffer. Hair, face, hands
// and train consequently occlude one another correctly from any angle.
const srgb=Float32Array.from({length:4097},(_,i)=>{
  const x=i/4096;return 255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055);
});
const lights={noon:[1.02,1,1.02],morning:[1.04,.99,.96],sunset:[1.03,.86,.86],night:[.61,.66,.86]};
export function makeAvatarRasterizer(){
  const cache=new WeakMap(),view=new Matrix4(),mvp=new Matrix4();
  let rgba=new Uint8ClampedArray(),depth=new Float32Array();
  return function rasterize(avatar,camera,width,height,lighting='noon',limit=320){
    if(!avatar?.root.visible)return null;
    avatar.root.updateMatrixWorld(true);camera.updateMatrixWorld();
    view.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    let left=width,top=height,right=0,bottom=0;
    const objects=[],light=lights[lighting]??lights.noon;
    avatar.root.traverseVisible(mesh=>{
      if(!mesh.geometry?.attributes.color)return;
      const g=mesh.geometry,pos=g.attributes.position.array,c=g.attributes.color.array,n=g.attributes.normal.array;
      let data=cache.get(g);
      if(!data){
        const rgb=new Uint8Array(c.length);
        for(let i=0;i<c.length;i++)rgb[i]=srgb[Math.min(4096,Math.round(c[i]*4096))];
        data={p:new Float32Array(pos.length/3*4),rgb,ix:g.index.array};cache.set(g,data);
      }
      const e=mvp.multiplyMatrices(view,mesh.matrixWorld).elements,w=mesh.matrixWorld.elements;
      const lx=-.43,ly=.77,lz=-.47;
      const a=lx*w[0]+ly*w[1]+lz*w[2],b=lx*w[4]+ly*w[5]+lz*w[6],cZ=lx*w[8]+ly*w[9]+lz*w[10];
      const p=data.p;
      for(let i=0,j=0;i<pos.length;i+=3,j+=4){
        const x=pos[i],y=pos[i+1],z=pos[i+2],cw=e[3]*x+e[7]*y+e[11]*z+e[15];
        const cz=(e[2]*x+e[6]*y+e[10]*z+e[14])/cw;
        if(cw<=0||cz< -1||cz>1){p[j+2]=Infinity;continue;}
        const sx=(1+(e[0]*x+e[4]*y+e[8]*z+e[12])/cw)*.5*width;
        const sy=(1-(e[1]*x+e[5]*y+e[9]*z+e[13])/cw)*.5*height;
        p[j]=sx;p[j+1]=sy;p[j+2]=cz;p[j+3]=a*n[i]+b*n[i+1]+cZ*n[i+2];
        left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);
      }
      objects.push(data);
    });
    left=Math.max(0,Math.floor(left)-1);top=Math.max(0,Math.floor(top)-1);
    right=Math.min(width,Math.ceil(right)+1);bottom=Math.min(height,Math.ceil(bottom)+1);
    if(right<=left||bottom<=top)return null;
    const scale=Math.min(1.35,limit/Math.max(right-left,bottom-top));
    const w=Math.ceil((right-left)*scale),h=Math.ceil((bottom-top)*scale),size=w*h;
    if(depth.length!==size){depth=new Float32Array(size);rgba=new Uint8ClampedArray(size*4);}
    depth.fill(Infinity);rgba.fill(0);
    for(const {ix,p,rgb} of objects){
      for(let i=0;i<p.length;i+=4){p[i]=(p[i]-left)*scale;p[i+1]=(p[i+1]-top)*scale;}
      for(let k=0;k<ix.length;k+=3){
        const ai=ix[k],bi=ix[k+1],ci=ix[k+2],a=ai*4,b=bi*4,c=ci*4;
        if(!Number.isFinite(p[a+2]+p[b+2]+p[c+2]))continue;
        const ax=p[a],ay=p[a+1],bx=p[b],by=p[b+1],cx=p[c],cy=p[c+1];
        const dx=bx-ax,dy=by-ay,ex=cx-ax,ey=cy-ay,area=dx*ey-dy*ex;
        if(Math.abs(area)<.002)continue;
        const x0=Math.max(0,Math.ceil(Math.min(ax,bx,cx)-.5)),x1=Math.min(w-1,Math.floor(Math.max(ax,bx,cx)-.5));
        const y0=Math.max(0,Math.ceil(Math.min(ay,by,cy)-.5)),y1=Math.min(h-1,Math.floor(Math.max(ay,by,cy)-.5));
        if(x0>x1||y0>y1)continue;
        const inv=1/area,dzB=p[b+2]-p[a+2],dzC=p[c+2]-p[a+2];
        const facing=area<0?1:-1,lightA=facing*p[a+3],lightB=facing*p[b+3]-lightA,lightC=facing*p[c+3]-lightA;
        const ia=ai*3,ib=bi*3,ic=ci*3;
        for(let y=y0;y<=y1;y++){
          let vb=((x0+.5-ax)*ey-(y+.5-ay)*ex)*inv,vc=(dx*(y+.5-ay)-dy*(x0+.5-ax))*inv;
          for(let x=x0,idx=y*w+x;x<=x1;x++,idx++,vb+=ey*inv,vc-=dy*inv){
            if(vb<-.0001||vc<-.0001||vb+vc>1.0001)continue;
            const z=p[a+2]+vb*dzB+vc*dzC;if(z>=depth[idx])continue;
            depth[idx]=z;const j=idx*4,va=1-vb-vc;
            const nl=lightA+vb*lightB+vc*lightC,q=Math.min(1,Math.max(0,(nl+.36)/.90));
            const shade=q*q*(3-2*q),tone=.75+.245*shade+.038*Math.max(0,nl);
            for(let d=0;d<3;d++)rgba[j+d]=(rgb[ia+d]*va+rgb[ib+d]*vb+rgb[ic+d]*vc)
              *(tone+(d===2?.052:d===0?.018:0)*(1-shade))*light[d];
            rgba[j+3]=255;
          }
        }
      }
    }
    return {rgba,width:w,height:h,x:left,y:top,displayWidth:w/scale,displayHeight:h/scale};
  };
}
