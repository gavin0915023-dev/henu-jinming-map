// Motion authored for the campus rig; distances are metres, angles radians.
// Phase follows real displacement so pressing into a wall doesn't cycle feet.
import {Vector3,Quaternion} from './assets/three.module.min.js';
import {drape} from './elysia-drape.js';
export const WALK_PACE=1.55, RUN_PACE=3.55;
const tau=Math.PI*2, clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t, ease=t=>t*t*(3-2*t), damp=(a,b,h,dt)=>mix(a,b,1-Math.exp(-h*dt));
function cycle(keys,p){
  for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){
    const [t,a]=keys[i-1],[u,b]=keys[i];return mix(a,b,ease((p-t)/(u-t)));
  }
  return keys.at(-1)[1];
}
function stepTarget(p,stride,run){
  const duty=mix(.59,.43,run),back=-stride*duty/2,front=-back, swing=(p-duty)/(1-duty);
  // Linear travel through support cancels the forward motion of the root.
  // During recovery, the toe clears the ground before the heel reaches forward.
  const fore=p<duty?front-p*stride:mix(back,front,ease(swing));
  const lift=p<duty?0:Math.sin(Math.PI*swing)**1.5*mix(.095,.215,run);
  const pitch=cycle([[0,.16],[.13,.015],[duty*.66,0],[duty,-.37],[duty+(1-duty)*.34,-.40],
    [duty+(1-duty)*.75,.13],[1,.16]],p);
  return {fore,lift,pitch};
}
function legIK(part,down,fore,pitch){
  const a=.43,b=.402,d=clamp(Math.hypot(down,fore),.15,a+b-.00005);
  const knee=-Math.acos(clamp((d*d-a*a-b*b)/(2*a*b),-1,1));
  const hip=Math.atan2(fore,down)-Math.atan2(b*Math.sin(knee),a+b*Math.cos(knee));
  part.leg.rotation.x=hip;part.shin.rotation.x=knee;part.foot.rotation.x=pitch-hip-knee;
}
// Both arms have the same rest axis. Solve the wrist in shoulder space; the
// separate palm direction lets the fingertips hover next to the cheek.
function armPose(target,pole,fingers){
  const down=new Vector3(0,-1,0),end=new Vector3(...target),d=end.length(),axis=end.clone().normalize();
  const side=new Vector3(...pole);side.addScaledVector(axis,-side.dot(axis)).normalize();
  const along=(.256**2-.225**2+d*d)/(2*d);
  const elbow=axis.multiplyScalar(along).addScaledVector(side,Math.sqrt(.256**2-along**2));
  const upper=new Quaternion().setFromUnitVectors(down,elbow.clone().normalize());
  const lower=new Quaternion().setFromUnitVectors(down,end.sub(elbow).normalize());
  const hand=new Quaternion().setFromUnitVectors(down,new Vector3(...fingers).normalize());
  return [upper,upper.clone().invert().multiply(lower),lower.clone().invert().multiply(hand)];
}
function pivotHeight(angle){
  const c=Math.cos(angle),s=Math.sin(angle);
  return Math.max(.083*c+.034*s,.077*c-.105*s,.073*c-.149*s);
}
export function animateElysia(rig){
  let time=0,phase=0,motion=0,run=0,turn=0,air=0,trail=0,side=0,settled=2,fpsTurn=0;
  const cheek=armPose([-.068,.056,-.135],[.060,-.20,-.155],[-.15,.91,.36]);
  const waist=armPose([.142,-.245,-.124],[-.12,-.26,-.08],[.88,-.26,.06]);
  const flex=drape(rig);
  function reset(){time=0;phase=0;motion=run=turn=air=trail=side=fpsTurn=0;settled=2;flex.reset();}
  function update({dt=0,speed=0,distance,turnRate=0,sprinting=false,grounded=true,velY=0,landDip=0,still=false,pitch=0,bobPhase=0,bobAmp=0}){
    dt=clamp(dt,0,.16); if(!still)time+=dt;
    motion=damp(motion,clamp(speed/.82),speed>.15?11:8,dt);
    run=damp(run,sprinting||speed>2.3?1:0,8,dt);
    turn=damp(turn,clamp(turnRate,-3,3),8,dt);
    fpsTurn=damp(fpsTurn,clamp(turnRate,-2.5,2.5),10,dt);
    air=damp(air,grounded?0:1,grounded?19:17,dt);
    const stride=mix(1.10,1.68,run);
    if(grounded && speed>.018)phase=(phase+clamp(distance??speed*dt,0,.55)/stride)%1;
    settled=speed<.12&&grounded?Math.min(20,settled+dt):0;
    const wave=Math.cos(tau*phase),relax=(1-motion)*(1-air);
    const breath=still?0:Math.sin(time*1.92),sway=still?0:Math.sin(time*.83);
    const gesture=time%10.8;
    const beat=(still?1:ease(clamp((gesture-.9)/1.65))*ease(clamp((5.65-gesture)/1.70)))*ease(clamp((settled-.6)/1.1))*relax;
    const rise=clamp(velY/7.2,-1,1);
    const feet=[stepTarget(phase,stride,run),stepTarget((phase+.5)%1,stride,run)];
    const targets=feet.map((f,i)=>{
      const idleFore=i===0?-.032:.085;
      const footPitch=mix(i===0?.015:-.09,f.pitch,motion);
      return {fore:mix(idleFore,f.fore,motion),lift:f.lift*motion,pitch:footPitch,ankle:pivotHeight(footPitch)+f.lift*motion};
    });
    let y=.907+breath*.0018*relax+Math.cos(phase*tau*2+Math.PI)*.017*motion;
    for(const t of targets){
      y=Math.min(y,t.ankle+.004+Math.sqrt(Math.max(.22,.829**2-t.fore**2)));
    }
    const fullBody=rig.chest.visible;
    rig.hip.position.set(-.027*relax+.014*wave*motion+breath*.0015*relax,y+landDip*.47+air*.017,0);
    rig.hip.rotation.set(0,.16*relax+wave*.095*motion,.05*relax+.025*Math.sin(tau*phase)*motion);
    if(fullBody){
      rig.chest.rotation.set(-.025-.045*beat-.055*motion-.105*run*motion+landDip*.35,
        -.22*relax-.09*beat-wave*.13*motion-turn*.025,.015*relax-rig.hip.rotation.z*.66-turn*.018-.045*beat);
      rig.head.rotation.set(.021-rig.chest.rotation.x*.64+.014*breath*relax,
        .15*relax+.05*sway*relax+wave*.034*motion+turn*.047,-.072*relax-.082*beat);
      const blink=still?1:1-.94*Math.max(0,1-Math.abs((time%4.63)-3.74)/.088);
      for(const eye of rig.eyes)eye.scale.y=blink;
    }
    for(let i=0;i<2;i++){
      const sign=i?1:-1,opposite=i?-wave:wave,t=targets[i],leg=rig.legs[i],a=rig.arms[i];
      const down=rig.hip.position.y-.004-t.ankle;
      legIK(leg,down,t.fore,t.pitch);
      leg.leg.rotation.x=mix(leg.leg.rotation.x,i?-.14+.05*rise:.37+.13*rise,air);
      leg.shin.rotation.x=mix(leg.shin.rotation.x,i?-.53:-.93,air);
      leg.foot.rotation.x=mix(leg.foot.rotation.x,-.25,air);
      leg.leg.rotation.z=-sign*(.048*relax+.025*motion)-rig.hip.rotation.z*.55;
      leg.foot.rotation.y=-sign*(.10*relax+.045*motion);
      if(fullBody){
        a.arm.rotation.x=mix(i?.055:-.036,-opposite*mix(.26,.49,run)-.08*run,motion)+air*(i?.14:.27);
        a.arm.rotation.y=sign*(.08+.13*relax)-turn*.034;
        a.arm.rotation.z=sign*(.13+.045*motion+.115*air+(i?.015:.06)*relax);
        a.fore.rotation.x=mix(i?.27:.49,mix(.34,.82,run)-opposite*.12,motion)+.15*air;
        a.fore.rotation.y=sign*(.16+.12*relax);
        a.wrist.rotation.set(-.17+.04*opposite*motion,
          sign*(-.14+.055*breath*relax),-sign*(.13+.06*relax));
        const pose=i?cheek:waist,amount=i?beat:.19*relax+.81*beat;
        a.arm.quaternion.slerp(pose[0],amount);a.fore.quaternion.slerp(pose[1],amount);a.wrist.quaternion.slerp(pose[2],amount);
      }
    }
    // Cloth follows acceleration and angular velocity with different settling
    // times; skip hidden hair/veil/train vertex skinning completely in FPS mode.
    trail=damp(trail, .055*motion+.25*run*motion+.085*air+.065*rise*air,4.4,dt);
    side=damp(side,turn*.105+Math.sin(phase*tau)*.042*motion,3.0,dt);
    rig.skirt.rotation.y=-rig.hip.rotation.y*.38-side*.22;
    if(fullBody){
      rig.mane.rotation.set(-trail*.28,side*.29,-side*.25);
      rig.locks.forEach((lock,i)=>{
        lock.rotation.x=-trail*(.51+.17*Math.cos(i*1.8))+.014*breath*relax;
        lock.rotation.z=-side*(.38+.09*i)+.018*Math.sin(time*1.9+i*.62)*(!still)*(.25+motion);
      });
      rig.veilSides.forEach((v,i)=>{
        v.rotation.x=-trail*1.25+.022*breath*relax;
        v.rotation.z=-side*.92+(i?1:-1)*.019*Math.sin(time*1.72+i)*(!still);
      });
      rig.trains.forEach((v,i)=>{
        const s=i?1:-1;
        v.rotation.x=-.035-trail*1.56-s*.068*Math.sin(phase*tau-.63)*motion;
        v.rotation.z=-side*.99+s*(.016+.034*motion)+.014*sway*relax;
      });
      flex.update(dt,time,phase,motion,run,air,turn,still);
    }

    // First-person sculpted opera-gloved arms: breathing poise at rest,
    // rhythmic alternating stride swing, sprint energy, jump lift, turn sway,
    // and graceful parting when looking straight down at her skirt & heels.
    if(rig.fpsArms?.visible){
      const lookDown=ease(clamp((-pitch-.50)/.65));
      const strideSin=bobAmp>.01?Math.sin(bobPhase*.5):Math.sin(phase*tau);
      const strideCos=bobAmp>.01?Math.cos(bobPhase):Math.cos(phase*tau*2);
      const strideAmp=Math.max(motion,bobAmp);
      const idleFloat=still?0:Math.sin(time*1.85);
      const idleAlt=still?0:Math.cos(time*1.28);
      for(const {arm,hand,sign:s} of rig.fpsHands){
        const alt=s*strideSin;
        const baseX=s*(s>0?.212:.200)+s*.085*lookDown-fpsTurn*.016;
        const baseY=-.232+(s>0?.016:0)-.068*lookDown
          +idleFloat*.0055*(1-strideAmp*.5)
          +Math.abs(strideSin)*.014*strideAmp*(1+run*.65)
          +strideCos*.006*strideAmp
          +air*(.034+.028*rise)+landDip*.28;
        const baseZ=-.19+.055*lookDown
          -alt*(.044+.036*run)*strideAmp
          -.018*run*strideAmp
          -.014*air;
        arm.position.set(baseX,baseY,baseZ);
        arm.rotation.set(
          .04+alt*(.11+.09*run)*strideAmp+.14*air+.07*rise*air+landDip*.6-.16*lookDown,
          -s*.05-fpsTurn*.045-s*.14*lookDown+alt*.05*strideAmp,
          -s*(.04+.09*lookDown)+fpsTurn*.035+s*idleAlt*.018
        );
        // Graceful dorsal-inward hand roll so the gold/rose embroidery & gently arched fingers shine.
        hand.rotation.set(
          -.04+idleFloat*.030+.08*air-alt*.06*strideAmp,
          s*(.12+idleAlt*.025),
          -s*(.24+idleFloat*.020+.05*air)
        );
      }
      for(const {ribbon,sign:s} of rig.fpsRibbons){
        const flutter=still?0:Math.sin(time*2.6+s*1.3);
        ribbon.rotation.set(
          -.08-trail*.45-.18*air+flutter*.05*(.4+strideAmp),
          -s*.12-fpsTurn*.18,
          s*(.08+flutter*.07*(.4+strideAmp))-fpsTurn*.12
        );
      }
    }
  }
  return {update,reset};
}
