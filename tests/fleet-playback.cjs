const assert=require('assert');
for(const name of ['engine','bulldozer','loader','passes','grader','compactor','fleet'])require('../js/fleet-visualization-'+name+'.js');
const Playback=require('../js/fleet-visualization-playback.js'),api=globalThis.ExcabaseFleetEngine;
let checks=0;const check=(ok,label)=>{assert(ok,label);checks++;};
function equal(a,b,path='state'){
 if(typeof a==='number')check(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(a)),path);
 else if(a&&typeof a==='object'){for(const k of Object.keys(a))equal(a[k],b[k],path+'.'+k);}
 else check(a===b,path);
}
for(const count of [1,200])for(const source of ['excavator','wheelloader']){
 const config={volumeLCM:20*count,excavatorCount:count,truckCount:count,bucketCapacity:2,fillFactor:1,excavatorCycleSeconds:.2,excavatorEfficiency:1,truckCapacity:6,truckEfficiency:1,loadedTravelSeconds:1,unloadSeconds:.5,returnTravelSeconds:1,workingHours:8,
 bulldozer:{count,volume:10*count,hourlyPerUnit:3600,cycleSeconds:1,basis:'lcm',approachShare:10,pushShare:50,returnShare:30},
 wheelLoader:{count,volumeLCM:10*count,hourlyPerUnit:3600,cycleSeconds:1,truckCount:0},
 grader:{count,area:10*count,hourlyArea:3600,width:2,length:1,passes:3,basis:'m2'},
 compactor:{count,area:10*count,hourlyArea:3600,width:2,length:1,passes:4,basis:'m2'}};
 if(source==='wheelloader'){
  config.haulingSource=source;
  Object.assign(config.wheelLoader,{volumeLCM:config.volumeLCM,truckCount:count,truckCapacity:6,loadedTravelSeconds:1,unloadSeconds:.5,returnTravelSeconds:1,truckEfficiency:1});
 }
 const baseline=new api.FleetEngine(config);baseline.advance(5);const atFive=baseline.snapshot();baseline.advance(1000);
 for(const speed of [1,10,50,100]){
  const e=new api.FleetEngine(config),p=new Playback(e);let elapsed=0;
  while(elapsed<5){const dt=Math.min(speed/60,5-elapsed);p.enqueue(dt);while(p.pending)p.flush(()=>0);elapsed+=dt;}
  equal(e.snapshot(),atFive);check(e.snapshot().progress<=100,'progress bounded');
  while(!e.finished){p.enqueue(speed/60);p.flush(()=>0);}
  equal(e.snapshot(),baseline.snapshot());
  equal(e.children.map(c=>c.units?.map(u=>({cycles:u.cycles,passes:u.passes}))||c.trucks.map(t=>t.trips)),baseline.children.map(c=>c.units?.map(u=>({cycles:u.cycles,passes:u.passes}))||c.trucks.map(t=>t.trips)));
  check(e.delivered===config.volumeLCM&&e.dozer.pushed===config.bulldozer.volume,'targets exact');
  check(JSON.stringify(e.config)===JSON.stringify(baseline.config),'configuration unchanged');
 }
}
const mock={finished:false,time:0,advance(dt){this.time+=dt;},snapshot(){return {time:this.time};}};
const p=new Playback(mock);p.enqueue(100);p.flush(()=>0);check(Math.abs(mock.time-25)<1e-8&&Math.abs(p.pending-75)<1e-8,'250 step cap retains backlog');
let budgetClock=0;p.flush(()=>budgetClock+=9);check(Math.abs(mock.time-25.1)<1e-8,'time budget yields after one step');
while(p.pending)p.flush(()=>0);check(Math.abs(mock.time-100)<1e-7,'backlog fully processed');
console.log(JSON.stringify({passed:true,assertions:checks,speeds:[1,10,50,100],fleetUnits:[6,1200]}));
