const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {execFile} = require('child_process');
const root = process.cwd();
async function test() {
    const output = document.getElementById('output');
    const frame = document.querySelector('iframe');
    const checks = [];
    const assert = (condition, label) => {if (!condition) throw Error(label); checks.push(label);};
    const read = () => JSON.parse(localStorage.getItem('excabase_active_project'));
    const save = p => {localStorage.setItem('excabase_active_project', JSON.stringify(p)); localStorage.setItem('excabase_projects', JSON.stringify([p]));};
    const open = url => new Promise(resolve => {frame.onload=()=>{frame.contentWindow.alert=()=>{}; resolve(frame.contentDocument);}; frame.src=url;});
    const fill = section => {
        for (const input of section.querySelectorAll('[data-field]')) {
            if (!(Number(input.value)>0)) {
                const field=input.dataset.field;
                input.value=/efficiency/i.test(field)?0.8:/fillfactor/i.test(field)?0.9:/cycle/i.test(field)?60:/hours/i.test(field)?8:/passes/i.test(field)?4:/thickness/i.test(field)?0.2:3;
            }
        }
    };
    try {
        const types=['excavator','dumptruck','wheelloader','motorgrader','bulldozer','compactor'];
        save({id:'browser-test',name:'Uji sinkronisasi', status:'aktif', workType:'Galian', soilVolumeBCM:10000, workHoursPerDay:8, targetDays:5, results:{selectedEquipment:['Excavator','Dump Truck','Wheel Loader','Motor Grader','Bulldozer','Compactor'], recommendation:{equipment:'Excavator, Dump Truck, Wheel Loader, Motor Grader, Bulldozer, Compactor'},earthwork:{bcm:10000,lcm:12768,ccm:9000}}});
        let d=await open('/pages/kalkulator-volume-tanah.html?fromProject=1');
        d.getElementById('earthworkBCM').value=10000;
        d.getElementById('earthworkMaterial').value='tanah-biasa';
        d.getElementById('earthworkSwell').value=27.68;
        d.getElementById('earthworkShrinkage').value=10;
        d.getElementById('earthworkParameterSource').value='asumsi-estimasi';
        d.getElementById('calculateEarthworkBtn').click();
        assert(Math.abs(read().results.earthwork.lcm-12768)<1e-8,'earthwork calculation saved');
        d=await open('/pages/rekomendasi.html?fromProject=1');
        d.getElementById('recommendationWork').value='Pematangan Lahan';
        d.getElementById('recommendationMaterial').value='Tanah biasa';
        d.getElementById('recommendEquipmentBtn').click();
        assert(Boolean(read().results.recommendation.equipment),'recommendation saved');
        for(const checkbox of d.querySelectorAll('.equipment-choice')) checkbox.checked=true;
        d.getElementById('saveSelectedEquipmentBtn').click();
        assert(read().results.selectedEquipment.length===6,'six equipment selection saved');
        d=await open('/pages/produktivitas.html?fromProject=1');
        assert(d.querySelectorAll('[data-calculator]').length===6,'six project calculators');
        for (const type of types) {
            const section=d.querySelector(`[data-calculator="${type}"]`);
            fill(section);
            const input=section.querySelector('input[data-field]');
            input.value=Number(input.value)*1.1;
            if (type==='dumptruck') {
                section.querySelector('[data-field="truckEfficiency"]').value=0.8;
                section.querySelector('[data-field="truckCycleTime"]').value=Number(section.querySelector('[data-field="truckCapacity"]').value)*60*0.8/8.4;
            }
            input.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));
            section.querySelector('[data-action="calculate"]').click();
            assert(read().results.productivity?.[type]?.hourly>0, type+' calculation saved: '+section.querySelector('[data-result="status"]').textContent);
            assert(section.querySelector('[data-result="hourly"]').textContent.includes(type==='compactor'?'(CCM)':'(LCM)'),type+' basis');
        }
        d=await open('/pages/estimasi-proyek.html?fromProject=1');
        assert(d.querySelector('#estimate-units-dumptruck').value==='38','theoretical 38 from 8.4 and target');
        for (const type of types) {
            d.querySelector(`[data-estimate-units="${type}"]`).value=type==='dumptruck'?349:3;
            d.querySelector(`[data-estimate-cost="${type}"]`).value=200000;
        }
        d.getElementById('calculateProjectBtn').click();
        assert(read().results.estimate?.equipment?.length===6,'estimate saved');
        assert(read().results.estimate.equipment.every(e=>e.hourlyProductivity===read().results.productivity[e.type].hourly),'estimate latest productivity');
        d=await open('/pages/simulasi-armada.html?fromProject=1');
        d.getElementById('calculateFleetScenarioBtn').click();
        d.getElementById('saveFleetScenarioBtn').click();
        let p=read();
        assert(Math.abs(p.results.productivity.dumptruck.hourly-8.4)<1e-9,'fixture Dump Truck 8.40');
        assert(p.results.fleet.scenarios.dasar.equipment.every(e=>e.units===p.results.estimate.equipment.find(x=>x.type===e.type).units),'base units latest');
        assert(p.results.fleet.scenarios.dasar.equipment.every(e=>Math.abs(e.productivityPerUnit-p.results.productivity[e.type].hourly)<1e-9),'simulation latest productivity');
        assert(p.results.fleet.scenarios.dasar.equipment.every(e=>Math.abs(e.totalCost-p.results.estimate.equipment.find(x=>x.type===e.type).totalOperatingCost)<1e-6),'costs match');
        d=await new Promise(resolve=>{frame.onload=()=>resolve(frame.contentDocument);frame.contentWindow.location.reload();});
        assert(d.getElementById('fleetSaveStatus').textContent.includes('berhasil dimuat'),'refresh restores');
        d=await open('/pages/analisis-laporan.html?fromProject=1');
        assert(d.getElementById('reportResultsTable').textContent.includes('349'),'report current units');
        assert(d.getElementById('reportResultsTable').textContent.includes('m³/jam (LCM)'),'report basis format');
        assert(d.getElementById('reportResultsTable').textContent.includes('2.931,6'),'report total 349 times 8.4 = 2931.6');
        console.log('Dump Truck confirmed: 8.4 m3/hour (LCM), 349 chosen units, 38 theoretical, total 2931.6.');
        p=read(); p.results.productivity.dumptruck.hourly*=5; save(p);
        d.getElementById('refreshReportBtn').click();
        assert(d.getElementById('reportSubtitle').textContent.includes('Produktivitas berubah'),'report rejects stale estimate');
        d=await open('/pages/simulasi-armada.html?fromProject=1');
        assert(d.getElementById('calculateFleetScenarioBtn').disabled,'simulation rejects stale estimate');
        d=await open('/pages/estimasi-proyek.html?fromProject=1');
        assert(d.querySelector('[data-estimate-units="dumptruck"]').value==='349','retain chosen units');
        d.querySelector('[data-estimate-units="dumptruck"]').value=17;
        d.getElementById('calculateProjectBtn').click();
        d=await open('/pages/analisis-laporan.html?fromProject=1');
        assert(d.getElementById('reportSubtitle').textContent.includes('Estimasi berubah'),'report rejects stale fleet');
        d=await open('/pages/simulasi-armada.html?fromProject=1');
        assert(d.getElementById('fleet-dasar-dumptruck').value==='17','changed base units');
        for (const key of ['hemat','cepat']) assert(Number(d.getElementById('fleet-'+key+'-dumptruck').value)>0,key+' retained');
        d.getElementById('calculateFleetScenarioBtn').click(); d.getElementById('saveFleetScenarioBtn').click();
        d=await open('/pages/analisis-laporan.html?fromProject=1');
        assert(!d.getElementById('reportSubtitle').textContent.includes('berubah'),'report synchronized');
        for (const scenario of ['hemat','cepat']) {
            d=await open('/pages/simulasi-armada.html?fromProject=1');
            d.getElementById('fleetSelectedScenario').value=scenario;
            d.getElementById('saveFleetScenarioBtn').click();
            d=await open('/pages/analisis-laporan.html?fromProject=1');
            const name=scenario==='hemat'?'Hemat':'Cepat';
            assert(d.getElementById('reportSelectedScenario').textContent.includes(name),'report chosen '+scenario);
            assert(d.getElementById('reportResultsTable').closest('.report-section').querySelector('h2').textContent.includes('Estimasi'),'report labels estimate separately from '+scenario);
        }
        const before=JSON.stringify(read());
        for (const type of types) {
            d=await open('/pages/produktivitas-'+type+'.html');
            fill(d.querySelector('[data-calculator]'));
            d.querySelector('[data-action="calculate"]').click();
            assert(JSON.stringify(read())===before,type+' standalone isolation');
        }
        d=await open('/pages/produktivitas-kombinasi.html');
        for (const checkbox of d.querySelectorAll('[name="equipment"]')) checkbox.checked=true;
        d.getElementById('applyCombination').click();
        for (const section of d.querySelectorAll('[data-calculator]')) fill(section);
        for (const button of d.querySelectorAll('[data-action="calculate"]')) button.click();
        assert(JSON.stringify(read())===before,'combination isolation');
        assert(Object.keys(JSON.parse(localStorage.getItem('excabase_combination_productivity_results'))).length===6,'combination six calculations');
        p=read(); p.status='selesai'; save(p);
        const finished=JSON.stringify(read());
        for (const page of ['produktivitas','estimasi-proyek','simulasi-armada']) {
            d=await open('/pages/'+page+'.html?fromProject=1');
            assert([...d.querySelectorAll('input,select,button')].every(e=>e.disabled),page+' completed lock');
            assert(JSON.stringify(read())===finished,page+' completed unchanged');
        }
        output.textContent='PASS '+checks.length+' browser checks\n'+checks.join('\n');
    } catch(e) {output.textContent='FAIL '+e.stack+'\nPassed: '+checks.join('\n');}
}
function runBrowserTest(test) {
const server=http.createServer((req,res)=>{
    if(req.url==='/test') {
        const theme = ['light', 'dark'].includes(process.env.EXCABASE_TEST_THEME) ? process.env.EXCABASE_TEST_THEME : null;
        const setup = theme ? 'localStorage.setItem("excabaseTheme", '+JSON.stringify(theme)+');' : '';
        res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<pre id="output">RUNNING</pre><iframe></iframe><script>'+setup+'('+test.toString()+')()</script>');return;
    }
    const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return;} res.setHeader('Content-Type', file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});
});
server.listen(0,'127.0.0.1',()=>{
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),'excabase-browser-test-'));
    execFile('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'--virtual-time-budget=25000','--dump-dom','http://127.0.0.1:'+server.address().port+'/test'],{timeout:60000,maxBuffer:2000000},(err,stdout,stderr)=>{
        const result=stdout?.match(/<pre id="output">([\s\S]*?)<\/pre>/)?.[1];
        console.log(result || String(err || stderr));
        server.close(); process.exitCode=result?.startsWith('PASS')?0:1;
    });
});
}
module.exports = runBrowserTest;
if (require.main === module) runBrowserTest(test);
