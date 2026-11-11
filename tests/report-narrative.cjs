const assert=require('assert');
const {build}=require('../js/report-narrative.js');
const row=(type,basis='lcm')=>({type,units:2,workVolume:1000,workVolumeBasis:basis,totalHourlyProductivity:365.201,durationDays:2,totalOperatingCost:100000});
const base={equipment:[row('wheelloader'),row('motorgrader'),row('compactor','ccm')],longestDuration:2,totalCost:300000,totalUnits:6};
let count=0;
function check(value,message){assert(value,message);count++;}
for(const equipment of [[row('excavator')],base.equipment,[],[row('compactor','bcm')]]) {
 const input={...base,equipment};const before=JSON.stringify(input);const out=build(input);const text=JSON.stringify(out);
 check(out.analysis.length>=2&&out.analysis.length<=3,'2–3 analysis paragraphs');
 check(out.conclusion.length>=1&&out.conclusion.length<=2,'1–2 conclusion paragraphs');
 check(!/undefined|NaN|null/.test(text),'no invalid text');check(JSON.stringify(input)===before,'immutable');
 check(text.includes('paralel')&&text.includes('ketergantungan'),'schedule limitations');
 check(text.includes('belum tersedia'),'no fleet limitation');
}
const scenario=(cost,days,units)=>({totalCost:cost,longestEquipmentDuration:days,totalUnits:units,equipment:base.equipment});
const fleet={selectedScenario:'cepat',scenarios:{dasar:scenario(300,3,6),hemat:scenario(200,4,3),cepat:scenario(400,2,9)}};
let out=build({...base,fleet});let text=out.analysis.join(' ');
check(text.includes('biaya terendah terdapat pada Hemat'),'minimum cost from data');
check(text.includes('durasi terpendek pada Cepat'),'minimum duration from data');
check(out.conclusion.join(' ').includes('memilih Skenario Cepat'),'selection');
fleet.scenarios.hemat=structuredClone(fleet.scenarios.dasar);fleet.scenarios.cepat=structuredClone(fleet.scenarios.dasar);
check(build({...base,fleet}).analysis.join(' ').includes('ketiganya sama'),'ties');
fleet.scenarios.hemat.equipment=[row('excavator')];
check(!build({...base,fleet}).analysis.join(' ').includes('biaya terendah terdapat'),'unequal scope not ranked');
delete fleet.scenarios.hemat;
check(build({...base,fleet}).analysis.join(' ').includes('belum lengkap'),'partial scenarios');
out=build({equipment:[{type:'compactor',units:null}],fleet:{},totalCost:NaN,longestDuration:null});
check(!/undefined|NaN|null/.test(JSON.stringify(out)),'missing metrics');
check(out.analysis.join(' ').includes('Biaya operasional belum lengkap'),'missing cost limitation');
console.log(JSON.stringify({passed:true,assertions:count}));
