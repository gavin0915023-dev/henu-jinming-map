import * as T from './assets/three.module.min.js';
import {group, sculpt, mix, curve} from './elysia-mesh.js';
import {sculptFace} from './elysia-face.js';

// Original game-scale interpretation of Herrscher of Human: Ego, in her veiled
// human form. The ear-mounted veil, split train and locks are solid surfaces,
// so the silhouette reads from behind as well as in profile. Includes sculpted
// first-person opera-gloved forearms & ribbons for immersive campus walking.
const P={
  snow:0xfff9ff, silk:0xf0e7fc, shade:0xc0b2dc, lilac:0xc8ace8, iris:0x8772bd,
  plum:0x593c6d, lining:0x685696, sea:0x82d7e4, ice:0xcdf5f9,
  gold:0xd9ad74, paleGold:0xf9e2ab, rose:0xdf78af, pink:0xffb8d6,
  hair:0xf59ec9, hairDark:0xc66f9e, hairLight:0xffe4f1,
  skin:0xffe8dd, blush:0xffb4c4, lash:0x522d4a, crystal:0xa4d7f7
};
const tau=Math.PI*2;
const silk=(u,v)=>mix(P.shade,P.snow,.65+.20*Math.cos(u*tau)+.09*v);
const stocking=(u,h)=>mix(mix(0xc3aee0,0xf2ebfd,.32+.60*h),P.snow,.18+.14*Math.cos((u-.10)*tau));
const hairPaint=(u,v)=>{
  const turn=Math.cos((u+.10+.10*v)*tau);
  const shade=.32+.56*(turn*.5+.5)+.11*Math.cos(v*12+u*2.5);
  return mix(mix(0xc46d9b,0xffb7d7,shade),0xffe8f3,
    .30*Math.exp(-(((v-.26-.042*Math.cos(u*tau))/.078)**2))+.12*Math.max(0,turn)**4);
};

