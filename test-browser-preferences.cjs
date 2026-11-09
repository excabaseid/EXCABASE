const run = require('./test-browser-sync.cjs');
run(async function () {
 const out=document.getElementById('output'), frame=document.querySelector('iframe'), checks=[], contrastProblems=[];
 frame.style.width='1440px';frame.style.height='1000px';
 const ok=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};
 const open=url=>new Promise(resolve=>{frame.onload=()=>resolve(frame.contentDocument);frame.src=url;});
 const refresh=()=>new Promise(resolve=>{frame.onload=()=>resolve(frame.contentDocument);frame.contentWindow.location.reload();});
 const rgb=value=>{const nums=value.match(/[\d.]+/g);return nums?nums.map(Number):[0,0,0,0];};
 const luminance=color=>color.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 function inspect(d,page) {
  const win=frame.contentWindow;
  for(const element of d.body.querySelectorAll('*')) {
   if(![...element.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()) || ['SCRIPT','STYLE','OPTION'].includes(element.tagName))continue;
   if(!element.getClientRects().length || element.closest('.dashboard-hero, .report-column-bar'))continue;
   const style=win.getComputedStyle(element);if(style.visibility==='hidden')continue;
   let parent=element,bg;
   while(parent){const c=rgb(win.getComputedStyle(parent).backgroundColor);if(c.length===3||c[3]>=.95){bg=c;break;}parent=parent.parentElement;}
   if(!bg)continue;
   const fg=rgb(style.color), l1=luminance(fg),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
   if(ratio<4.45)contrastProblems.push(page+' '+element.tagName+'.'+element.className+' parent '+element.parentElement.className+' / '+element.parentElement.parentElement?.className+' '+element.textContent.trim().slice(0,35)+' ratio '+ratio.toFixed(2));
  }
 }
 try {
  const types=['excavator','dumptruck','wheelloader','motorgrader','bulldozer','compactor'];
  const equipment=types.map(type=>({type,units:3,hourlyProductivity:100,volumeBasis:type==='compactor'?'ccm':'lcm',workVolumeBasis:type==='compactor'?'ccm':'lcm',workVolume:10000,costPerHour:200000,totalHourlyProductivity:300,totalHourlyCost:600000,dailyProductivity:2400,dailyCost:4800000,durationHours:100/3,durationDays:100/24,totalOperatingCost:20000000}));
  const project={id:'preference-test',status:'aktif',name:'Proyek Uji',workType:'Pematangan Lahan',soilVolumeBCM:10000,targetDays:10,workHoursPerDay:8,results:{earthwork:{bcm:10000,lcm:12000,ccm:9000},selectedEquipment:types,recommendation:{equipment:types.join(',')},productivity:Object.fromEntries(equipment.map(e=>[e.type,{hourly:100,volumeBasis:e.volumeBasis,model:'Model Uji'}])),estimate:{equipment}}};
  const signature=JSON.stringify({targetDays:10,workingHours:8,equipment:equipment.map(e=>({type:e.type,units:e.units,productivity:300,volume:10000,basis:e.workVolumeBasis,cost:200000}))});
  const result={totalUnits:18,totalCost:120000000,longestEquipmentDuration:100/24,equipment:equipment.map(e=>({...e,productivityPerUnit:100,totalProductivity:300,totalCost:e.totalOperatingCost}))};
  project.results.fleet={selectedScenario:'dasar',estimateSignature:signature,configurations:Object.fromEntries(['dasar','hemat','cepat'].map(k=>[k,Object.fromEntries(types.map(t=>[t,3]))])),scenarios:{dasar:result,hemat:result,cepat:result}};
  localStorage.setItem('excabase_active_project',JSON.stringify(project));localStorage.setItem('excabase_projects',JSON.stringify([project]));
  localStorage.setItem('excabaseAdminName','Operator Uji');
  const input={hours:'8',mode:'units',selected:types,equipment:Object.fromEntries(types.map(type=>[type,{model:'Model Uji',volume:'10000',basis:type==='compactor'?'ccm':'lcm',productivity:'100',rate:'200000',target:'10',units:'3'}]))};
  localStorage.setItem('excabase_standalone_estimate',JSON.stringify({inputs:input,calculated:{inputs:input,equipment:equipment.map(e=>({type:e.type,model:'Model Uji',basis:e.volumeBasis,volume:10000,productivity:100,dailyProductivity:800,theoreticalUnits:null,units:3,durationHours:100/3,durationDays:100/24,totalCost:20000000})),totalUnits:18,totalCost:120000000,calculatedAt:new Date().toISOString()}}));
  const pages=['/index.html',...['buat-proyek','proyek-aktif','kalkulator-volume-tanah','produktivitas','produktivitas-kombinasi','estimasi-proyek','katalog','pengaturan','rekomendasi','perbandingan-alat',...types.map(t=>'produktivitas-'+t),...types.map(t=>'detail-'+t)].map(p=>'/pages/'+p+'.html'),...['kalkulator-volume-tanah','rekomendasi','produktivitas','estimasi-proyek','simulasi-armada','analisis-laporan'].map(p=>'/pages/'+p+'.html?fromProject=1')];
  for(const theme of ['dark','light']) {
   localStorage.setItem('excabaseTheme',theme);
   for(const page of pages) {
    localStorage.setItem('excabase_active_project',JSON.stringify(project));
    localStorage.setItem('excabase_projects',JSON.stringify([project]));
    const d=await open(page);
    ok(d.documentElement.classList.contains('excabase-dark')===(theme==='dark'),theme+' applied '+page);
    ok(d.body.classList.contains('excabase-dark')===(theme==='dark'),theme+' body '+page);
    if(page==='/index.html')ok(d.querySelector('.header .profile').textContent==='Operator Uji','dashboard saved name '+theme);
    if(theme==='dark') {
     d.querySelectorAll('details').forEach(detail=>{detail.open=true;});
     inspect(d,page);
    }
   }
  }
  let d=await open('/pages/pengaturan.html');
  d.getElementById('adminName').value='Nama Baru';d.getElementById('saveAdminNameBtn').click();
  ok(localStorage.getItem('excabaseAdminName')==='Nama Baru'&&d.getElementById('settingsProfile').textContent==='Nama Baru','save name existing key');
  d.getElementById('themeSelect').value='dark';d.getElementById('saveThemeBtn').click();ok(d.documentElement.classList.contains('excabase-dark'),'apply dark without reload');
  d=await open('/index.html');ok(d.querySelector('.profile').textContent==='Nama Baru'&&d.documentElement.classList.contains('excabase-dark'),'settings to dashboard name and theme');
  d=await refresh();ok(d.querySelector('.profile').textContent==='Nama Baru'&&d.documentElement.classList.contains('excabase-dark'),'dashboard refresh');
  d=await open('/pages/pengaturan.html');d.getElementById('themeSelect').value='light';d.getElementById('saveThemeBtn').click();ok(!d.documentElement.classList.contains('excabase-dark'),'return to light without reload');
  const protectedKeys=['excabase_projects','excabase_active_project','excabaseAdminName','excabaseTheme','excabase_standalone_estimate','excabase_standalone_productivity_results','excabase_combination_productivity_results'];
  localStorage.setItem('excabase_standalone_productivity_results','{"excavator":{"hourly":100}}');localStorage.setItem('excabase_combination_productivity_results','{"dumptruck":{"hourly":100}}');
  const before=Object.fromEntries(protectedKeys.map(k=>[k,localStorage.getItem(k)]));
  localStorage.setItem('excabaseProjectHistory','[{"id":"dummy-history"}]');let prompts=0;
  frame.contentWindow.confirm=()=>{prompts++;return false;};d.getElementById('clearSettingsHistoryBtn').click();ok(prompts===1&&localStorage.getItem('excabaseProjectHistory')!==null,'cancel delete preserves history');
  frame.contentWindow.confirm=()=>{prompts++;return true;};d.getElementById('clearSettingsHistoryBtn').click();ok(prompts===2&&localStorage.getItem('excabaseProjectHistory')===null,'confirm removes dummy history');
  ok(protectedKeys.every(k=>localStorage.getItem(k)===before[k]),'project standalone data and preferences untouched');
  localStorage.removeItem('excabaseAdminName');d=await open('/index.html');ok(d.querySelector('.profile').textContent==='Administrator','dashboard fallback');
  ok(contrastProblems.length===0,'dark text contrast');
  out.textContent='PASS '+checks.length+' preference browser checks';
 }catch(e){out.textContent='FAIL '+e.stack+'\nChecks passed: '+checks.length+'\n'+[...new Set(contrastProblems)].slice(0,180).join('\n');}
});
