// West elevation interpreted from Henan University's frontal photograph:
// https://zbcg.henu.edu.cn/xwtz/5707.chtml
// Visual reconstruction, not a survey or Baidu street-view texture. Heights
// retain the surrounding model's scale. The footprint stays unchanged; facade
// layers and the entrance project west (negative X).
export const libraryFacade = [];
export const libraryVolumes = [];
const face = (quad,color,material) => libraryFacade.push(material ? [quad,color,material] : [quad,color]);
const box = (x,y,z,w,h,d,color,material) => libraryVolumes.push({x,y,z,w,h,d,color,...(material?{material}:{})});

// The angled glass wings project at their outside edges, while the pale
// central glazing is recessed. The glazing and its grid share these planes.
const planes = [
  {z0:-101,z1:-88,x0:-179.3,x1:-176.65,color:'#8d9fa3'},
  {z0:-88,z1:-58,x0:-176.65,x1:-176.65,color:'#bcc8c5'},
  {z0:-58,z1:-45,x0:-176.65,x1:-179.3,color:'#91a2a6'}
];
function planePanel(p,z0,z1,y0,y1,color,offset=0,material){
  const x = z => p.x0+(p.x1-p.x0)*(z-p.z0)/(p.z1-p.z0)-offset;
  face([[x(z0),y0,z0],[x(z1),y0,z1],[x(z1),y1,z1],[x(z0),y1,z0]],color,material);
}
function flatPanel(x,z0,z1,y0,y1,color,material){
  face([[x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0]],color,material);
}
flatPanel(-176.25,-108,-38,0,33,'#bfc1ba');
for(const p of planes){
  planePanel(p,p.z0,p.z1,1.25,29.2,p.color,0,'glass');
  planePanel(p,p.z0,p.z1,29.2,31.4,'#3e4a4e',0,'glass');
  const columns = Math.ceil((p.z1-p.z0)/2.75);
  for(let col=0;col<=columns;col++){
    const z=p.z0+col*(p.z1-p.z0)/columns;
    planePanel(p,Math.max(p.z0,z-.045),Math.min(p.z1,z+.045),1.25,29.2,'#69797a',.045);
  }
  for(let y=2.8;y<29.2;y+=1.65) planePanel(p,p.z0,p.z1,y,y+.065,'#718080',.05);
  // Dark opening lights observed within the glazed reading-room walls.
  for(let row=0;row<3;row++)for(let col=0;col<columns;col+=3){
    const z=p.z0+.24+col*(p.z1-p.z0)/columns, y=14.1+row*5;
    planePanel(p,z,Math.min(z+1.55,p.z1-.15),y,y+.62,'#465454',.075,'glass');
  }
}
// Wing cornices follow the angled glass, with exposed top and underside faces.
// They replace the old flat bands, avoiding a second superimposed facade grid.
for(const p of [planes[0],planes[2]]){
  for(const [y,h] of [[6.2,.65],[28.1,.8]]){
    planePanel(p,p.z0,p.z1,y,y+h,'#c8cac2',.33);
    face([[p.x0-.33,y+h,p.z0],[p.x1-.33,y+h,p.z1],[p.x1+.15,y+h,p.z1],[p.x0+.15,y+h,p.z0]],'#d0d1c8');
    face([[p.x0-.33,y,p.z0],[p.x1-.33,y,p.z1],[p.x1+.15,y,p.z1],[p.x0+.15,y,p.z0]],'#656d6b');
  }
}
// Six narrow central ribs retain broad areas of exposed silver glazing.
for(let col=0;col<6;col++) box(-177.03,18.05,-86.5+col*5.4,.72,25.5,.55,'#babdb6');
for(const z of [-104.5,-41.5]) box(-177.6,16.1,z,3.5,31.8,6.9,'#bfc2bb');
// Deep dark soffit, broad thin stone roof and fine metal-panel joints.
box(-178.15,31.4,-73,5.3,.55,72,'#42494a');
box(-178.15,32.25,-73,5.3,1.15,72.8,'#c2c6c0');
for(let z=-108;z<-37;z+=2.75) box(-180.82,32.3,z,.045,1.02,.045,'#929b98');
for(const [z0,z1] of [[-107.9,-101.1],[-44.9,-38.1]]){
  for(let row=0;row<24;row++){
    const y=.8+row*1.3;
    flatPanel(-179.365,z0,z1,y,y+.025,'#969f9a');
    for(let z=z0+(row%2)*1.4;z<z1;z+=2.8)
      flatPanel(-179.37,z,Math.min(z+.025,z1),y,y+1.3,'#9ca49f');
  }
}
// Broad entrance stair, with adjoining shallow treads and a landing.
for(let i=0;i<6;i++) box(-183.4+i*.72,.48+i*.15,-73,1.45,.16,25.5,'#b9bcb4');
box(-178.7,1.23,-73,2.8,.16,25.5,'#c1c4bb');