export function buildElysia(coarse=false){
  const art=sculpt({coarse}),{loft,oval,strand,line,gem,surface,cloth}=art;
  const root=new T.Group();root.name='Elysia · Herrscher of Human: Ego';
  const body=group(root,'airborne body'),hip=group(body,'pelvis',0,.925,0);
  const chest=group(hip,'bodice',0,.09,0),head=group(chest,'head',0,.384,0);
  const fringe=group(head,'fringe'),eyes=sculptFace(head,art,P,coarse),arms=[],legs=[],locks=[],trains=[];
  const upper=[chest], skirts=[];
  // At this scale a dark piping line is more legible than a reflective shader.
  const edge=(j,p,r=.003,c=P.paleGold,axis)=>line(j,p,r,c,axis);
  function leaf(j,pts,c,axis=[1,0,0]){strand(j,pts,(u,v)=>mix(c,P.snow,.23*Math.sin(u*tau)**2+.12*v),axis);}
  function star(j,x,y,z,r,c=P.paleGold,front=-1){
    gem(j,x,y,z,r*.44,r,c,front);
    gem(j,x,y,z+front*.0007,r*.73,r*.19,c,front);
  }
  function heartGem(j,x,y,z,w,h,col=P.rose,rim=P.plum,front=-1){
    // Two plump upper lobes tapering to a crisp crystal heart tip (Ref 2 & 3).
    for(const q of [-1,1]){
      oval(j,[x+q*w*.42,y+h*.22,z+front*.001],[w*.52,h*.48,w*.34],rim,10,6);
      oval(j,[x+q*w*.38,y+h*.24,z+front*.0028],[w*.40,h*.36,w*.26],col,10,6);
    }
    gem(j,x,y-h*.12,z+front*.0014,w*.90,h*.82,rim,front);
    gem(j,x,y-h*.06,z+front*.0032,w*.68,h*.64,col,front);
    gem(j,x-w*.16,y+h*.14,z+front*.0050,w*.26,h*.22,P.snow,front);
  }
  function circlet(j,y,rx,rz,cz,r,c){
    const pp=Array.from({length:25},(_,i)=>{const a=i*tau/24;return [rx*Math.sin(a),y,cz-rz*Math.cos(a)];});
    edge(j,pp,r,c,[0,1,0]);
  }

  // Fitted white bodice: a raised breastplate over a narrow, lilac-lined waist.
  loft(hip,[[-.115,.117,.087,.014],[-.057,.154,.109,.01],[.016,.151,.107,.012],
    [.083,.118,.084,.005],[.116,.111,.074,0]],silk);
  // Seal waist top so looking straight down in FPS shows clean silk inside the belt.
  oval(hip,[0,.104,.002],[.110,.013,.073],P.silk,18,5);
  const torso=[[-.062,.134,.093,.008],[-.012,.112,.078,.003],[.045,.107,.073,0],
    [.102,.116,.078,-.003],[.159,.139,.092,-.007],[.209,.154,.104,-.012],
    [.252,.159,.104,-.015],[.286,.157,.097,-.009],[.31,.148,.083,-.002],
    [.337,.113,.064,0],[.354,.057,.045,0]];
  loft(chest,torso.slice(5),P.skin,32);
  function bodice(u,t){
    const a=tau*u,c=Math.cos(a),top=.237+.034*Math.sin(a*2)**2+.016*Math.max(0,c)-.035*Math.max(0,-c);
    const y=-.062+(top+.062)*t,i=Math.max(0,torso.findIndex(row=>row[0]>=y)-1);
    const A=torso[i],B=torso[i+1],v=(y-A[0])/(B[0]-A[0]);
    return [(A[1]+(B[1]-A[1])*v+.002)*Math.sin(a),y,A[3]+(B[3]-A[3])*v-(A[2]+(B[2]-A[2])*v+.002)*c];
  }
  surface(chest,32,16,bodice,silk,true);
  edge(chest,Array.from({length:41},(_,i)=>bodice(i/40,1)),.0031,P.paleGold,[0,1,0]);
  loft(chest,[[.316,.108,.067,0],[.346,.066,.052,-.002],[.365,.052,.041,0],[.412,.044,.04,0]],P.skin);
  loft(chest,[[.352,.062,.052,0],[.362,.059,.050,0],[.367,.057,.048,0]],P.iris);
  circlet(chest,.366,.057,.048,0,.0023,P.paleGold);
  for(const s of [-1,1]){
    const panel=[[s*.14,.30,-.057,.027,.007],[s*.105,.24,-.094,.030,.005],
      [s*.083,.155,-.087,.019,.004],[s*.038,.073,-.077,.012,.005],[0,-.032,-.086,.001,.003]];
    leaf(chest,panel,P.ice);edge(chest,panel.map(([x,y,z,w])=>[x+s*w*.8,y,z-.003]),.0035);
    leaf(chest,[[s*.116,.245,-.081,.014,.003],[s*.076,.197,-.099,.012,.004],
      [s*.026,.169,-.102,.007,.003],[0,.141,-.094,.001,.001]],P.lilac);
    edge(chest,[[s*.104,.259,-.096],[s*.082,.231,-.108],[s*.047,.213,-.113],[0,.194,-.115]],.0024,P.paleGold);
    edge(chest,[[s*.133,.30,-.061],[s*.086,.283,-.103],[s*.033,.267,-.114],[0,.24,-.12]]);
    edge(chest,[[s*.14,.29,.048],[s*.087,.235,.084],[s*.053,.169,.090],[0,.105,.084]]);
    leaf(chest,[[s*.048,.142,.083,.015,.004],[s*.025,.107,.09,.015,.005],[0,.078,.083,.001,.001]],P.lilac);
  }
  gem(chest,0,.259,-.119,.016,.031,P.rose);gem(chest,0,.26,-.128,.007,.015,P.ice);
  gem(chest,0,.152,.092,.022,.036,P.crystal,1);
  circlet(hip,.084,.123,.092,.004,.007,P.gold);
  circlet(hip,.094,.117,.087,.004,.003,P.ice);
  // A folded lily sits over the belt instead of a straight band of colour.
  for(const s of [-1,1]){
    leaf(hip,[[0,.082,-.092,.007,.004],[s*.024,.105,-.096,.014,.004],
      [s*.052,.113,-.087,.009,.003],[s*.072,.127,-.079,.001,.001]],P.snow);
    edge(hip,[[0,.072,-.093],[s*.035,.067,-.092],[s*.076,.088,-.075],[s*.111,.103,-.043]],.0028,P.gold);
  }
  gem(hip,0,.082,-.101,.013,.026,P.rose);

  // Front petals are short; the long, graduated rear panels hang separately
  // from the waist so a bend of the knee cannot take the skirt along with it.
  const skirt=group(hip,'corolla');skirts.push(skirt);
  for(let layer=0;layer<2;layer++){
    const n=layer?8:10;
    for(let i=0;i<n;i++){
      const a=(i+(layer?.02:.5))*tau/n, petal=skirt;
      const outward=(1-Math.cos(a))/2;
      const len=(layer?.227:.289)+outward*(layer?.097:.110)+.010*Math.sin(a*3+.2);
      function at(u,t){
        const az=a+(u-.5)*(tau/n)*(1.16-.15*t)+.085*t*t;
        const wave=Math.sin(u*Math.PI),arc=1-Math.cos(t*Math.PI*.52);
        const rx=.13+.071*t+.064*arc+(layer?.010:0);
        const rz=.088+.069*t+.064*arc+(layer?.009:0);
        return [Math.sin(az)*(rx+.019*wave*t),.079-len*t+.070*(1-wave)*t*t,
          .006-Math.cos(az)*(rz+.019*wave*t)];
      }
      surface(petal,coarse?5:9,7,at,(u,t)=>layer?
        mix(P.snow,mix(P.crystal,P.lilac,u),(.13+.28*Math.abs(2*u-1))*(.4+.6*t)):
        mix(mix(P.ice,P.iris,t*.76),P.sea,.14+.32*(1-Math.sin(u*Math.PI))));
      edge(petal,Array.from({length:7},(_,k)=>at(k/6,.982)),.003,layer?P.paleGold:P.ice);
      if(layer){
        const [x,y,z]=at(.50,.85);star(petal,x,y,z+(z>0?.004:-.004),.010,P.rose,z>0?1:-1);
        for(const side of [-1,1])edge(petal,[[.5,.47],[.5+side*.12,.64],[.5+side*.25,.72],[.5+side*.34,.70]].map(([u,t])=>{
          const p=at(u,t);return [p[0]*1.014,p[1],p[2]*1.014];}),.0018,P.paleGold);
      }
    }
  }
  // Two tapering swallowtail panels, a darker lining and a fine border.
  for(const s of [-1,1]){
    const tail=group(hip,'long train '+s,s*.113,.055,.070);trains.push(tail);skirts.push(tail);
    function panel(u,t){
      const w=(.024+.098*Math.sin(Math.PI*(.11+.74*t))**.88)*Math.min(1,(1-t)*7.5+.02);
      const spine=curve([[0,0,0],[s*.052,-.15,.084],[s*.077,-.34,.139],
        [s*.055,-.54,.186],[s*.069+.030,-.68,.227],[s*.127+.049,-.793+s*.025,.294]],t);
      const side=(u-.5)*2,twist=.26*s+(.47*s+.30)*t;
      return [spine[0]+side*w*Math.cos(twist)+.016*Math.sin(2*Math.PI*u+.4)*t,
        spine[1]+(.031*(1-Math.sin(Math.PI*u))+.030*side*s)*t*t,
        spine[2]+(.022+.014*t)*Math.cos(t*3.2+u*6.5)-side*w*Math.sin(twist)];
    }
    cloth(tail,coarse?8:16,coarse?15:24,panel,(u,t)=>{
      const edgeShade=Math.sin(Math.PI*u);
      return mix(mix(P.silk,P.lilac,.12+.35*t),mix(P.sea,P.lining,t*.87),
        (.17+.73*t)*(.52+.38*Math.cos(u*6.5+t*3))+.12*(1-edgeShade));
    },(u,t)=>mix(0x76659b,P.ice,.24+.31*(1-t)+.10*Math.sin(u*tau)),.0035,-1);
    for(const u of [.025,.975])edge(tail,Array.from({length:11},(_,k)=>panel(u,k/10)),.0033,P.paleGold);
    for(const [u,t,r] of [[.5,.73,.022],[.33,.62,.010],[.65,.53,.009],[.56,.85,.009],[.22,.44,.008],[.6,.33,.009],[.71,.67,.006]]){
      const [x,y,z]=panel(u,t);star(tail,x,y,z+.003,r,P.snow,1);
    }
    for(const side of [-1,1])edge(tail,[[.50,.81],[.5+side*.19,.73],[.5+side*.33,.64],[.5+side*.36,.51],[.5+side*.28,.46]].map(([u,t])=>{
      const [x,y,z]=panel(u,t);return [x,y,z+.004];}),.0021,P.paleGold);
    const p=panel(.5,.98);gem(tail,p[0],p[1],p[2],.012,.025,P.crystal,1);
    const brooch=group(hip,'hip ornament '+s,s*.139,.054,.056);skirts.push(brooch);
    for(let f=0;f<4;f++){
      const a=f*Math.PI/2+.35;leaf(brooch,[[0,0,.006,.007,.002],
        [.032*Math.cos(a),.026*Math.sin(a),.014,.013,.006],
        [.057*Math.cos(a),.047*Math.sin(a),.006,.001,.001]],f%2?P.snow:P.lilac);
    }
    gem(brooch,0,.002,.024,.012,.019,P.rose,1);
  }

  for(const s of [-1,1]){
    // Pointed elf ear, soft conch blush and hanging crystal droplet.
    leaf(head,[[s*.083,.106,.011,.024,.011],[s*.114,.121,.013,.028,.010],
      [s*.134,.139,.021,.016,.007],[s*.156,.155,.037,.001,.001]],P.skin,[0,1,0]);
    leaf(head,[[s*.103,.111,-.002,.009,.003],[s*.125,.127,.001,.011,.003],
      [s*.145,.144,.017,.001,.001]],P.blush,[0,1,0]);
    edge(head,[[s*.124,.116,.009],[s*.131,.099,.011],[s*.129,.083,.01]],.0022);
    gem(head,s*.129,.076,.009,.0055,.014,P.crystal);
  }

  // Crown of hair is clipped at the forehead. Layered, airy sakura bangs sweep
  // across the forehead to eyelash height, framed by delicate cheek curls.
  surface(fringe,32,13,(u,v)=>{
    const a=tau*u,b=v*(1.44+.66*(1-Math.cos(a))*.5);
    return [.112*Math.sin(b)*Math.sin(a),.155+.115*Math.cos(b),.009-.113*Math.sin(b)*Math.cos(a)];
  },hairPaint);
  const bangs=[
    // Soft centre-left main sweep curving gently down to brow/eye top.
    [[-.030,.249,-.048,.027,.012],[-.036,.216,-.091,.034,.013],[-.028,.176,-.109,.026,.011],[-.008,.138,-.104,.001,.001]],
    // Delicate central airy micro-lock (signature Elysia forehead strand).
    [[.004,.248,-.053,.015,.008],[.008,.215,-.096,.019,.009],[.015,.176,-.108,.014,.007],[.026,.140,-.101,.001,.001]],
    // Centre-right sweep closing the forehead gap cleanly down to the right brow.
    [[.024,.247,-.050,.024,.011],[.044,.214,-.090,.030,.012],[.054,.175,-.099,.024,.010],[.045,.140,-.095,.001,.001]],
    // Outer-left feathered side bang framing the left eye.
    [[-.062,.234,-.048,.024,.011],[-.073,.194,-.083,.027,.012],[-.075,.156,-.088,.021,.009],[-.063,.128,-.085,.001,.001]],
    // Outer-right feathered side bang sweeping softly toward right temple.
    [[.052,.236,-.046,.023,.011],[.072,.198,-.080,.027,.012],[.081,.160,-.082,.020,.009],[.086,.126,-.066,.001,.001]],
    // Inner-left wispy accent tapering softly between the eyes.
    [[-.050,.240,-.054,.015,.008],[-.058,.205,-.092,.018,.009],[-.051,.168,-.102,.012,.006],[-.036,.142,-.098,.001,.001]],
    // High crown-right tuck adding soft volume over the part.
    [[.010,.253,-.044,.021,.009],[.032,.228,-.084,.025,.010],[.064,.198,-.088,.020,.009],[.085,.163,-.074,.001,.001]]
  ];
  for(const b of bangs)strand(fringe,b,hairPaint);
  // Locks sweep from an off-centre part over the crown; flatter, tapered
  // sections frame the eyes, while the nape has deeper overlapping sections.
  for(let k=0;k<10;k++){
    const a=(k/10)*tau+.22;
    function strandAt(t){
      const b=.10+t*(1.36+.35*(1-Math.cos(a))*.5),phi=a+.48*(1-t);
      return [.114*Math.sin(b)*Math.sin(phi)-.008*(1-t),.155+.117*Math.cos(b),
        .010-.115*Math.sin(b)*Math.cos(phi)];
    }
    const knots=Array.from({length:6},(_,i)=>{
      const t=i/5,w=(.009+.016*t)*Math.sin(Math.PI*t)**.64;
      return [...strandAt(t),.0008+w,.0008+w*.26];
    });
    strand(fringe,knots,hairPaint,[Math.cos(a),0,Math.sin(a)],coarse?9:16);
  }
  strand(fringe,[[.005,.251,.023,.012,.006],[-.034,.280,.013,.012,.006],[-.067,.287,-.005,.007,.004],
    [-.088,.271,-.016,.003,.002],[-.095,.254,-.012,.0005,.0005]],P.hairLight);
  for(const s of [-1,1]){
    // Delicate cheek-framing front tendrils curving softly around the jaw.
    strand(fringe,[[s*.077,.212,-.054,.022,.011],[s*.098,.157,-.061,.025,.016],
      [s*.102,.084,-.057,.023,.014],[s*.096,.014,-.086,.022,.013],
      [s*.112,-.058,-.110,.024,.012],[s*.099,-.122,-.119,.022,.010],
      [s*.074,-.153,-.136,.014,.007],[s*.071,-.183+(s+1)*.016,-.129,.001,.001]],hairPaint);
    strand(fringe,[[s*.096,.172,.016,.021,.014],[s*.107,.081,.034,.026,.017],
      [s*.125,.018,.025,.019,.013],[s*.149,-.039,.015,.002,.002]],hairPaint);
  }
  const mane=group(head,'rose mane',0,.16,.055);
  for(let i=-3;i<=3;i++){
    const p=i/3,x=p*.083,end=.77-.144*Math.abs(p)+.035*Math.cos(i*2);
    const lock=group(mane,'curl '+i,x,-.018,.027-.021*p*p);locks.push(lock);
    const w=.038+.007*(1-Math.abs(p));
    const phase=i*.87+.3;
    const knots=[[0,.052,0,w,.025],[p*.012,-.062,.035,w*1.16,.030],
      [p*.044+.022*Math.sin(phase),-.19,.081,w*1.12,.028],[p*.075+.046*Math.sin(phase+.63),-.34,.133,w*1.12,.027],
      [p*.047+.089*Math.sin(phase+1.8)+.035,-.49,.153+.034*Math.cos(phase),w*.98,.030],
      [p*.058+.080*Math.sin(phase+3.1)+.058,-end+.068,.183+.048*Math.cos(phase),w*.56,.016],
      [p*.079+.110*Math.sin(phase+3.42)+.049,-end,.177+.055*Math.cos(phase),.001,.001]];
    strand(lock,knots,hairPaint,[1,0,0],coarse?12:25,10);
    const shine=knots.slice(1,-1).map(([a,b,c,r],k)=>[a+r*.27,b,c+.018-.001*k]);
    edge(lock,shine,.0017,P.hairLight);
  }
  // The wide, turning side curls are separated from the core mass. Their
  // crescent-shaped ends can be read from the follow camera and in profile.
  for(const s of [-1,1]){
    const curl=group(mane,'rising side curl '+s,s*.079,-.047,.018);locks.push(curl);
    const knots=[[0,0,0,.037,.025],[s*.037,-.126,.063,.043,.028],
      [s*.084,-.264,.109,.052,.026],[s*.117,-.405,.146,.052,.024],
      [s*.104+.033,-.551+s*.039,.185,.045,.025],[s*.064+.048,-.615+s*.045,.223,.033,.018],
      [s*.009+.048,-.589+s*.059,.241,.019,.011],[s*.025+.060,-.537+s*.073,.235,.001,.001]];
    strand(curl,knots,hairPaint,[1,0,0],coarse?18:30,12);
    edge(curl,knots.slice(1,-1).map(([x,y,z,r])=>[x+s*r*.29,y,z+.021]),.0018,P.hairLight);
  }

  // In the white-and-violet reference the crown is exposed pink hair. The
  // folded veil is pinned behind the ears by white/ice feather wings and a
  // rose-heart crystal clasp, broadening gracefully towards its free hem.
  const veil=group(head,'bridal veil',0,.002,.003);
  const veilSides=[];
  for(const s of [-1,1]){
    function hood(u,t){
      const inner=.001+.041*t*t,outer=.092+.072*Math.sin(t*2.1),x=inner+(outer-inner)*u;
      const hem=.118+.118*Math.sin(Math.PI*(u*.94+.045))-.010*u;
      return [s*x,.162-t*hem,.044+.087*Math.sqrt(Math.max(.02,1-(x/.179)**2))
        +.065*t+.009*Math.cos(u*9.4+t*2.2)*t];
    }
    surface(veil,coarse?7:12,11,hood,(u,t)=>mix(P.snow,mix(P.lilac,P.crystal,u),.10+.28*t+.12*Math.sin(u*7+t)**2));
    edge(veil,Array.from({length:15},(_,k)=>{const [x,y,z]=hood(k/14,.994);return [x,y,z+.001];}),.0028,P.paleGold);
    const lattice=[[.12,.28],[.31,.52],[.54,.65],[.68,.63],[.60,.54],[.48,.55],[.57,.72],[.55,.84]];
    edge(veil,lattice.map(([u,t])=>{const [x,y,z]=hood(u,t);return [x,y,z+.002];}),.0021,P.snow);
    for(const [u,t,r] of [[.36,.69,.008],[.55,.87,.012],[.85,.59,.007]]){
      const [x,y,z]=hood(u,t);star(veil,x,y,z+.003,r,P.paleGold,1);}
  }
  for(const s of [-1,1]){
    const side=group(veil,'falling veil '+s,s*.101,.170,.042);veilSides.push(side);
    function fall(u,t){
      const side=2*u-1,w=.010+.067*Math.sin(2.25*t)+.034*t,angle=.25+.67*t+.21*s*t;
      const fold=Math.cos(u*13.6+.8*Math.sin(3*t)+s*.32),curl=Math.max(0,(t-.70)/.30)**1.7;
      const end=.344+s*.045+.073*(1-u)+.037*Math.sin(u*4.7+.7);
      return [s*(.007+.065*t+.045*Math.sin(t*3.4)+side*w*Math.cos(angle))+.038*t*t,
        -end*t+.043*Math.sin(t*3.05)+.015*t*fold+.060*curl*Math.max(0,side),
        .014+.165*t+.125*t*t+side*w*Math.sin(angle)+(.004+.016*t)*fold-.080*curl];
    }
    cloth(side,coarse?13:23,coarse?12:21,fall,
      (u,t)=>mix(0xfff7fc,0xb8a6d1,.085+.15*t+.23*(.5+.5*Math.cos(u*13.6+.8*Math.sin(3*t)+s*.32))),
      (u,t)=>mix(0x57458b,0xb08ad6,.34+.18*Math.cos(u*13.6+t*2)),.0033,-s);
    const underside=(u,t)=>{const [x,y,z]=fall(u,.79+.21*t);
      return [x+s*.010*t,y-.007-.027*t**2*(.25+u),z-.012+.004*t];};
    cloth(side,coarse?9:15,5,underside,(u,t)=>mix(0x7055ac,0xb297d8,.17+.21*Math.cos(u*13.6+t)),P.lilac,.002,-s);
    for(const u of [0,.28,.72,1])edge(side,Array.from({length:9},(_,k)=>fall(u,k/8)),.0012,0xe6cddf);
    edge(side,Array.from({length:20},(_,k)=>fall(k/19,1)),.0023,P.snow);
    // Pearl-white & iridescent ice-cyan feather-wing hairpiece with rose heart brooch.
    const wing=group(veil,'crystal filigree '+s,s*.099,.179,.010);
    for(const [dx,dy,dz,w,c] of [[.046,.122,.042,.016,P.snow],[.066,.088,.062,.017,P.ice],[.025,.096,.082,.013,0xece1ff]]){
      leaf(wing,[[0,0,0,.008,.003],[s*dx*.70,dy*.36,dz*.22,w,.006],[s*dx*.86,dy*.72,dz*.73,w*.56,.004],[s*dx,dy,dz,.001,.0008]],c);
    }
    edge(wing,[[s*.003,.003,-.002],[s*.025,.018,-.007],[s*.050,.048,-.006]],.0026,P.paleGold);
    heartGem(wing,s*.015,.002,-.015,.014,.017,P.rose,P.plum,-1);
  }
  for(const s of [-1,1]){
    edge(veil,[[0,.166,.127],[s*.033,.162,.127],[s*.069,.163,.108],[s*.103,.179,.059]],.0028,P.paleGold);
  }
  star(veil,0,.158,.135,.020,P.paleGold,1);gem(veil,0,.158,.140,.006,.010,P.rose,1);

  for(const s of [-1,1]){
    const arm=group(chest,'upper arm '+s,s*.158,.299,0),fore=group(arm,'forearm '+s,0,-.256,0);
    const wrist=group(fore,'hand '+s,0,-.225,0);arms.push({arm,fore,wrist});
    oval(arm,[s*.006,-.013,.001],[.047,.055,.046],P.skin);
    loft(arm,[[-.257,.033,.034,0],[-.209,.035,.038,.001],[-.122,.043,.042,0],
      [-.051,.046,.045,0],[-.01,.043,.042,0]],P.skin);
    // Detached, flared sleeves over the opera gloves.
    loft(arm,[[-.122,.052,.049,0],[-.103,.059,.054,0],[-.080,.052,.050,0],
      [-.065,.047,.048,0]],silk);
    circlet(arm,-.068,.049,.049,0,.0028,P.gold);
    circlet(arm,-.079,.052,.051,0,.0040,0x635086);
    const clasp=[s*.044,-.102,-.033];
    for(const [dx,dy,w] of [[-.026,.037,.009],[.024,.055,.010],[.041,.019,.009],[.018,-.028,.006]]){
      const [x,y,z]=clasp;leaf(arm,[[x,y,z,.006,.002],
        [x+s*dx*.54,y+dy*.49,z-.009,w,.004],[x+s*dx,y+dy,z-.016,.001,.001]],P.paleGold);
    }
    gem(arm,clasp[0],clasp[1],clasp[2]-.008,.011,.015,P.rose);
    for(const k of [-1,1])leaf(arm,[[s*.044,-.105,-.023,.006,.003],
      [s*(.053+.008*k),-.145,.002*k,.015,.004],[s*(.057+.015*k),-.199,.031+.014*k,.014,.004],
      [s*(.063+.019*k),-.237+.014*k,.056+.012*k,.001,.001]],k<0?P.iris:P.lilac);
    loft(fore,[[-.229,.020,.023,-.002],[-.202,.023,.024,0],[-.141,.029,.034,0],
      [-.080,.036,.038,-.002],[-.028,.035,.037,-.001],[.012,.031,.032,0]],silk);
    oval(fore,[0,.002,0],[.032,.033,.033],P.silk);
    loft(arm,[[-.255,.034,.036,0],[-.222,.035,.037,0],[-.194,.038,.039,0]],silk);
    circlet(arm,-.194,.039,.039,0,.0026,P.paleGold);
    edge(fore,[[s*.018,-.209,-.009],[s*.030,-.145,-.012],[s*.031,-.106,-.019]],.0026,P.gold);
    // Silver-lilac opera-glove filigree swirl echoing Reference 2.
    edge(fore,[[s*.004,-.192,-.024],[s*.022,-.156,-.029],[s*.011,-.116,-.036],[s*.026,-.074,-.035]],.0019,P.lilac);
    gem(fore,s*.014,-.134,-.033,.009,.018,P.crystal);
    loft(wrist,[[-.071,.017,.009,-.008],[-.056,.026,.014,-.007],[-.031,.027,.016,-.003],
      [-.009,.023,.016,-.001],[.012,.020,.021,0]],silk,20);
    for(let k=0;k<4;k++){
      const xx=s*(-.018+.011*k),len=[.043,.045,.040,.031][k],curl=.003+.0042*k;
      strand(wrist,[[xx,-.055,-.006,.0062,.0060],[xx+s*.0006*k,-.064-len*.34,-.007,.0054,.0052],
        [xx+s*.0013*k,-.064-len*.76,-.009-curl,.0047,.0040],
        [xx+s*.0025*k,-.064-len,-.010-1.53*curl,.0027,.0027]],P.silk,[1,0,0],7,7);
    }
    strand(wrist,[[-s*.018,-.022,-.010,.009,.007],[-s*.026,-.039,-.016,.008,.006],
      [-s*.029,-.053,-.021,.003,.003]],P.silk);
    const leg=group(hip,'thigh '+s,s*.078,-.004,0),shin=group(leg,'calf '+s,0,-.43,0);
    const foot=group(shin,'heel '+s,0,-.402,0);legs.push({leg,shin,foot});
    loft(leg,[[-.432,.043,.046,-.003],[-.38,.047,.052,0],[-.29,.058,.065,.002],
      [-.205,.069,.077,.005],[-.105,.078,.082,.009],[-.043,.081,.084,.007],[.014,.064,.067,.003]],(u,v)=>stocking(u,.50+v*.50));
    circlet(leg,-.165,.074,.080,.005,.003,P.paleGold);
    oval(shin,[0,.002,0],[.043,.045,.047],(u)=>stocking(u,.51));
    loft(shin,[[-.408,.026,.031,.009],[-.359,.029,.034,.008],[-.269,.036,.044,.015],
      [-.165,.049,.059,.022],[-.095,.050,.057,.014],[-.035,.044,.045,0],[.003,.042,.045,0]],(u,v)=>stocking(u,v*.50));
    for(const q of [-1,1]){
      const pp=[[q*.025,-.352,.002],[q*.035,-.258,-.001],[q*.045,-.176,-.002],[q*.037,-.093,-.021]];
      edge(shin,pp,.003, q===s?P.paleGold:P.lilac,[0,0,1]);
    }
    gem(shin,0,-.126,-.043,.011,.026,P.crystal);
    for(const q of [-1,1])edge(shin,[[0,-.128,-.043],[q*.019,-.151,-.038],
      [q*.030,-.18,-.024],[q*.028,-.214,-.019],[q*.017,-.245,-.023]],.002,P.paleGold);
    // A curved vamp meets the ball of the foot, with a separate raised heel.
    strand(foot,[[0,.014,.029,.025,.025],[0,-.003,.024,.033,.029],[0,-.029,-.014,.036,.026],
      [0,-.057,-.063,.040,.021],[0,-.067,-.108,.037,.014],[0,-.070,-.151,.006,.006]],P.silk,[1,0,0],14,12);
    leaf(foot,[[0,-.072,-.152,.004,.003],[0,-.077,-.105,.036,.004],
      [0,-.071,-.062,.037,.004],[0,-.046,-.014,.028,.003]],P.gold);
    strand(foot,[[0,-.008,.037,.023,.013],[0,-.034,.041,.015,.011],
      [0,-.071,.036,.008,.007],[0,-.083,.034,.008,.007]],P.gold);
    edge(foot,[[-.027,.006,-.009],[-.012,-.009,-.036],[.015,-.018,-.049],[.033,-.025,-.044]],.0035,P.gold);
    star(foot,s*.009,-.043,-.089,.010,P.paleGold);
  }

  // Dedicated first-person Elysia viewmodel: slender pearl-white silk opera
  // gloves, seamless ornate gold/lilac lace wrist cuffs, glowing cyan & rose
  // crystal accents, fluttering iris/lilac wrist ribbons, and gracefully
  // fanned anime fingers. Parked inside body bounds when hidden in 3rd-person.
  const fpsArms=group(root,'fps arms',0,1.35,0);
  const fpsHands=[], fpsRibbons=[];
  for(const s of [-1,1]){
    const arm=group(fpsArms,'fps arm '+s,s*(s>0?.212:.200),-.232+(s>0?.016:0),-.19);
    const hand=group(arm,'fps hand '+s,-s*.024,.054,-.205);
    const ribbon=group(arm,'fps ribbon '+s,-s*.014,.044,-.182);
    fpsHands.push({arm,hand,sign:s});
    fpsRibbons.push({ribbon,sign:s});
    // Slender pearl-white silk opera-glove forearm curving seamlessly into the wrist.
    strand(arm,[
      [s*.108,-.150,.115,.029,.026],
      [s*.060,-.074,-.015,.026,.023],
      [s*.024,-.016,-.105,.023,.020],
      [-s*.004,.024,-.162,.020,.017],
      [-s*.024,.054,-.205,.017,.014],
      [-s*.027,.058,-.214,.015,.012]
    ],silk,[0,1,0],coarse?8:12,coarse?8:10);
    // Delicate silver-lilac & pale-gold arabesque filigree swirls along glove forearm (Ref 2).
    edge(arm,[
      [s*.032,-.018,-.095],[s*.016,.012,-.128],[s*.004,.034,-.158],[-s*.010,.052,-.186]
    ],.0020,P.paleGold,[0,1,0]);
    edge(arm,[
      [s*.012,-.008,-.108],[-s*.002,.022,-.142],[s*.008,.040,-.170],[-s*.016,.058,-.196]
    ],.0018,P.lilac,[0,1,0]);
    edge(arm,[
      [s*.022,-.004,-.116],[s*.026,.020,-.148],[s*.010,.044,-.178],[-s*.004,.062,-.202]
    ],.0015,P.lilac,[0,1,0]);
    // Ornate detached lace cuff & violet/gold collar ring seated visibly below the wrist.
    strand(arm,[
      [s*.002,.020,-.154,.025,.021],
      [-s*.006,.032,-.170,.027,.023],
      [-s*.014,.042,-.183,.022,.018]
    ],(u,v)=>mix(P.silk,P.snow,.50+.30*Math.cos(u*tau)+.15*v),[0,1,0],4,coarse?8:10);
    // 360-degree lavender-iris & pale-gold cuff trim rings wrapping seamlessly around wrist.
    for(const [offZ,offY,offX,rx,ry,r,c] of [
      [-.168,.031,-s*.005,.028,.024,.0028,0x6a5396],
      [-.179,.039,-s*.012,.024,.020,.0024,P.paleGold],
      [-.202,.053,-s*.023,.019,.015,.0021,P.paleGold]
    ]){
      const ring=Array.from({length:15},(_,k)=>{
        const a=k*tau/14;
        return [offX+rx*Math.cos(a),offY+ry*Math.sin(a),offZ-.004*Math.sin(a)];
      });
      edge(arm,ring,r,c,[0,0,1]);
    }
    // Luminous ice-cyan & rose crystal star ornament seated cleanly atop the visible wrist cuff.
    star(arm,-s*.008,.063,-.180,.013,P.paleGold,-1);
    gem(arm,-s*.008,.065,-.184,.0075,.012,P.crystal,-1);
    gem(arm,-s*.008,.066,-.188,.0035,.006,P.snow,-1);
    // Tiny rose-pink crystal accent on the outer wrist trim.
    gem(arm,s*.015,.050,-.176,.0065,.009,P.rose,-1);
    // Twin graceful flowing iris-violet & sakura-lilac silk wrist ribbons visibly draping off wrist.
    for(const k of [-1,1]){
      leaf(ribbon,[
        [s*.014,.002,.004,.0045,.002],
        [s*(.034+.010*k),-.012+.007*k,-.018,.013,.003],
        [s*(.052+.015*k),-.044+.009*k,-.042,.012,.0025],
        [s*(.062+.018*k),-.082+.011*k,-.058,.0018,.0012]
      ],k<0?P.iris:P.lilac,[0,1,0]);
    }
    // Seamless silk wrist bridge tucked cleanly inside the gold wrist ring.
    oval(hand,[0,.001,.003],[.0155,.0115,.016],P.silk,10,6);
    // Sculpted slender palm tilted naturally so the ornate back of the opera glove faces camera.
    strand(hand,[
      [0,.001,.002,.0155,.011],
      [-s*.003,.005,-.020,.0195,.010],
      [-s*.007,.008,-.042,.0205,.009],
      [-s*.010,.009,-.056,.0180,.0075]
    ],silk,[0,1,0],6,coarse?6:10);
    // Fine pale-gold & lilac diamond embroidery + rose gem on the dorsal opera glove.
    edge(hand,[
      [-s*.003,.016,-.014],[-s*.012,.019,-.032],[-s*.006,.020,-.047],[s*.004,.016,-.031],[-s*.003,.016,-.014]
    ],.0014,P.paleGold,[0,1,0]);
    gem(hand,-s*.005,.020,-.031,.0050,.0075,P.rose,-1);
    // Four slender, gracefully arched & gently fanned tapered anime fingers.
    const fingerSpecs=[
      {x:-.020,y:.010,spread:-.006,len:.046,arch:.008,drop:-.014}, // index: poised forward
      {x:-.011,y:.012,spread:-.001,len:.052,arch:.007,drop:-.017}, // middle: longest & graceful
      {x:-.002,y:.010,spread: .004,len:.046,arch:.004,drop:-.019}, // ring: softly curled down
      {x: .007,y:.007,spread: .010,len:.036,arch:.006,drop:-.012}  // pinky: lightly poised
    ];
    for(const f of fingerSpecs){
      const bx=s*f.x, by=f.y;
      strand(hand,[
        [bx,by,-.052,.0044,.0040],
        [bx+s*f.spread*.35,by+f.arch*.70,-.052-f.len*.36,.0038,.0036],
        [bx+s*f.spread*.72,by+f.arch*.40+f.drop*.45,-.052-f.len*.74,.0032,.0030],
        [bx+s*f.spread,by+f.drop,-.052-f.len,.0018,.0018]
      ],P.snow,[0,1,0],5,6);
    }
    // Delicate slender thumb tucked naturally beside the inner palm edge (no gap).
    strand(hand,[
      [-s*.015,.000,-.016,.0050,.0044],
      [-s*.021,-.001,-.032,.0043,.0039],
      [-s*.024,-.002,-.046,.0035,.0032],
      [-s*.021,-.004,-.057,.0020,.0019]
    ],P.snow,[0,1,0],5,6);
  }
  fpsArms.visible=false;

  const meshes=art.finish();
  return {root,body,hip,chest,head,eyes,arms,legs,locks,veilSides,trains,skirt,mane,upper,skirts,fpsArms,fpsHands,fpsRibbons,meshes};
}
