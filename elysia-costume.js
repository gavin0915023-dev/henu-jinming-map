import * as T from './assets/three.module.min.js';
import {group, sculpt, mix, curve} from './elysia-mesh.js';
import {sculptFace} from './elysia-face.js';

// Honkai Impact 3rd NPR-styled Herrscher of Human: Ego ("爱莉希雅 · 真我·人之律者"):
//   - 1024px UV anime face + Face SDF shadow sweep + smooth shader blinking
//   - Flattened anime ribbon hair + Kajiya-Kay Angel Ring specular + colored outlines
//   - Seamless anime shoulders, pearlescent cel-shaded silk bodice, veil & split train
//   - First-person poised opera-gloved hand conjuring a hovering sakura-cyan Crystal Blossom
const P={
  snow:0xfffaff, silk:0xf4ecfe, shade:0xc6b9e2, lilac:0xcdaef0, iris:0x8a74c4,
  plum:0x583a6d, lining:0x6d589c, sea:0x86dce8, ice:0xd2f8fc,
  gold:0xdfb378, paleGold:0xfce7b4, rose:0xeb78b6, pink:0xffb8da,
  hair:0xf8a0cc, hairDark:0xc96ea0, hairLight:0xffebf5,
  skin:0xfff2ea, blush:0xffb6c8, lash:0x4b2645, crystal:0x9ee0ff
};
const tau=Math.PI*2;
const silk=(u,v)=>mix(P.shade,P.snow,.68+.18*Math.cos(u*tau)+.09*v);
const stocking=(u,h)=>mix(mix(0xc8b4e4,0xf5effe,.35+.58*h),P.snow,.20+.12*Math.cos((u-.10)*tau));
const hairPaint=(u,v)=>{
  const turn=Math.cos((u+.08+.08*v)*tau);
  const shade=.38+.52*(turn*.5+.5)+.09*Math.cos(v*10+u*2.2);
  return mix(mix(0xd679aa,0xffbcdb,shade),0xfff0f8,
    .26*Math.exp(-(((v-.25-.04*Math.cos(u*tau))/.085)**2))+.10*Math.max(0,turn)**4);
};

