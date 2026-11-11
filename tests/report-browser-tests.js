/* Executed by the isolated Chrome runner against the actual report page. */
window.runReportBrowserTests=async function(){
 let assertions=0;const examples=[];
 const assert=(ok,msg)=>{if(!ok)throw Error(msg);assertions++;};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const equipment=(type,basis='lcm',units=1)=>({type,units,hourlyProductivity:365.201,totalHourlyProductivity:365.201*units,volumeBasis:basis,workVolumeBasis:basis,workVolume:10000,durationDays:4,totalOperatingCost:2000000,costPerHour:100000});
 const one=[equipment('wheelloader')],many=[equipment('wheelloader','lcm',2),equipment('motorgrader'),equipment('compactor','ccm')];
 const cases=[{name:'satu alat',equipment:one},{name:'beberapa alat, basis campuran',equipment:many},{name:'tiga skenario',equipment:many,fleet:true},{name:'skenario tidak lengkap',equipment:one,partial:true},{name:'nilai tidak lengkap',equipment:[{...equipment('compactor','bcm'),durationDays:null,totalOperatingCost:null}]}];
 for(const c of cases){
  const p={id:'report-audit',name:'Uji '+c.name,status:'aktif',workType:'Pekerjaan tanah bertahap',soilVolumeBCM:8000,targetDays:10,workHoursPerDay:8,results:{earthwork:{BCM:8000,LCM:10000,CCM:7000},estimate:{equipment:c.equipment},productivity:Object.fromEntries(c.equipment.map(e=>[e.type,{hourly:e.hourlyProductivity,volumeBasis:e.volumeBasis,model:'Model uji'}]))}};
  if(c.fleet||c.partial){p.results.fleet={selectedScenario:'cepat',estimateSignature:getExcabaseEstimateSignature(p),scenarios:{}};
   for(const [key,totalCost,longestEquipmentDuration,totalUnits] of [['dasar',6000000,4,4],['hemat',5000000,6,3],['cepat',7000000,3,6]])p.results.fleet.scenarios[key]={totalCost,longestEquipmentDuration,totalUnits,equipment:c.equipment.map(e=>({...e,totalProductivity:e.totalHourlyProductivity}))};
   if(c.partial)delete p.results.fleet.scenarios.hemat;
  }
  if(c.fleet)window.reportAuditPreview=structuredClone(p);
  localStorage.setItem('excabase_active_project',JSON.stringify(p));localStorage.setItem('excabase_projects',JSON.stringify([p]));
  const before=JSON.stringify({...localStorage}),session=JSON.stringify({...sessionStorage});
  document.getElementById('refreshReportBtn').click();await wait(100);
  const text=document.querySelector('.report-conclusion-body').textContent;
  assert(!/undefined|NaN|null/.test(text),c.name+' valid text');
  assert(document.querySelectorAll('#reportAnalysis p').length>=2,c.name+' analysis paragraphs');
  assert(document.querySelectorAll('#reportConclusion p').length===2,c.name+' conclusion paragraphs');
  assert(!document.body.textContent.includes('Detail Analisis Teknik'),c.name+' no duplicate section');
  const rows=[...document.querySelectorAll('#reportResultsTable tr:not(.report-equipment-total)')];
  assert(rows.length===c.equipment.length,c.name+' all equipment');
  rows.forEach((r,i)=>{const cell=r.cells[3].textContent;assert(!cell.includes('×')&&!cell.includes('='),'final productivity only');assert(cell.includes(c.equipment[i].workVolumeBasis.toUpperCase()),'volume basis retained');assert(cell.startsWith(c.equipment[i].totalHourlyProductivity.toLocaleString('id-ID',{maximumFractionDigits:2})),'saved productivity retained');});
  rows.forEach((r,i)=>{const e=c.equipment[i];assert(r.cells[2].textContent===e.units+' unit','unit value unchanged');assert(e.durationDays===null?r.cells[4].textContent==='— hari':r.cells[4].textContent===e.durationDays+' hari','saved duration unchanged');assert(e.totalOperatingCost===null?r.cells[5].textContent==='—':r.cells[5].textContent==='Rp'+e.totalOperatingCost.toLocaleString('id-ID'),'saved cost unchanged');});
  assert(c.equipment.some(e=>e.durationDays===null)?text.includes('Durasi Estimasi belum lengkap'):text.includes('paralel')&&text.includes('ketergantungan'),'duration caveat');
  if(c.fleet)assert(text.includes('biaya terendah terdapat pada Hemat')&&text.includes('durasi terpendek pada Cepat'),'scenario ranks');
  if(c.partial)assert(text.includes('belum lengkap'),'partial limit');
  if(!c.fleet&&!c.partial)assert(text.includes('perbandingan skenario belum dapat dilakukan'),'estimate only');
  assert(before===JSON.stringify({...localStorage}),'all localStorage unchanged');assert(session===JSON.stringify({...sessionStorage}),'sessionStorage unchanged');
  examples.push({case:c.name,analysis:[...document.querySelectorAll('#reportAnalysis p')].map(p=>p.textContent),conclusion:document.getElementById('reportConclusion').textContent});
 }
 const print=window.print;let printed=false;window.print=()=>{printed=true;};document.getElementById('printReportBtn').click();window.print=print;assert(printed,'PDF button invokes browser print');
 return {passed:true,assertions,examples};
};
