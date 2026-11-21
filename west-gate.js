import * as T from 'three';

// The university's Jinming west-gate photograph and west-axis aerial show a
// low name wall flanked by open entries. Its separately captioned 2024 flower
// display is seasonal, not a permanent wall. The arch shown later in the school's
// gate chronology belongs to Zhengzhou. Wall dimensions here are estimates.
// https://ganbu.henu.edu.cn/info/1036/4225.htm
// https://zbcg.henu.edu.cn/xwtz/5707.chtml
export function westGatePlacement(data) {
  const axis=data.road.find(([, ,name])=>name==='明德广场中轴')?.[0];
  if(!axis?.length || axis.length<2)return null;
  const ends=[axis[0],axis.at(-1)].sort((a,b)=>a[0]-b[0]);
  const [start,end]=ends,angle=Math.atan2(end[1]-start[1],end[0]-start[0]);
  return [start[0]+5*Math.cos(angle)+6*Math.sin(angle),start[1]+5*Math.sin(angle)-6*Math.cos(angle),angle];
}
export function addWestGate(scene,data,anisotropy=1) {
  const anchor=westGatePlacement(data);
  if(!anchor)return null;
  const [x,z,angle]=anchor;
  const group=new T.Group();
  group.name='Jinming west gate and forecourt';
  group.position.set(x,0,z);
  group.rotation.y=-angle;

  const pos=[],norm=[],col=[],idx=[];
  const append=(geometry,color)=>{
    const verts=geometry.attributes.position.array,normals=geometry.attributes.normal.array;
    const base=pos.length/3,c=new T.Color(color);
    for(let i=0;i<verts.length;i+=3) {
      pos.push(verts[i],verts[i+1],verts[i+2]);
      norm.push(normals[i],normals[i+1],normals[i+2]);
      col.push(c.r,c.g,c.b);
    }
    const gIdx=geometry.index;
    if(gIdx){const a=gIdx.array;for(let i=0;i<a.length;i++)idx.push(base+a[i]);}
    else for(let i=0,n=verts.length/3;i<n;i++)idx.push(base+i);
    geometry.dispose();
  };
  const box=(x,y,z,dx,dy,dz,color)=>{
    const g=new T.BoxGeometry(dx,dy,dz);g.translate(x,y,z);append(g,color);
  };
  // One level of forecourt below the existing road and plaza surfaces; the
  // wide end joins Jinming Avenue. No barriers across the two service lanes.
  const paving=new T.BufferGeometry();
  paving.setAttribute('position',new T.Float32BufferAttribute([
    -27,.39,-48, -27,.39,48, 8,.39,37,
    -27,.39,-48, 8,.39,37, 8,.39,-37
  ],3));paving.computeVertexNormals();append(paving,'#a9a498');
  const bed=(x,z,depth,width,color,baseY=.4)=>{
    const patch=new T.Shape();
    // The Shape's Y axis becomes -Z after rotating onto the ground.
    const a=depth/2,b=width/2,r=Math.min(a,1.25);
    patch.moveTo(-a+r,-b);patch.lineTo(a-r,-b);patch.quadraticCurveTo(a,-b,a,-b+r);
    patch.lineTo(a,b-r);patch.quadraticCurveTo(a,b,a-r,b);
    patch.lineTo(-a+r,b);patch.quadraticCurveTo(-a,b,-a,b-r);
    patch.lineTo(-a,-b+r);patch.quadraticCurveTo(-a,-b,-a+r,-b);
    const mat=new T.ExtrudeGeometry(patch,{depth:.12,bevelEnabled:false,curveSegments:3});
    mat.rotateX(-Math.PI/2);mat.translate(x,baseY,z);append(mat,color);
  };
  for(const [z,width] of [[-34,14],[0,18],[34,14]]) {
    bed(-15,z,5.9,width,'#888a76');
    bed(-15,z,5.5,width-.40,'#78805b',.43);
  }
  box(0,.85,0,1.36,.26,26.7,'#898173');
  box(0,2.27,0,.98,2.58,26.15,'#aa8a65');
  const tones=['#c8a77f','#d1b28c','#c8aa84','#cdb08c','#c4a27d','#d0ae88'];
  const width=26.1,rows=4,columns=33,h=2.56,top=.99;
  for(let row=0;row<rows;row++)for(let i=0;i<columns;i++){
    const dz=width/columns,dy=h/rows,z=-width/2+(i+.5)*dz,y=top+(row+.5)*dy;
    const shade=tones[(i*7+row*13+Math.floor(i/4))%tones.length];
    // Thin facing stones reveal the mortar grid while preserving the straight silhouette.
    box(-.503,y,z,.042,dy-.020,dz-.022,shade);
  }
  box(0,3.60,0,1.04,.08,26.23,'#cfb696');
  // Low border planting in the frontal photo; foliage colour and positions
  // are schematic, not a reconstruction of the seasonal chrysanthemum display.
  box(-1.19,.72,0,1.26,.45,26.15,'#8c8375');
  let seed=937;const rnd=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
  for(let k=0;k<90;k++){
    const g=new T.IcosahedronGeometry(1,0);
    g.scale(.40+rnd()*.25,.27+rnd()*.18,.44+rnd()*.30);
    g.rotateY(rnd()*Math.PI);
    g.translate(-1.22+(rnd()-.5)*.5,.93+(rnd()-.5)*.07,-12.7+25.4*k/89);
    append(g,['#794c40','#694336','#805342','#68483a','#736447'][Math.floor(rnd()*5)]);
  }
  const surface=new T.BufferGeometry();
  surface.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  surface.setAttribute('normal',new T.Float32BufferAttribute(norm,3));
  surface.setAttribute('color',new T.Float32BufferAttribute(col,3));
  surface.setIndex(idx);
  const masonry=new T.Mesh(surface,new T.MeshStandardMaterial({vertexColors:true,roughness:.92,side:T.FrontSide}));
  masonry.name='Sandstone name wall and low planted islands';masonry.castShadow=masonry.receiveShadow=true;
  group.add(masonry);

  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=192;
  const ctx=canvas.getContext('2d');
  if(ctx){
    ctx.font='bold 151px KaiTi, STKaiti, FangSong, SimSun, serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    const gilding=ctx.createLinearGradient(0,18,0,169);
    gilding.addColorStop(0,'#fff2a8');gilding.addColorStop(.35,'#eac456');gilding.addColorStop(.63,'#a57a23');gilding.addColorStop(.78,'#e8c862');gilding.addColorStop(1,'#ab812e');
    [...'河南大学'].forEach((ch,i)=>{
      const x=(i+.5)*384;
      ctx.fillStyle='#765532';ctx.fillText(ch,x+2,102);
      ctx.strokeStyle='#8b6328';ctx.lineWidth=1.8;ctx.strokeText(ch,x,99);
      ctx.fillStyle=gilding;ctx.fillText(ch,x,99);
    });
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=anisotropy;
    const sign=new T.Mesh(new T.PlaneGeometry(22,2.45),new T.MeshStandardMaterial({map,alphaTest:.27,roughness:.43,metalness:.27}));
    sign.name='河南大学 · west face';sign.rotation.y=-Math.PI/2;sign.position.set(-.55,2.30,0);group.add(sign);
  }
  scene.add(group);
  return group;
}
