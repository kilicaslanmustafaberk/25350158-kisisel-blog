import assert from "node:assert/strict";
import test from "node:test";
import { pinRange, pinnedBranch, sceneState, shiftStickyRoute } from "../src/features/motion/pinned-scene";
import { buildSpineRoute, routePoint } from "../src/features/motion/data-spine";

test("pin budget gives each item ~0.42 viewport so one wheel delta cannot finish a branch", () => {
  const one = pinRange(1000, 900, 80, 500, 1, false, false);
  const three = pinRange(1000, 900, 80, 500, 3, false, false);
  assert.ok(one.enabled && three.distance > one.distance);
  assert.equal(three.start, 904);
  assert.equal(three.end, three.start + three.distance);
  assert.ok(pinRange(1000, 900, 80, 500, 3, true, false).distance < three.distance);
  const step=(three.distance-one.distance)/2;
  assert.ok(Math.abs(step - 378)<1); assert.ok(step>=900*.35 && step<=900*.5);
  assert.ok(three.distance < 900*1.6);
});
test("zero targets, short viewport, tall content and reduced motion bypass extra scroll", () => {
  for (const range of [pinRange(0,900,80,500,0,false,false),pinRange(0,420,80,200,3,false,false),pinRange(0,900,80,900,3,false,false),pinRange(0,900,80,500,3,false,true),pinRange(NaN,900,80,500,3,false,false)]) {
    assert.equal(range.enabled,false); assert.equal(range.distance,0);
    assert.deepEqual(sceneState(200,range),{mode:"traveling",progress:1,offset:0});
  }
});
test("sticky offset holds physical position throughout native scroll then releases", () => {
  const r=pinRange(1000,900,80,500,3,false,false);
  for (const progress of [0,.2,.5,.9,1]) {
    const scroll=r.start+progress*r.distance, state=sceneState(scroll,r);
    assert.equal(state.mode,"pinnedSequence");
    assert.ok(Math.abs(1000+state.offset-scroll-96)<1e-8);
  }
  assert.equal(sceneState(r.start-1,r).mode,"enteringHub");
  assert.equal(sceneState(r.end+1,r).mode,"leavingHub");
});
test("continuous step thresholds draw branch before revealing target and retain previous calls", () => {
  assert.deepEqual(pinnedBranch(0,3,0),{branch:0,item:0,hubPulse:0,endpointPulse:0});
  const first=pinnedBranch(.15,3,0); assert.ok(first.branch>0); assert.equal(first.item,0);
  assert.deepEqual(pinnedBranch(.4,3,0),{branch:1,item:1,hubPulse:0,endpointPulse:0});
  assert.ok(pinnedBranch(.4,3,1).branch>0); assert.equal(pinnedBranch(.4,3,2).branch,0);
  for(let i=0;i<3;i++) assert.deepEqual(pinnedBranch(3/3.08,3,i),{branch:1,item:1,hubPulse:0,endpointPulse:0});
});
test("reverse scroll retraces same states without snapping or direction booleans", () => {
  const r=pinRange(1000,900,80,500,3,false,false);
  const forward=[0,.2,.4,.6,.8,1].map(p=>sceneState(r.start+p*r.distance,r));
  assert.deepEqual([1,.8,.6,.4,.2,0].map(p=>sceneState(r.start+p*r.distance,r)).reverse(),forward);
  assert.equal(pinnedBranch(.4,3,2).item,0); assert.equal(pinnedBranch(.4,3,0).item,1);
});
test("single item has a finite short call and settled release; malformed calls stay safe", () => {
  assert.deepEqual(pinnedBranch(1/1.08,1,0),{branch:1,item:1,hubPulse:0,endpointPulse:0});
  for(const args of [[NaN,1,0],[.5,0,0],[.5,1,2]]) assert.deepEqual(pinnedBranch(...args as [number,number,number]),{branch:0,item:0,hubPulse:0,endpointPulse:0});
});
test("each equal segment pulses hub, draws line continuously, pulses endpoint, then reveals content", () => {
  for(const count of [1,3,5,6]) for(let index=0;index<count;index++) {
    const at=(fraction:number)=>pinnedBranch((index+fraction)/(count+.08),count,index);
    assert.ok(at(.04).hubPulse>.99); assert.equal(at(.04).branch,0);
    // Continuous draw: intermediate frames are proportional, not a threshold snap.
    for(const [f,b] of [[.2,.179],[.5,.627],[.65,.851]]) assert.ok(Math.abs(at(f).branch-b)<.01);
    assert.equal(at(.5).item,0); assert.equal(at(.80).item,0);
    assert.ok(at(.75).branch>.999);
    assert.ok(at(.805).endpointPulse>.99); assert.equal(at(.805).item,0);
    assert.ok(at(.92).item>.49 && at(.92).item<.51); assert.equal(at(.92).branch,1);
    assert.deepEqual(at(1),{branch:1,item:1,hubPulse:0,endpointPulse:0});
  }
});
test("sticky route uses cached samples and keeps shifted hubs connected across full pin and reverse", () => {
  const base=buildSpineRoute([{id:"a",x:50,top:0,bottom:400,hubY:100,width:100,calm:true},{id:"b",x:100,top:1000,bottom:1500,hubY:1100,width:100,calm:true}],{top:0,bottom:2000},{mobile:false})!;
  const original=base.samples.slice();
  const visual={...base,samples:base.samples.slice(),hubs:base.hubs.map(h=>({...h}))};
  const buffer=visual.samples;
  for(const shift of [0,300,800,300,0]) {
    shiftStickyRoute(base,visual,[shift,0]);
    assert.equal(visual.samples,buffer); assert.equal(visual.hubs[0].y,100+shift);
    assert.ok(Math.abs(routePoint(visual,base.hubs[0].u).y-(100+shift))<2);
    assert.deepEqual(base.samples,original);
  }
});
