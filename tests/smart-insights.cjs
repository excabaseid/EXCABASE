const assert=require('assert'),{analyze}=require('../js/smart-insights-model.js');
let checks=0;function check(ok,msg){assert(ok,msg);checks++;}
const row=(type,q=100,basis='lcm',units=2)=>({type,units,totalProductivity:q,workVolume:1000,workVolumeBasis:basis});
const scenarios=rows=>Object.fromEntries(['dasar','hemat','cepat'].map((k,i)=>[k,{totalCost:[200,100,300][i],longestEquipmentDuration:[4,6,2][i],totalUnits:rows.reduce((s,e)=>s+e.units,0),equipment:structuredClone(rows)}]));
for(const loader of ['excavator','wheelloader'])for(const ratio of [.1,.5,1,1.5,3,100])for(const selected of ['dasar','hemat','cepat']){
 const input=scenarios([row(loader,200),row('dumptruck',200*ratio)]),before=JSON.stringify(input);
 const r=analyze(input,selected);
 check(r.balance.valid,'valid pair');check(Math.abs(r.balance.ratio-ratio*100)<1e-8,'capacity ratio');check(r.balance.loading===200,'total Q used directly, not multiplied again');check(r.insights.length>=2&&r.insights.length<=3,'2–3 insights');check(JSON.stringify(input)===before,'immutable');
}
const six=scenarios([row('excavator',200),row('wheelloader',300),row('dumptruck',100),row('bulldozer'),row('motorgrader'),row('compactor',100,'ccm')]);
check(!analyze(six,'dasar').balance.valid,'ambiguous source not assumed');
check(analyze(six,'dasar','excavator').balance.ratio===50,'explicit ex pair');
check(Math.abs(analyze(six,'dasar','wheelloader').balance.ratio-100/3)<1e-8,'explicit loader pair');
check(!analyze(scenarios([row('bulldozer'),row('motorgrader'),row('compactor',100,'ccm')]),'dasar').balance.valid,'independent work not compared');
for(const patch of [{workVolumeBasis:'ccm'},{workVolumeBasis:''},{workVolumeBasis:'m2'},{workVolume:500},{workVolume:null},{totalProductivity:null},{totalProductivity:0}]){
 const rows=[row('excavator'),{...row('dumptruck'),...patch}];
 check(!analyze(scenarios(rows),'dasar').balance.valid,'incomparable pair '+JSON.stringify(patch));
}
for(const bad of [null,NaN,Infinity,'',-1]){
 const s=scenarios([row('excavator'),row('dumptruck')]);s.hemat.totalCost=bad;check(analyze(s,'dasar')===null,'invalid result hidden');
}
let s=scenarios([row('excavator'),row('dumptruck')]);delete s.cepat;check(analyze(s,'dasar')===null,'partial scenarios hidden');
s=scenarios([row('excavator'),row('dumptruck')]);s.cepat.equipment[0].workVolume=2000;check(!analyze(s,'dasar').comparable,'scope mismatch not ranked');
s=scenarios([row('excavator'),row('dumptruck')]);for(const v of Object.values(s)){v.totalCost=100;v.longestEquipmentDuration=3;}
check(analyze(s,'dasar').insights.join(' ').includes('ketiga skenario sama'),'cost/duration ties honest');
check(!/undefined|NaN|null/.test(JSON.stringify(analyze(s,'dasar').insights)),'valid narrative');
console.log(JSON.stringify({passed:true,assertions:checks}));
