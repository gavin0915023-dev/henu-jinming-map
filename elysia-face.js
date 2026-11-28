import {group,curve,mix} from './elysia-mesh.js';

// Anime-proportioned continuous facial surface tuned to Elysia's reference
// art: delicate V-taper jawline, tiny sculpted nose without harsh shadow dots,
// large luminous amethyst-pink-to-ice crystal eyes, and a warm gentle smile.
export function sculptFace(head,art,P,coarse){
  const {surface,strand,line}=art,eyes=[],tau=Math.PI*2;
  const gauss=(x,y,sx,sy)=>Math.exp(-((x/sx)**2+(y/sy)**2));
  const rows=[
    [.013,.002,.012,-.029],[.021,.018,.036,-.031],[.035,.040,.054,-.023],
    [.053,.059,.071,-.015],[.078,.079,.084,-.009],[.101,.092,.091,-.003],
    [.128,.099,.094,.001],[.151,.102,.096,.003],[.180,.103,.095,.006],
    [.208,.098,.090,.009],[.233,.082,.076,.014],[.251,.052,.051,.015],[.263,.003,.004,.015]];
  function section(y){
    let lo=0,hi=rows.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1;if(rows[m][0]<=y)lo=m;else hi=m;}
    return curve(rows,(lo+Math.max(0,Math.min(1,(y-rows[lo][0])/(rows[hi][0]-rows[lo][0]))))/(rows.length-1));
  }
  function relief(x,y){
    const a=Math.abs(x);
    return .007*gauss(x,y-.114,.007,.026)+.0115*gauss(x,y-.093,.0085,.008)
      +.0045*gauss(x,y-.061,.021,.012)
      +.0055*gauss(a-.059,y-.093,.029,.021)+.0035*gauss(a-.046,y-.156,.034,.012)
      -.0032*gauss(a-.046,y-.121,.032,.018)+.0032*gauss(x,y-.032,.028,.010);
  }
  function skinZ(x,y){
    const [,rx,rz,cz]=section(y),c=Math.sqrt(Math.max(.001,1-(x/rx)**2));
    return cz-rz*c**.78-relief(x,y)*c;
  }
  function point(u,v){
    const a=u*tau,y=.013+.250*v,[,rx,rz,cz]=section(y),x=rx*Math.sin(a),c=Math.cos(a);
    return [x,y,c>0?cz-rz*c**.78-relief(x,y)*c:cz-rz*c];
  }
  surface(head,coarse?52:80,coarse?35:54,point,(u,v)=>{
    const [x,y]=point(u,v),front=Math.max(0,Math.cos(u*tau)),a=Math.abs(x);
    const blush=.46*gauss(a-.059,y-.097,.025,.014)+.14*gauss(x,y-.092,.009,.008);
    const undertone=.09*gauss(a-.044,y-.139,.030,.014)+.09*Math.max(0,(.058-y)/.058);
    return mix(mix(0xfff1e8,0xefbfc6,undertone),0xffb2c7,front*blush);
  },true);
  for(const s of [-1,1]){
    const mid=.120,eye=group(head,'eye '+s,0,mid,0);eyes.push(eye);
    const size=.063,x0=.0145;
    const wave=u=>Math.max(0,Math.sin(Math.PI*u))**.72;
    const center=u=>.0042*(u-.48),top=u=>center(u)+.0182*wave(u),bottom=u=>center(u)-.0138*wave(u);
    const bulb=(x,y)=>{
      const u=(s*x-x0)/size,ey=y-mid-center(u);
      return skinZ(x,y)-.0014-.0042*wave(Math.max(0,Math.min(1,u)))*Math.exp(-((ey/.022)**2));
    };
    const pt=(x,y,d=0)=>[x,y-mid,bulb(x,y)-d];
    // Luminous porcelain-white sclera with delicate lavender top shadow.
    surface(eye,26,9,(u,v)=>{
      const x=s*(x0+size*u),y=mid+bottom(u)+(top(u)-bottom(u))*v;return pt(x,y);
    },(u,v)=>mix(0xfffaff,0xdac4e6,.36*v*v+.22*Math.abs(2*u-1)**3));
    // Large multi-tone Elysia iris: deep amethyst upper shade -> vivid orchid
    // lavender -> glowing sakura-pink & iridescent ice-cyan lower crescent.
    const ex=s*.0455,ey=mid+.0008,rx=.0172,ry=.0192;
    surface(eye,28,16,(u,v)=>{
      const xx=2*u-1,x=ex+rx*xx,dip=ry*Math.sqrt(Math.max(0,1-xx*xx));
      const a=(s*x-x0)/size,lo=Math.max(ey-dip,mid+bottom(a)),hi=Math.min(ey+dip,mid+top(a));
      return pt(x,lo+(hi-lo)*v,.0012);
    },(u,v)=>{
      const x=2*u-1,d=Math.sqrt(Math.max(0,1-x*x)),y=(v*2-1)*d*.82,r=Math.hypot(x,y);
      const glow=Math.max(0,1-Math.hypot(x*.85,(y+.42)*1.15));
      let col=mix(0xffb5e2,0x8c5cc2,.08+.84*Math.pow(v,.85));
      col=mix(col,0xc9f4ff,.36*glow*(1-v));
      col=mix(col,0x492659,Math.max(0,1-(.98-r)/.19)*.92);
      col=mix(col,0x4c295c,Math.max(0,Math.min(1,(.37-Math.hypot(x*1.12,(y-.08)*.92))/.11)));
      return mix(col,0xffd7f3,Math.max(0,Math.min(1,(.46-Math.abs(Math.hypot(x,y-.06)-.43))/.09))*.18*(1-v*.5));
    });
    // Crisp anime catchlights: bright upper-left oval, pinpoint sparkle & pink-ice lower glint.
    for(const [dx,dy,w,h,c] of [
      [-.0055,.0065,.0050,.0054,0xffffff],
      [.0062,.0035,.0022,.0022,0xfffbff],
      [.0042,-.0072,.0040,.0026,0xffe4f8]
    ]){
      surface(eye,14,3,(u,v)=>pt(ex+dx+w*v*Math.cos(u*tau),ey+dy+h*v*Math.sin(u*tau),.0023),c);
    }
    // Arched anime dark-plum upper lash with playful outer wing-flick.
    const upper=Array.from({length:12},(_,k)=>{
      const u=k/11,x=s*(x0+size*u),y=mid+top(u);
      return [...pt(x,y,.0026),.0010+.0022*wave(u)+.0011*u,.0013];
    });
    upper.push([...pt(s*(x0+size+.007),mid+center(1)+.0045,.0019),.00025,.0004]);
    strand(eye,upper,0x522d4a,[0,1,0],24,7);
    for(const u of [.76,.88]){
      const x=s*(x0+size*u),y=mid+top(u);
      strand(eye,[[...pt(x,y,.0030),.0015,.0008],[...pt(x+s*.0085,y+.0062,.0020),.0003,.0004]],0x5c3352,[0,1,0]);
    }
    // Delicate double-eyelid fold line right above the upper lash.
    const fold=Array.from({length:8},(_,k)=>{
      const u=.18+.68*k/7;return pt(s*(x0+size*u),mid+top(u)+.0048,.0014);
    });
    line(eye,fold,.00055,0xd89ca8,[0,1,0]);
    // Soft outer lower lash shimmer.
    const lower=Array.from({length:7},(_,k)=>{const u=.44+.52*k/6;return pt(s*(x0+size*u),mid+bottom(u),.0016);});
    line(eye,lower,.00080,0xb97c95,[0,1,0]);
    // Gentle rose-pink arched eyebrows.
    const brow=[[.019,.152,.0008],[.037,.158,.0020],[.058,.159,.0021],[.076,.155,.0007]].map(([x,y,w])=>[s*x,y,skinZ(s*x,y)-.0019,w,.0012]);
    strand(head,brow,0xc97ca2,[0,1,0]);
  }
  // Sweet upturned Elysia smile with warm coral-pink soft lips.
  const smile=x=>.0605+.0048*(Math.abs(x)/.020)**1.85+.0006*(x/.020);
  function lip(upper){
    surface(head,24,5,(u,v)=>{
      const x=(2*u-1)*.020,w=Math.sin(Math.PI*u),y=smile(x)+(upper?1:-1)*v*(upper?.0034:.0044)*w;
      return [x,y,skinZ(x,y)-.0010-.0016*w*Math.sin(Math.PI*v)];
    },(u,v)=>mix(upper?0xe4929f:0xf7a7b0,upper?0xffc6c6:0xffd8d6,v));
  }
  lip(true);lip(false);
  // Subtle warm-rose smile line (gentle curve, never harsh).
  line(head,Array.from({length:11},(_,i)=>{const x=(i/5-1)*.019,y=smile(x);return [x,y,skinZ(x,y)-.0023];}),.00072,0xc57b8d,[0,1,0]);
  return eyes;
}