// The photo's canopy has a deep rounded metal fascia across the entrance,
// rather than a scalloped plan-view roof. A continuous barrel section in X/Y
// provides the curve, with closed ends and a dark bottom face.
const canopy={x:-183.3,y:6.9,rx:1.55,ry:1.45,z0:-85.5,z1:-60.5,back:-176.9};
const canopyPoint = angle => [canopy.x-canopy.rx*Math.cos(angle),canopy.y+canopy.ry*Math.sin(angle)];
for(let i=0;i<18;i++){
  const [x0,y0]=canopyPoint(-Math.PI/2+i*Math.PI/18);
  const [x1,y1]=canopyPoint(-Math.PI/2+(i+1)*Math.PI/18);
  const color=['#4c5557','#596365','#677174','#798284','#8b9394'][Math.min(4,Math.floor(i/4))];
  face([[x0,y0,canopy.z0],[x0,y0,canopy.z1],[x1,y1,canopy.z1],[x1,y1,canopy.z0]],color);
  for(const z of [canopy.z0,canopy.z1])
    face([[x0,y0,z],[x1,y1,z],[canopy.back,y1,z],[canopy.back,y0,z]],'#687174');
  for(let z=canopy.z0+1.65;z<canopy.z1;z+=1.65)
    face([[x0-.012,y0,z],[x0-.012,y0,z+.025],[x1-.012,y1,z+.025],[x1-.012,y1,z]],'#596366');
}
face([[canopy.back,8.35,canopy.z0],[canopy.back,8.35,canopy.z1],[canopy.x,8.35,canopy.z1],[canopy.x,8.35,canopy.z0]],'#929a99');
face([[canopy.x,5.45,canopy.z0],[canopy.x,5.45,canopy.z1],[canopy.back,5.45,canopy.z1],[canopy.back,5.45,canopy.z0]],'#3c4648');

// Round stone columns use quad strips so Canvas shares their silhouette.
// Their caps meet the canopy underside, leaving the central doors unobstructed.
for(const z of [-83,-77,-69,-63]){
  const x=-182.35,r=.36;
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
    face([[x+r*Math.cos(a),1.25,z+r*Math.sin(a)],[x+r*Math.cos(b),1.25,z+r*Math.sin(b)],
      [x+r*Math.cos(b),5.45,z+r*Math.sin(b)],[x+r*Math.cos(a),5.45,z+r*Math.sin(a)]],'#c4c8bf');
  }
  box(x,1.45,z,.85,.4,.85,'#626c6b');
  box(x,5.2,z,.9,.3,.9,'#b7beb7');
}
for(let z=-81;z<-64;z+=2.1){
  box(-177.3,3.4,z,.25,4.1,1.88,'#455e64','glass');
  box(-177.48,3.4,z+.92,.15,4.2,.09,'#bdc6be');
  box(-177.52,3.2,z+.55,.12,.75,.07,'#d4d7ce');
}
// Sign reserved for model.js: center [-183.0, 9.7, -73], facing negative X.
