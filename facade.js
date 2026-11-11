// Simplified west elevation of the library, based on the university's photograph.
// Separate architectural layers in depth to avoid overlapping coplanar faces.
export const libraryFacade = [];
function panel(z0,z1,y0,y1,color,layer=2){
  const x=-176.18-layer*.06;
  libraryFacade.push([[[x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0]],color]);
}
panel(-108,-38,0,33,'#c2b9a5',0);
panel(-102,-44,1,30.2,'#4b5657',1);
panel(-101,-45,27.5,30.2,'#323a38');
panel(-101,-45,2,26.5,'#839594');
panel(-92,-54,1.6,25.2,'#b9bcb0',3);
panel(-85,-61,.5,7,'#b4b2a5',4);
panel(-82,-64,.55,5.9,'#3b4949',5);
for(let row=0;row<7;row++){
  const y=4+row*3.25;
  panel(-101,-92,y,y+.42,'#b5bcaf',3);
  panel(-54,-45,y,y+.42,'#b5bcaf',3);
  if(row>0)panel(-92,-54,y,y+.21,'#a1aa9f',4);
}
for(let col=0;col<7;col++){
  const z=-91+col*5.45;
  panel(z,z+1.6,7.4,25.2,'#ded9c6',5);
  panel(z+1.7,z+2.05,8.1,24.7,'#737f7b',6);
}
for(let col=0;col<6;col++){
  const z=-82+col*3.5;
  panel(z,z+.32,.55,5.9,'#b1b9ae',6);
}
panel(-85,-61,6,7,'#e1ddcc',7);

// Photo-informed massing, not surveyed dimensions. Coordinates retain the
// existing library footprint; the entrance faces west (negative X).
export const libraryVolumes = [];
const box = (x,y,z,w,h,d,color) => libraryVolumes.push({x,y,z,w,h,d,color});
// Deep roof overhang, shadowed soffit and stone parapet.
box(-177.4,31.4,-73,3.2,.55,72,'#464b49');
box(-177.6,32.25,-73,3.6,1.15,72.8,'#c3c1b6');
for (const z of [-106.5,-39.5]) box(-177.15,16.1,z,1.9,31.8,2.5,'#b7b6ad');
// Fine curtain-wall mullions, in front of the existing elevation layers.
for(let z=-100;z<-45;z+=2.75) box(-176.85,16.8,z,.16,20.5,.12,'#596563');
for(let y=8.2;y<27;y+=1.65) box(-176.9,y,-73,.18,.12,55,'#626e6b');
// Broad, shallow entrance stair. Each upper tread meets the next riser.
for(let i=0;i<6;i++) box(-183.4+i*.72,.48+i*.15,-73,1.45,.16,25.5,'#b9b6aa');
box(-178.7,1.23,-73,2.8,.16,25.5,'#bdbbaf');
// Segmented curved canopy with a dark underside and slender supports.
for(let i=0;i<16;i++) {
  const z=-86+i*1.65;
  const x=-180.8-1.8*Math.sqrt(Math.max(0,1-((z+73)/14)**2));
  box(x,6.65,z,6,.38,1.72,'#545d5b');
  box(x-2.95,6.78,z,.16,.45,1.72,'#8e9590');
}
for(const z of [-84,-78.5,-67.5,-62]) box(-183.15,3.8,z,.4,5.3,.4,'#bcbfb6');
// Paired glass entrance doors with metal frames.
for(let z=-81;z<-64;z+=2.1) {
  box(-177.05,3.6,z,.25,4.5,1.88,'#344d4d');
  box(-177.23,3.6,z+.92,.15,4.6,.09,'#b3bbb5');
  box(-177.27,3.4,z+.55,.12,.75,.07,'#d4d3c6');
}
