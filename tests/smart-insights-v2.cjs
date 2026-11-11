const assert=require('assert'),M=require('../js/smart-insights-model.js');
let checks=0;const check=(v,m)=>{assert(v,m);checks++;},near=(a,b)=>Math.abs(a-b)<1e-8;
const types=['excavator','dumptruck','wheelloader','bulldozer','motorgrader','compactor'];
function scenarios(included=types,ratio=.5){return Object.fromEntries(['dasar','hemat','cepat'].map((key,index)=>{
 const units=[2,1,3][index],equipment=included.map(type=>({type,units,productivityPerUnit:type==='dumptruck'?160*ratio:160,totalProductivity:units*(type==='dumptruck'?160*ratio:160),durationDays:6/units,totalCost:1000,workVolume:1000,workVolumeBasis:type==='compactor'?'ccm':'lcm'}));
 return [key,{totalUnits:units*included.length,totalCost:1000*included.length,longestEquipmentDuration:6/units,equipment}];
}));}
for(const [ratio,tone,side]of [[.5,'red','pengangkutan'],[.7,'yellow','pengangkutan'],[.9,'green','pengangkutan'],[1,'green','setara'],[1.1,'green','pemuatan'],[1.2,'yellow','pemuatan'],[1.4,'yellow','pemuatan'],[3,'red','pemuatan']]){
 const source=scenarios(['excavator','dumptruck'],ratio),before=JSON.stringify(source),r=M.analyze(source,'dasar','',3);
 check(r.balanceIndicator.tone===tone,'classification '+ratio);check(r.balanceIndicator.side===side,'limiter side '+ratio);
 check(near(r.balanceIndicator.capacity,Math.min(320,320*ratio)),'limiter capacity');check(JSON.stringify(source)===before,'source immutable');
}
let source=scenarios();const project={results:{productivity:{excavator:{model:'Model sumber'}},productivityInputs:{compactor:{fields:{compactorPasses:'4',compactorThickness:'.25'}}}}};
for(const selected of ['dasar','hemat','cepat']){
 const r=M.analyze(source,selected,'excavator',3,{project});
 check(r.overview.units===source[selected].totalUnits&&r.overview.types===6,'units not type count');
 check(r.equipment.length===6,'six performance cards');
 for(const e of r.equipment){const row=source[selected].equipment.find(row=>row.type===e.type),base=source.dasar.equipment.find(row=>row.type===e.type);
  check(e.total===row.totalProductivity&&e.perUnit===row.productivityPerUnit&&e.units===row.units,'source Q and units '+e.type);
  check(e.duration===row.durationDays&&e.cost===row.totalCost,'source duration/cost');
  check(near(e.durationChange.percent,(row.durationDays-base.durationDays)/base.durationDays*100),'duration change');
  check(e.driver&&e.flags.some(f=>f.label==='Penentu durasi perencanaan'),'duration ties preserve all drivers');
 }
 check(r.equipment.find(e=>e.type==='compactor').passes===4&&r.equipment.find(e=>e.type==='compactor').thickness===.25,'compactor parameters retained');
 check(r.equipment.find(e=>e.type==='excavator').model==='Model sumber','actual model');
 check(r.durationDriver.verified&&r.durationDriver.names.length===6,'maximum matches current model');
}
for(const type of types){const r=M.analyze(scenarios([type]),'cepat');check(r.equipment.length===1&&r.equipment[0].type===type,'single equipment '+type);check(!r.balance.valid&&r.balanceIndicator.tone==='gray','no forced pair');}
check(M.analyze(source,'dasar').balanceIndicator.tone==='gray','ambiguous pair');
let custom=M.analyze(scenarios(['excavator','dumptruck']), 'dasar','',3,{thresholds:{criticalLow:40}});
check(custom.balanceIndicator.tone==='yellow','configurable heuristic');
check(M.thresholds({criticalLow:100})===null&&M.thresholds({balancedHigh:90})===null,'invalid thresholds');
source=scenarios(['excavator','dumptruck']);source.dasar.totalCost=0;source.cepat.totalCost=500;
let r=M.analyze(source,'cepat');check(r.comparison.find(c=>c.key==='cepat').cost.percent===null,'zero divisor not invented');
check(near(r.comparison.find(c=>c.key==='cepat').tradeoff,500),'cost per saved model day');
check(M.change(2,0).percent===null&&M.change(null,3).absolute===null,'missing/zero safe');
check(M.change(1000+1e-9,1000).percent===0,'floating-point noise not interpreted as a change');
source=scenarios(['bulldozer']);source.cepat.equipment.push({...source.cepat.equipment[0]});r=M.analyze(source,'cepat');
check(r.equipment[0].units===null&&r.equipment[0].total===null&&!r.equipment[0].driver,'duplicate equipment not silently selected or aggregated');
source=scenarios(['compactor']);source.cepat.equipment[0].totalProductivity=null;r=M.analyze(source,'cepat');
check(r.equipment[0].flags.some(f=>f.label==='Data belum cukup')&&r.equipment[0].total===null,'missing capacity gray');
source=scenarios(['motorgrader']);for(const s of Object.values(source))s.equipment[0].workVolumeBasis='m2';r=M.analyze(source,'dasar');
check(r.equipment[0].unit==='m²/jam','area basis');
source.cepat.longestEquipmentDuration=99;r=M.analyze(source,'cepat');check(!r.durationDriver.verified&&!r.equipment[0].driver,'do not repair inconsistent source');
check(!/NaN|Infinity|undefined/.test(JSON.stringify(r.recommendations)),'safe recommendation text');
console.log(JSON.stringify({passed:true,assertions:checks}));
