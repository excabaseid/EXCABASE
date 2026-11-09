const runBrowserTest = require('./test-browser-sync.cjs');
async function test() {
    const output = document.getElementById('output'), frame = document.querySelector('iframe');
    frame.style.width = '1280px'; frame.style.height = '900px';
    const checks = [], key = 'excabase_standalone_estimate';
    const assert = (condition, message) => {if (!condition) throw Error(message); checks.push(message);output.textContent='RUNNING '+checks.length+' '+message;};
    const near = (actual, expected, label) => assert(Math.abs(actual-expected)<1e-8*Math.max(1,Math.abs(expected)),label);
    const open = url => new Promise(resolve => {frame.onload=()=>resolve(frame.contentDocument); frame.src=url;});
    const refresh = () => new Promise(resolve => {frame.onload=()=>resolve(frame.contentDocument); frame.contentWindow.location.reload();});
    const state = () => JSON.parse(localStorage.getItem(key));
    let d;
    const set = (selector, value, event = 'input') => {const element=d.querySelector(selector); element.value=value; element.dispatchEvent(new frame.contentWindow.Event(event,{bubbles:true}));};
    const select = (type, checked=true) => {const e=d.querySelector(`[data-equipment="${type}"]`); e.checked=checked;e.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));};
    const field = (type,name,value) => set(`[data-type="${type}"][data-field="${name}"]`,value);
    const calculate = () => d.querySelector('button[type="submit"]').click();
    const untouched = {
        excabase_active_project: JSON.stringify({id:99,status:'selesai',results:{productivity:{excavator:{hourly:999}}}}),
        excabase_projects: JSON.stringify([{id:99,status:'selesai'}]),
        excabase_combination_productivity_results: JSON.stringify({excavator:{hourly:500}}),
        excabase_standalone_productivity_results: JSON.stringify({excavator:{hourly:25,volumeBasis:'lcm'}})
    };
    try {
        for(const [k,v] of Object.entries(untouched)) localStorage.setItem(k,v);
        d=await open('/pages/estimasi-proyek.html');
        assert(d.title.includes('Estimasi Waktu & Biaya Alat Berat'),'standalone title');
        assert(!d.getElementById('projectName'),'no project form');
        assert(![...d.scripts].some(s=>/\/(main|project-storage|project-lock|project-navigation)\.js/.test(s.src)),'no project scripts loaded');
        assert(!d.querySelector('.main-content a'),'no back link');
        assert(d.querySelector('.sidebar .menu').textContent.includes('PERHITUNGAN MANDIRI'),'sidebar preserved');
        assert(!d.querySelector('[data-card]:not([hidden])'),'no unselected forms visible');
        calculate(); assert(d.getElementById('estimateStatus').textContent.includes('Pilih minimal'),'selection required');
        select('excavator');
        field('excavator','volume',1000); field('excavator','productivity',10);field('excavator','rate',100000);field('excavator','target',2);
        field('excavator','model','<img src=x onerror=alert(1)>');
        calculate();
        let result=state().calculated.equipment[0];
        near(result.theoreticalUnits,6.25,'theoretical 6.25'); assert(result.units===7,'ceil to 7 units');
        near(result.durationHours,1000/70,'duration hours');near(result.durationDays,1000/560,'duration days');near(result.totalCost,10000000,'productive-hour cost');
        assert(d.querySelectorAll('[data-result-type]').length===1,'single equipment result');
        assert(!d.getElementById('estimateResults').querySelector('img'),'model escaped');
        assert(d.getElementById('estimateResults').textContent.includes('mobilisasi'),'cost assumptions');
        assert(d.getElementById('estimateResults').textContent.includes('tidak otomatis'),'schedule assumption');
        const confirmed=JSON.stringify(state().calculated);
        field('excavator','volume',2000);
        assert(!d.querySelector('[data-result-type]'),'changed input hides latest result');
        d=await refresh();
        assert(d.querySelector('[data-field="volume"]').value==='2000','draft restored');
        assert(d.getElementById('estimateStatus').textContent.includes('belum dihitung'),'draft stale warning restored');
        assert(JSON.stringify(state().calculated)===confirmed,'confirmed result retained');
        field('excavator','volume',1000); calculate();
        d=await refresh();assert(d.querySelectorAll('[data-result-type]').length===1,'confirmed result restored');
        set('#estimateMode','units','change');field('excavator','units',2);calculate();
        result=state().calculated.equipment[0];
        assert(result.units===2 && result.theoreticalUnits===null,'unit mode independent of target');
        near(result.durationHours,50,'unit mode hours');near(result.durationDays,6.25,'unit mode days');near(result.totalCost,10000000,'unit mode cost');
        const types=['excavator','dumptruck','wheelloader','motorgrader','bulldozer','compactor'];
        for(const [i,type] of types.entries()) {
            select(type);field(type,'volume',1000);field(type,'productivity',10);field(type,'rate',100000);field(type,'units',2);field(type,'target',2);field(type,'basis',['bcm','lcm','ccm'][i%3]);
        }
        calculate();
        assert(state().calculated.equipment.length===6,'six equipment unit mode');
        assert(state().calculated.totalUnits===12,'total fleet 12');near(state().calculated.totalCost,60000000,'total cost six tools');
        assert(!('totalProductivity' in state().calculated),'no sum across bases');
        assert(['BCM','LCM','CCM'].every(b=>d.getElementById('estimateResults').textContent.includes('('+b+')')),'all bases displayed');
        set('#estimateMode','target','change');calculate();
        assert(state().calculated.equipment.every(e=>e.units===7),'six equipment target mode');assert(state().calculated.totalUnits===42,'target fleet total');
        for(const value of ['',0,-1,'not-a-number']) {
            field('excavator','volume',value);calculate();
            assert(!d.querySelector('[data-result-type]') && d.getElementById('estimateStatus').textContent.includes('valid'),'reject volume '+String(value));
        }
        field('excavator','volume',1000);
        for(const name of ['productivity','rate','target']) {
            const old=d.querySelector(`[data-type="excavator"][data-field="${name}"]`).value;
            for(const value of ['',-1]) {field('excavator',name,value);calculate();assert(d.getElementById('estimateStatus').textContent.includes('valid'),'reject '+name+' '+value);}
            field('excavator',name,old);
        }
        field('excavator','productivity',0);calculate();assert(d.getElementById('estimateStatus').textContent.includes('valid'),'reject zero productivity');field('excavator','productivity',10);
        field('excavator','target',0);calculate();assert(d.getElementById('estimateStatus').textContent.includes('valid'),'reject zero target');field('excavator','target',2);
        field('excavator','rate',0);calculate();assert(state().calculated.equipment[0].totalCost===0,'zero rate allowed');
        set('#estimateHours',25);calculate();assert(d.getElementById('estimateStatus').textContent.includes('maksimal 24'),'hours upper bound');set('#estimateHours',0);calculate();assert(d.getElementById('estimateStatus').textContent.includes('maksimal 24'),'zero hours rejected');set('#estimateHours',8);
        set('#estimateMode','units','change');field('excavator','units',1.5);calculate();assert(d.getElementById('estimateStatus').textContent.includes('bilangan bulat'),'fractional units rejected');field('excavator','units',2);
        field('excavator','basis','bcm');
        let confirmations=0;frame.contentWindow.confirm=()=>{confirmations++;return true;};
        d.querySelector('[data-import="excavator"]').click();
        assert(confirmations===0 && state().inputs.equipment.excavator.productivity==='10','import mismatched basis refused');
        field('excavator','basis','lcm');
        frame.contentWindow.confirm=()=>{confirmations++;return false;};
        d.querySelector('[data-import="excavator"]').click();assert(state().inputs.equipment.excavator.productivity==='10','cancel import preserves input');
        frame.contentWindow.confirm=()=>{confirmations++;return true;};
        d.querySelector('[data-import="excavator"]').click();
        assert(state().inputs.equipment.excavator.productivity==='25' && confirmations===2,'explicit confirmed import');
        assert(state().inputs.equipment.excavator.model.includes('<img'),'import retains optional model');
        d.querySelector('[data-import="dumptruck"]').click();assert(d.querySelector('[data-import-status="dumptruck"]').textContent.includes('belum tersedia'),'missing import handled');
        calculate();
        assert(state().calculated.equipment[0].productivity===25,'import included after calculation');
        select('compactor',false);assert(d.querySelector('[data-card="compactor"]').hidden,'deselected form hidden');assert(state().inputs.equipment.compactor.volume==='1000','deselected inputs retained');
        select('compactor');calculate();
        frame.style.width='390px';
        await new Promise(resolve=>setTimeout(resolve,150));
        assert(d.documentElement.scrollWidth<=d.documentElement.clientWidth,'390px no horizontal overflow');
        assert(frame.contentWindow.getComputedStyle(d.querySelector('.estimate-grid')).gridTemplateColumns.split(' ').length===1,'mobile one column');
        frame.style.width='1280px';
        await new Promise(resolve=>setTimeout(resolve,150));
        assert(d.documentElement.scrollWidth<=d.documentElement.clientWidth,'1280px no horizontal overflow');
        assert(frame.contentWindow.getComputedStyle(d.querySelector('.estimate-grid')).gridTemplateColumns.split(' ').length===2,'laptop two columns');
        const beforeReset=localStorage.getItem(key);
        frame.contentWindow.confirm=()=>false;d.getElementById('resetStandaloneEstimate').click();assert(localStorage.getItem(key)===beforeReset,'cancel reset preserves estimate');
        frame.contentWindow.confirm=()=>true;
        d=await new Promise(resolve=>{frame.onload=()=>resolve(frame.contentDocument);d.getElementById('resetStandaloneEstimate').click();});
        assert(localStorage.getItem(key)===null,'reset removes only standalone estimate');
        assert(!d.querySelector('[data-equipment]:checked') && !d.querySelector('[data-result-type]'),'reset empty state');
        for(const [k,v] of Object.entries(untouched)) assert(localStorage.getItem(k)===v,'untouched '+k);
        output.textContent='PASS '+checks.length+' standalone browser checks\n'+checks.join('\n');
    } catch(error) {output.textContent='FAIL '+error.stack+'\nPassed: '+checks.join('\n');}
}
runBrowserTest(test);
