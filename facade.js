// Simplified west elevation of the library, based on the university's photograph.
// This elevation sits in front of the estimated footprint by a few centimetres.
export const libraryFacade = [];
function panel(z0,z1,y0,y1,color){
  const x=-176.18-libraryFacade.length*.001;
  libraryFacade.push([[[x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0]],color]);
}
panel(-108,-38,0,33,'#c2b9a5');
panel(-102,-44,1,30.2,'#4b5657');
panel(-101,-45,27.5,30.2,'#323a38');
panel(-101,-45,2,26.5,'#839594');
panel(-92,-54,1.6,25.2,'#b9bcb0');
panel(-85,-61,.5,7,'#b4b2a5');
panel(-82,-64,.55,5.9,'#3b4949');
for(let row=0;row<7;row++){
  const y=4+row*3.25;
  panel(-101,-92,y,y+.42,'#b5bcaf');
  panel(-54,-45,y,y+.42,'#b5bcaf');
  if(row>0)panel(-92,-54,y,y+.21,'#a1aa9f');
}
for(let col=0;col<7;col++){
  const z=-91+col*5.45;
  panel(z,z+1.6,7.4,25.2,'#ded9c6');
  panel(z+1.7,z+2.05,8.1,24.7,'#737f7b');
}
for(let col=0;col<6;col++){
  const z=-82+col*3.5;
  panel(z,z+.32,.55,5.9,'#b1b9ae');
}
panel(-85,-61,6,7,'#e1ddcc');