export function buildElysia(coarse=false){
  const art=sculpt({coarse}),{loft,oval,strand,line,gem,surface,cloth}=art;
  const root=new T.Group();root.name='Elysia · Herrscher of Human: Ego';
  const body=group(root,'airborne body'),hip=group(body,'pelvis',0,.925,0,'silk');
  const chest=group(hip,'bodice',0,.09,0,'silk');
  const chestSkin=group(chest,'collar skin',0,0,0,'skin');
  const head=group(chest,'head',0,.384,0,'skin');
  const fringe=group(head,'fringe',0,0,0,'hair');
  const {faceMat}=sculptFace(head,art,P,coarse);
  const arms=[],legs=[],locks=[],trains=[];
  const upper=[chest], skirts=[];
  const edge=(j,p,r=.003,c=P.paleGold,axis)=>line(j,p,r,c,axis);
  function leaf(j,pts,c,axis=[1,0,0]){strand(j,pts,(u,v)=>mix(c,P.snow,.23*Math.sin(u*tau)**2+.12*v),axis);}
  function star(j,x,y,z,r,c=P.paleGold,front=-1){
    gem(j,x,y,z,r*.44,r,c,front);
    gem(j,x,y,z+front*.0007,r*.73,r*.19,c,front);
  }
  function heartGem(j,x,y,z,w,h,col=P.rose,rim=P.plum,front=-1){
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

  // Fitted white bodice over a narrow lilac-trimmed waist.
  loft(hip,[[-.115,.117,.087,.014],[-.057,.154,.109,.01],[.016,.151,.107,.012],
    [.083,.118,.084,.005],[.116,.111,.074,0]],silk);
  // Seal waist top so looking straight down in FPS shows clean silk inside the belt.
  oval(hip,[0,.104,.002],[.110,.013,.073],P.silk,18,5);

  const torso=[[-.062,.134,.093,.008],[-.012,.112,.078,.003],[.045,.107,.073,0],
    [.102,.116,.078,-.003],[.159,.139,.092,-.007],[.209,.154,.104,-.012],
    [.252,.159,.104,-.015],[.286,.157,.094,-.009],[.310,.154,.079,-.002],
    [.335,.112,.062,0],[.354,.055,.044,0]];
  // Bare collarbone, shoulders & neck on dedicated SkinToon material (zero grey seam!)
  loft(chestSkin,torso.slice(5),P.skin,32);
  loft(chestSkin,[[.316,.106,.065,0],[.346,.064,.050,-.002],[.365,.050,.040,0],[.412,.042,.038,0]],P.skin);
  function bodice(u,t){
    const a=tau*u,c=Math.cos(a),top=.237+.034*Math.sin(a*2)**2+.016*Math.max(0,c)-.035*Math.max(0,-c);
    const y=-.062+(top+.062)*t,i=Math.max(0,torso.findIndex(row=>row[0]>=y)-1);
    const A=torso[i],B=torso[i+1],v=(y-A[0])/(B[0]-A[0]);
    return [(A[1]+(B[1]-A[1])*v+.002)*Math.sin(a),y,A[3]+(B[3]-A[3])*v-(A[2]+(B[2]-A[2])*v+.002)*c];
  }
  surface(chest,32,16,bodice,silk,true);
  edge(chest,Array.from({length:41},(_,i)=>bodice(i/40,1)),.0031,P.paleGold,[0,1,0]);
  loft(chest,[[.352,.060,.050,0],[.362,.057,.048,0],[.367,.055,.046,0]],P.iris);
  circlet(chest,.366,.055,.046,0,.0023,P.paleGold);
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
  for(const s of [-1,1]){
    leaf(hip,[[0,.082,-.092,.007,.004],[s*.024,.105,-.096,.014,.004],
      [s*.052,.113,-.087,.009,.003],[s*.072,.127,-.079,.001,.001]],P.snow);
    edge(hip,[[0,.072,-.093],[s*.035,.067,-.092],[s*.076,.088,-.075],[s*.111,.103,-.043]],.0028,P.gold);
  }
  gem(hip,0,.082,-.101,.013,.026,P.rose);

  // Scalloped two-tier petal skirt.
  const skirt=group(hip,'corolla',0,0,0,'silk');skirts.push(skirt);
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
  // Two tapering iridescent swallowtail panels.
  for(const s of [-1,1]){
    const tail=group(hip,'long train '+s,s*.113,.055,.070,'silk');trains.push(tail);skirts.push(tail);
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
    const brooch=group(hip,'hip ornament '+s,s*.139,.054,.056,'crystal');skirts.push(brooch);
    for(let f=0;f<4;f++){
      const a=f*Math.PI/2+.35;leaf(brooch,[[0,0,.006,.007,.002],
        [.032*Math.cos(a),.026*Math.sin(a),.014,.013,.006],
        [.057*Math.cos(a),.047*Math.sin(a),.006,.001,.001]],f%2?P.snow:P.lilac);
    }
    gem(brooch,0,.002,.024,.012,.019,P.rose,1);
  }

  // Pointed elf ears + crystal droplet earrings on warm SkinToon.
  for(const s of [-1,1]){
    leaf(head,[[s*.082,.106,.011,.022,.008],[s*.114,.122,.013,.026,.008],
      [s*.136,.140,.021,.015,.005],[s*.158,.157,.036,.001,.001]],P.skin,[0,1,0]);
    leaf(head,[[s*.102,.111,-.001,.009,.0025],[s*.126,.128,.002,.011,.0025],
      [s*.146,.145,.017,.001,.001]],P.blush,[0,1,0]);
    edge(head,[[s*.125,.116,.009],[s*.131,.099,.011],[s*.129,.083,.01]],.0022,P.paleGold);
    gem(head,s*.129,.076,.009,.0055,.014,P.crystal);
  }

  // Flattened, feathery anime ribbon bangs & crown (NO fat round tubes!)
  surface(fringe,32,13,(u,v)=>{
    const a=tau*u,b=v*(1.44+.66*(1-Math.cos(a))*.5);
    return [.112*Math.sin(b)*Math.sin(a),.155+.115*Math.cos(b),.009-.113*Math.sin(b)*Math.cos(a)];
  },hairPaint);
  const bangs=[
    // Smooth side-swept curved bangs curving gently over brows (no spiky jagged teeth!)
    [[-.024,.251,-.048,.032,.0075],[-.036,.218,-.093,.038,.0085],[-.026,.182,-.108,.030,.0065],[.004,.152,-.105,.006,.003]],
    [[.016,.250,-.050,.030,.0075],[.038,.216,-.093,.036,.0082],[.052,.180,-.101,.028,.0062],[.058,.150,-.094,.005,.003]],
    [[-.058,.238,-.048,.026,.0065],[-.073,.198,-.085,.030,.0075],[-.078,.160,-.089,.023,.0055],[-.072,.132,-.085,.004,.0025]],
    [[.048,.240,-.046,.026,.0065],[.070,.200,-.082,.030,.0075],[.082,.162,-.084,.022,.0055],[.088,.130,-.068,.004,.0025]],
    [[-.006,.252,-.052,.020,.0055],[.006,.220,-.097,.024,.0062],[.020,.186,-.108,.017,.0048],[.032,.156,-.102,.003,.002]]
  ];
  for(const b of bangs)strand(fringe,b,hairPaint,[1,0,0],coarse?8:12,coarse?6:8);
  for(let k=0;k<10;k++){
    const a=(k/10)*tau+.22;
    function strandAt(t){
      const b=.10+t*(1.36+.35*(1-Math.cos(a))*.5),phi=a+.48*(1-t);
      return [.114*Math.sin(b)*Math.sin(phi)-.008*(1-t),.155+.117*Math.cos(b),
        .010-.115*Math.sin(b)*Math.cos(phi)];
    }
    const knots=Array.from({length:6},(_,i)=>{
      const t=i/5,w=(.010+.016*t)*Math.sin(Math.PI*t)**.64;
      return [...strandAt(t),.0008+w,.0006+w*.22];
    });
    strand(fringe,knots,hairPaint,[Math.cos(a),0,Math.sin(a)],coarse?9:14,coarse?6:8);
  }
  // Signature playful ahoge curl atop crown
  strand(fringe,[[.005,.251,.023,.011,.004],[-.034,.280,.013,.011,.004],[-.067,.287,-.005,.006,.0025],
    [-.088,.271,-.016,.0025,.0015],[-.095,.254,-.012,.0005,.0005]],P.hairLight);
  // Sleek flattened cheek-framing anime tendrils curling softly inward around chin
  for(const s of [-1,1]){
    strand(fringe,[[s*.078,.212,-.054,.022,.007],[s*.099,.156,-.061,.025,.009],
      [s*.104,.084,-.057,.023,.008],[s*.097,.014,-.086,.022,.0075],
      [s*.110,-.058,-.110,.024,.007],[s*.096,-.122,-.119,.021,.006],
      [s*.072,-.154,-.134,.013,.004],[s*.068,-.184+(s+1)*.016,-.127,.001,.001]],hairPaint,[1,0,0],coarse?12:18,coarse?6:8);
    strand(fringe,[[s*.096,.172,.016,.020,.007],[s*.107,.081,.034,.025,.009],
      [s*.124,.018,.025,.018,.0065],[s*.147,-.039,.015,.0015,.0015]],hairPaint,[1,0,0],coarse?8:12,6);
  }
  // Sleek, flowing, flattened back anime hair ribbons with angel-ring highlights
  const mane=group(head,'rose mane',0,.16,.055,'hair');
  for(let i=-3;i<=3;i++){
    const p=i/3,x=p*.083,end=.77-.144*Math.abs(p)+.035*Math.cos(i*2);
    const lock=group(mane,'curl '+i,x,-.018,.027-.021*p*p,'hair');locks.push(lock);
    const w=.042+.008*(1-Math.abs(p));
    const phase=i*.87+.3;
    const knots=[[0,.052,0,w,.014],[p*.012,-.062,.035,w*1.16,.016],
      [p*.044+.022*Math.sin(phase),-.19,.081,w*1.14,.015],[p*.075+.046*Math.sin(phase+.63),-.34,.133,w*1.12,.014],
      [p*.047+.089*Math.sin(phase+1.8)+.035,-.49,.153+.034*Math.cos(phase),w*.96,.013],
      [p*.058+.080*Math.sin(phase+3.1)+.058,-end+.068,.183+.048*Math.cos(phase),w*.54,.008],
      [p*.079+.110*Math.sin(phase+3.42)+.049,-end,.177+.055*Math.cos(phase),.001,.001]];
    strand(lock,knots,hairPaint,[1,0,0],coarse?12:22,8);
  }
  for(const s of [-1,1]){
    const curl=group(mane,'rising side curl '+s,s*.079,-.047,.018,'hair');locks.push(curl);
    const knots=[[0,0,0,.040,.014],[s*.037,-.126,.063,.046,.015],
      [s*.084,-.264,.109,.054,.014],[s*.117,-.405,.146,.052,.013],
      [s*.104+.033,-.551+s*.039,.185,.044,.012],[s*.064+.048,-.615+s*.045,.223,.032,.009],
      [s*.009+.048,-.589+s*.059,.241,.018,.006],[s*.025+.060,-.537+s*.073,.235,.001,.001]];
    strand(curl,knots,hairPaint,[1,0,0],coarse?16:26,10);
  }

  // Ear-pinned bridal veil + pearl/ice feather wings + rose heart crystal clasp.
  const veil=group(head,'bridal veil',0,.002,.003,'silk');
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
    const side=group(veil,'falling veil '+s,s*.101,.170,.042,'silk');veilSides.push(side);
    function fall(u,t){
      const side=2*u-1,w=.010+.067*Math.sin(2.25*t)+.034*t,angle=.25+.67*t+.21*s*t;
      const fold=Math.cos(u*13.6+.8*Math.sin(3*t)+s*.32),curl=Math.max(0,(t-.70)/.30)**1.7;
      const end=.344+s*.045+.073*(1-u)+.037*Math.sin(u*4.7+.7);
      return [s*(.007+.065*t+.045*Math.sin(t*3.4)+side*w*Math.cos(angle))+.038*t*t,
        -end*t+.043*Math.sin(t*3.05)+.015*t*fold+.060*curl*Math.max(0,side),
        .014+.165*t+.125*t*t+side*w*Math.sin(angle)+(.004+.016*t)*fold-.080*curl];
    }
    cloth(side,coarse?13:22,coarse?12:20,fall,
      (u,t)=>mix(0xfff7fc,0xb8a6d1,.085+.15*t+.23*(.5+.5*Math.cos(u*13.6+.8*Math.sin(3*t)+s*.32))),
      (u,t)=>mix(0x57458b,0xb08ad6,.34+.18*Math.cos(u*13.6+t*2)),.0033,-s);
    const underside=(u,t)=>{const [x,y,z]=fall(u,.79+.21*t);
      return [x+s*.010*t,y-.007-.027*t**2*(.25+u),z-.012+.004*t];};
    cloth(side,coarse?9:15,5,underside,(u,t)=>mix(0x7055ac,0xb297d8,.17+.21*Math.cos(u*13.6+t)),P.lilac,.002,-s);
    for(const u of [0,.28,.72,1])edge(side,Array.from({length:9},(_,k)=>fall(u,k/8)),.0012,0xe6cddf);
    edge(side,Array.from({length:20},(_,k)=>fall(k/19,1)),.0023,P.snow);
    const wing=group(veil,'crystal filigree '+s,s*.099,.179,.010,'crystal');
    for(const [dx,dy,dz,w,c] of [[.046,.122,.042,.016,P.snow],[.066,.088,.062,.017,P.ice],[.025,.096,.082,.013,0xece1ff]]){
      leaf(wing,[[0,0,0,.008,.003],[s*dx*.70,dy*.36,dz*.22,w,.005],[s*dx*.86,dy*.72,dz*.73,w*.56,.0035],[s*dx,dy,dz,.001,.0008]],c);
    }
    edge(wing,[[s*.003,.003,-.002],[s*.025,.018,-.007],[s*.050,.048,-.006]],.0026,P.paleGold);
    heartGem(wing,s*.015,.002,-.015,.014,.017,P.rose,P.plum,-1);
  }
  for(const s of [-1,1]){
    edge(veil,[[0,.166,.127],[s*.033,.162,.127],[s*.069,.163,.108],[s*.103,.179,.059]],.0028,P.paleGold);
  }
  star(veil,0,.158,.135,.020,P.paleGold,1);gem(veil,0,.158,.140,.006,.010,P.rose,1);

  // Arms (separated SkinToon upper shoulder/bicep + SilkToon detached sleeves & opera gloves) & Legs.
  for(const s of [-1,1]){
    const arm=group(chest,'upper arm '+s,s*.154,.295,0,'silk');
    const armSkin=group(arm,'arm skin '+s,0,0,0,'skin');
    const fore=group(arm,'forearm '+s,0,-.256,0,'silk');
    const wrist=group(fore,'hand '+s,0,-.225,0,'silk');
    arms.push({arm,fore,wrist});
    // Slim blended anime shoulder cap (NO detached egg balloon!)
    oval(armSkin,[-s*.004,-.014,.001],[.039,.042,.038],P.skin);
    loft(armSkin,[[-.257,.032,.033,0],[-.209,.034,.036,.001],[-.122,.040,.039,0],
      [-.051,.042,.041,0],[-.010,.039,.038,0]],P.skin);
    // Detached, flared sleeves over the opera gloves.
    loft(arm,[[-.122,.050,.048,0],[-.103,.057,.052,0],[-.080,.050,.048,0],
      [-.065,.045,.046,0]],silk);
    circlet(arm,-.068,.047,.047,0,.0028,P.gold);
    circlet(arm,-.079,.050,.049,0,.0040,0x635086);
    const clasp=[s*.042,-.102,-.032];
    for(const [dx,dy,w] of [[-.026,.037,.009],[.024,.055,.010],[.041,.019,.009],[.018,-.028,.006]]){
      const [x,y,z]=clasp;leaf(arm,[[x,y,z,.006,.002],
        [x+s*dx*.54,y+dy*.49,z-.009,w,.004],[x+s*dx,y+dy,z-.016,.001,.001]],P.paleGold);
    }
    gem(arm,clasp[0],clasp[1],clasp[2]-.008,.011,.015,P.rose);
    for(const k of [-1,1])leaf(arm,[[s*.042,-.105,-.022,.006,.003],
      [s*(.051+.008*k),-.145,.002*k,.015,.004],[s*(.055+.015*k),-.199,.031+.014*k,.014,.004],
      [s*(.061+.019*k),-.237+.014*k,.056+.012*k,.001,.001]],k<0?P.iris:P.lilac);
    loft(fore,[[-.229,.020,.023,-.002],[-.202,.023,.024,0],[-.141,.029,.034,0],
      [-.080,.035,.037,-.002],[-.028,.034,.036,-.001],[.012,.030,.031,0]],silk);
    oval(fore,[0,.002,0],[.031,.032,.032],P.silk);
    loft(arm,[[-.255,.033,.035,0],[-.222,.034,.036,0],[-.194,.037,.038,0]],silk);
    circlet(arm,-.194,.038,.038,0,.0026,P.paleGold);
    edge(fore,[[s*.018,-.209,-.009],[s*.030,-.145,-.012],[s*.031,-.106,-.019]],.0026,P.gold);
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

    const leg=group(hip,'thigh '+s,s*.078,-.004,0,'silk'),shin=group(leg,'calf '+s,0,-.43,0,'silk');
    const foot=group(shin,'heel '+s,0,-.402,0,'silk');legs.push({leg,shin,foot});
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
    strand(foot,[[0,.014,.029,.025,.025],[0,-.003,.024,.033,.029],[0,-.029,-.014,.036,.026],
      [0,-.057,-.063,.040,.021],[0,-.067,-.108,.037,.014],[0,-.070,-.151,.006,.006]],P.silk,[1,0,0],14,12);
    leaf(foot,[[0,-.072,-.152,.004,.003],[0,-.077,-.105,.036,.004],
      [0,-.071,-.062,.037,.004],[0,-.046,-.014,.028,.003]],P.gold);
    strand(foot,[[0,-.008,.037,.023,.013],[0,-.034,.041,.015,.011],
      [0,-.071,.036,.008,.007],[0,-.083,.034,.008,.007]],P.gold);
    edge(foot,[[-.027,.006,-.009],[-.012,-.009,-.036],[.015,-.018,-.049],[.033,-.025,-.044]],.0035,P.gold);
    star(foot,s*.009,-.043,-.089,.010,P.paleGold);
  }

  // Redesigned First-Person Anime Elysia Viewmodel:
  //   - Right Hand (lower-right, graceful spellcaster/Miss Pink Elf poise): slender
  //     cel-shaded & colored-outlined pearl-white opera glove with gold/lilac lace
  //     cuff & fluttering ribbons, cradling a hovering luminous Elysia Crystal Blossom!
  //   - Left Hand: relaxed low & clear of the minimap at rest, swinging naturally up
  //     into the lower-left edge when walking, sprinting or jumping (NO zombie hands!).
  const fpsArms=group(root,'fps arms',0,1.35,0);
  const fpsHands=[], fpsRibbons=[];
  let fpsCrystal=null, fpsMotes=[];
  for(const s of [-1,1]){
    const isRight=s>0;
    const arm=group(fpsArms,'fps arm '+s,s*(isRight?.225:.235),isRight?-.225:-.325,-.18,'silk');
    const hand=group(arm,'fps hand '+s,-s*.022,.050,-.195,'silk');
    const ribbon=group(arm,'fps ribbon '+s,-s*.010,.038,-.168,'silk');
    arm.userData.outline=[0x65518c,.0013];
    hand.userData.outline=[0x65518c,.0011];
    ribbon.userData.outline=[0x584282,.0010];
    fpsHands.push({arm,hand,sign:s});
    fpsRibbons.push({ribbon,sign:s});

    // Slender tapered pearl-white silk opera glove forearm
    strand(arm,[
      [s*.105,-.152,.110,.027,.024],
      [s*.058,-.074,-.015,.024,.021],
      [s*.022,-.018,-.100,.021,.018],
      [-s*.004,.022,-.154,.0185,.0155],
      [-s*.022,.050,-.195,.0155,.0125],
      [-s*.024,.053,-.203,.0140,.0110]
    ],silk,[0,1,0],coarse?8:12,coarse?8:10);

    // Delicate pale-gold & lilac filigree vine lines along the opera glove
    edge(arm,[[s*.030,-.016,-.092],[s*.014,.012,-.124],[s*.002,.032,-.152],[-s*.010,.048,-.178]],.0018,P.paleGold,[0,1,0]);
    edge(arm,[[s*.010,-.008,-.104],[-s*.002,.020,-.136],[s*.006,.038,-.164],[-s*.015,.054,-.188]],.0016,P.lilac,[0,1,0]);

    // Flared detached lace cuff + violet-iris & gold wrist rings
    strand(arm,[
      [s*.002,.018,-.146,.023,.019],
      [-s*.006,.030,-.162,.025,.021],
      [-s*.013,.040,-.174,.020,.017]
    ],(u,v)=>mix(P.silk,P.snow,.52+.28*Math.cos(u*tau)+.15*v),[0,1,0],4,coarse?8:10);

    for(const [offZ,offY,offX,rx,ry,r,c] of [
      [-.160,.029,-s*.005,.026,.022,.0026,0x6a5396],
      [-.171,.037,-s*.011,.022,.018,.0022,P.paleGold],
      [-.193,.049,-s*.021,.0175,.014,.0019,P.paleGold]
    ]){
      const ring=Array.from({length:15},(_,k)=>{
        const a=k*tau/14;
        return [offX+rx*Math.cos(a),offY+ry*Math.sin(a),offZ-.004*Math.sin(a)];
      });
      edge(arm,ring,r,c,[0,0,1]);
    }

    // Sparkling 4-point gold star & ice-cyan wrist crystal atop the cuff
    star(arm,-s*.008,.058,-.170,.012,P.paleGold,-1);
    gem(arm,-s*.008,.060,-.174,.007,.011,P.crystal,-1);
    gem(arm,s*.014,.045,-.168,.006,.0085,P.rose,-1);

    // Graceful twin iris-violet & sakura-lilac silk wrist ribbons
    for(const k of [-1,1]){
      leaf(ribbon,[
        [s*.012,.002,.004,.004,.0018],
        [s*(.032+.009*k),-.012+.006*k,-.018,.012,.0025],
        [s*(.050+.014*k),-.044+.008*k,-.042,.011,.0022],
        [s*(.060+.016*k),-.080+.010*k,-.056,.0015,.0010]
      ],k<0?P.iris:P.lilac,[0,1,0]);
    }

    // Seamless silk wrist bridge & slender anime palm
    oval(hand,[0,.001,.002],[.0145,.0108,.015],P.silk,10,6);
    strand(hand,[
      [0,.001,.002,.0145,.0102],
      [-s*.003,.004,-.019,.0185,.0092],
      [-s*.006,.007,-.040,.0192,.0082],
      [-s*.009,.008,-.053,.0168,.0068]
    ],silk,[0,1,0],6,coarse?6:10);
    edge(hand,[
      [-s*.003,.014,-.014],[-s*.011,.017,-.030],[-s*.005,.018,-.044],[s*.003,.014,-.029],[-s*.003,.014,-.014]
    ],.0013,P.paleGold,[0,1,0]);
    gem(hand,-s*.005,.018,-.030,.0045,.0068,P.rose,-1);

    // Delicate anime fingers: right hand gently cradling upward; left hand softly relaxed
    const fingerSpecs=isRight?[
      {x:-.018,y:.009,spread:-.006,len:.045,arch:.008,tip:.012},  // index: gracefully poised up
      {x:-.010,y:.010,spread:-.001,len:.050,arch:.006,tip:.007},  // middle: slender curve
      {x:-.001,y:.009,spread: .004,len:.045,arch:.004,tip:.003},  // ring: soft arc
      {x: .007,y:.007,spread: .010,len:.035,arch:.007,tip:.010}   // pinky: lightly lifted
    ]:[
      {x:-.018,y:.009,spread:-.005,len:.044,arch:.007,tip:-.012},
      {x:-.010,y:.010,spread:-.001,len:.049,arch:.006,tip:-.015},
      {x:-.001,y:.009,spread: .004,len:.044,arch:.004,tip:-.016},
      {x: .007,y:.006,spread: .009,len:.034,arch:.005,tip:-.010}
    ];
    for(const f of fingerSpecs){
      const bx=s*f.x, by=f.y;
      strand(hand,[
        [bx,by,-.050,.0040,.0037],
        [bx+s*f.spread*.35,by+f.arch*.65,-.050-f.len*.36,.0035,.0033],
        [bx+s*f.spread*.72,by+f.arch*.45+f.tip*.50,-.050-f.len*.74,.0029,.0027],
        [bx+s*f.spread,by+f.tip,-.050-f.len,.0016,.0016]
      ],P.snow,[0,1,0],5,6);
    }
    strand(hand,[
      [-s*.014,.000,-.016,.0046,.0041],
      [-s*.020,.002,-.031,.0040,.0036],
      [-s*.022,.004,-.045,.0032,.0029],
      [-s*.019,.006,-.055,.0018,.0017]
    ],P.snow,[0,1,0],5,6);

    // Floating luminous Elysia Crystal Blossom ("真我水晶花") conjured above right hand!
    if(isRight){
      fpsCrystal=group(arm,'fps crystal blossom',-.042,.122,-.252,'crystal');
      fpsCrystal.userData.outline=[0x8d4a88,.0009];
      // Faceted sakura-rose & pearl heart crystal core
      gem(fpsCrystal,0,0,0,.014,.022,P.rose,-1);
      gem(fpsCrystal,0,0,0,.014,.022,P.pink,1);
      gem(fpsCrystal,0,.002,-.005,.007,.011,P.snow,-1);
      // 5 radiant iridescent sakura-pink & ice-cyan crystal petals blooming outward
      for(let p=0;p<5;p++){
        const a=p*tau/5-.3;
        const dx=Math.cos(a), dy=Math.sin(a);
        const col=p%2?P.ice:P.pink;
        leaf(fpsCrystal,[
          [dx*.006,dy*.006,0,.005,.002],
          [dx*.022,dy*.022,.004,.010,.003],
          [dx*.038,dy*.036,.002,.007,.0022],
          [dx*.048,dy*.045,-.002,.0012,.0010]
        ],col,[0,0,1]);
      }
      // Delicate golden crystal halo ring framing the blossom
      const halo=Array.from({length:17},(_,k)=>{const a=k*tau/16;return [Math.cos(a)*.032,Math.sin(a)*.032,.003];});
      edge(fpsCrystal,halo,.0013,P.paleGold,[0,0,1]);
      // 3 tiny orbiting diamond crystal sparkles drifting around the flower
      for(let m=0;m<3;m++){
        const mote=group(fpsCrystal,'fps crystal mote '+m,0,0,0,'crystal');
        mote.userData.noOutline=true;
        gem(mote,0,0,0,.0042,.0075,m===1?P.pink:P.ice,-1);
        gem(mote,0,0,0,.0042,.0075,m===1?P.pink:P.ice,1);
        fpsMotes.push({mote,angle:m*tau/3,radius:.052+.010*(m%2),height:(m-1)*.014});
      }
    }
  }
  fpsArms.visible=false;

  const meshes=art.finish();
  return {root,body,hip,chest,head,faceMat,arms,legs,locks,veilSides,trains,skirt,mane,upper,skirts,fpsArms,fpsHands,fpsRibbons,fpsCrystal,fpsMotes,meshes};
}
