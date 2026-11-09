// Full existing workflow plus visual/DOM and PDF checks in an isolated browser.
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'earthwork-project.cjs'),'utf8');
const volumeChecks=async function () {
    await delay(20);
    assert.equal(await evaluate('document.querySelectorAll("#earthworkCalculationDetails .results-kpi").length'),3);
    assert.deepEqual(await evaluate('[...document.querySelectorAll("#earthworkCalculationDetails strong")].slice(0,3).map(el=>parseFloat(el.textContent))'),[1000,1250,900]);
    assert.ok(await evaluate('document.querySelector("#earthworkCalculationDetails .results-formulas").textContent.includes("/ 100")'));
};
const finalChecks=async function () {
    const stableStorage=await evaluate('JSON.stringify({...localStorage})');
    // The existing report actions retain keyboard focus, press feedback and reduced-motion support.
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await evaluate('document.getElementById("refreshReportBtn").focus()');
    assert.notEqual(await evaluate('getComputedStyle(document.getElementById("refreshReportBtn")).outlineStyle'),'none');
    assert.equal(await evaluate('getComputedStyle(document.getElementById("refreshReportBtn")).transitionDuration.split(",")[0]'),'0.18s');
    const actionPoint=await evaluate('(()=>{const r=document.getElementById("refreshReportBtn").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...actionPoint});await delay(220);
    assert.ok(await evaluate('Math.abs(new DOMMatrix(getComputedStyle(document.getElementById("refreshReportBtn")).transform).m42+2)<.1'),'report button hover lift');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...actionPoint});await delay(220);
    assert.ok(await evaluate('Math.abs(new DOMMatrix(getComputedStyle(document.getElementById("refreshReportBtn")).transform).m11-.97)<.01'),'report button press feedback');
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...actionPoint});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate('getComputedStyle(document.getElementById("refreshReportBtn")).transitionDuration'),'0s');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    const capture=async(name)=>{
        const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
        fs.writeFileSync(require('node:path').join(require('node:os').tmpdir(),'excabase-results-'+name+'.png'),Buffer.from(shot.data,'base64'));
    };
    // Actual print button still calls the browser print function.
    await evaluate('window.__printed=0;window.print=()=>window.__printed++;document.getElementById("printReportBtn").click()');
    assert.equal(await evaluate('window.__printed'),1);
    await send('Emulation.setEmulatedMedia',{media:'print'});
    for(const selector of ['.sidebar','.report-actions','.profile','.project-step-navigation']) {
        assert.ok(await evaluate(`!document.querySelector(${JSON.stringify(selector)}) || getComputedStyle(document.querySelector(${JSON.stringify(selector)})).display==='none'`),'print shows '+selector);
    }
    const pdf=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
    const bytes=Buffer.from(pdf.data,'base64');assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.ok(bytes.length>10000);
    fs.writeFileSync(require('node:path').join(require('node:os').tmpdir(),'excabase-results-report.pdf'),bytes);
    await send('Emulation.setEmulatedMedia',{media:''});
    for(const theme of ['light','dark']) {
        await evaluate(`document.documentElement.classList.toggle('excabase-dark',${theme==='dark'});document.body.classList.toggle('excabase-dark',${theme==='dark'})`);
        for(const width of [1440,768,390,320]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'report overflow '+theme+'/'+width);
            assert.ok(await evaluate('document.getElementById("summaryVolume").textContent.includes("1.000")'));
            if(width===1440||width===390)await capture('report-'+theme+'-'+width);
        }
    }
    assert.equal(await evaluate('JSON.stringify({...localStorage})'),stableStorage,'presentation/printing changed storage');
    // Volume restoration uses the same three KPI cards, without recomputing saved results.
    await open(volume);
    assert.equal(await evaluate('document.querySelectorAll("#earthworkCalculationDetails .results-kpi").length'),3);
    assert.deepEqual(await evaluate('[...document.querySelectorAll("#earthworkCalculationDetails strong")].slice(0,3).map(el=>parseFloat(el.textContent))'),[1000,1250,900]);
    await set('earthworkBCM','2000');
    await evaluate('document.getElementById("calculateEarthworkBtn").click()');await delay(20);
    assert.deepEqual(await evaluate('[...document.querySelectorAll("#earthworkCalculationDetails strong")].slice(0,3).map(el=>parseFloat(el.textContent))'),[2000,2500,1800]);
    for(const theme of ['light','dark']) {
        await evaluate(`document.documentElement.classList.toggle('excabase-dark',${theme==='dark'});document.body.classList.toggle('excabase-dark',${theme==='dark'})`);
        for(const width of [1440,1280,1100,1024,768,390,320]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'volume overflow '+theme+'/'+width);
            assert.deepEqual(await evaluate('[...document.querySelectorAll(".results-kpi-grid--volume > article")].map(el=>getComputedStyle(el).borderTopColor)'),['rgb(244, 180, 0)','rgb(18, 52, 77)','rgb(244, 180, 0)']);
            assert.equal(await evaluate('getComputedStyle(document.querySelector(".earthwork-result-panel .calculator-result")).backgroundColor'),theme==='light'?'rgb(255, 249, 232)':'rgb(60, 57, 37)');
            assert.ok(await evaluate('(()=>{return [...document.querySelectorAll(".results-kpi-value .results-number")].every(el=>{const r=document.createRange();r.selectNodeContents(el);const text=r.getBoundingClientRect(),box=el.getBoundingClientRect();return r.getClientRects().length===1 && text.width<=box.width+.5 && getComputedStyle(el).whiteSpace==="nowrap"})})()'),'volume number wraps/clips '+theme+'/'+width);
            if(width===1440||width===390)await capture('volume-'+theme+'-'+width);
        }
    }
    // Every actual work recommendation, including the alternative loader/excavator option.
    await open('rekomendasi.html');
    const recommendationsToCheck={'Pematangan Lahan':3,'Galian dan Timbunan':4,'Pengangkutan Material':1,'Perataan Tanah':1,'Pemadatan Tanah':1,'Pemuatan Material':2,'Pekerjaan Jalan':2};
    for(const [work,count] of Object.entries(recommendationsToCheck)) {
        await evaluate(`document.getElementById('recommendationWork').value=${JSON.stringify(work)};document.getElementById('recommendationMaterial').value='Tanah lempung';document.getElementById('recommendEquipmentBtn').click()`);
        await delay(10);
        assert.equal(await evaluate('document.querySelectorAll("#recommendationResult .results-equipment-card").length'),count,work);
        assert.ok(await evaluate('document.getElementById("recommendationResult").textContent.includes("Catatan:")'));
        assert.ok(await evaluate('document.getElementById("recommendationResult").textContent.includes("Material:")'));
    }
    for(const theme of ['light','dark']) {
        await evaluate(`document.documentElement.classList.toggle('excabase-dark',${theme==='dark'});document.body.classList.toggle('excabase-dark',${theme==='dark'})`);
        for(const width of [1440,768,390,320]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'recommendation overflow '+theme+'/'+width);
            if(width===1440||width===390)await capture('recommendation-'+theme+'-'+width);
        }
    }
    // Shared productivity UI: values and units remain exactly as rendered by the calculator.
    await open('produktivitas-compactor.html');
    await evaluate(`(()=>{const s=document.querySelector('[data-calculator]');const m=s.querySelector('[data-model]');m.value='custom';m.dispatchEvent(new Event('change',{bubbles:true}));for(const [key,value] of Object.entries({compactorWidth:2,compactorSpeed:4,compactorEfficiency:.75,compactorPasses:4,compactorThickness:.2,compactorWorkingHours:8})){const el=s.querySelector('[data-field="'+key+'"]');el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}s.querySelector('[data-action=calculate]').click()})()`);
    await delay(20);
    assert.equal(await evaluate('document.querySelectorAll(".calculator-result .results-unit").length'),2);
    assert.ok(await evaluate('document.querySelector("[data-result=hourly]").textContent.includes("300")'));
    assert.ok(await evaluate('document.querySelector("[data-result=daily]").textContent.includes("2.400")'));
    for(const theme of ['light','dark']) {
        await evaluate(`document.documentElement.classList.toggle('excabase-dark',${theme==='dark'});document.body.classList.toggle('excabase-dark',${theme==='dark'})`);
        for(const width of [1440,768,390,320]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'productivity overflow '+theme+'/'+width);
            if(width===1440||width===390)await capture('productivity-'+theme+'-'+width);
        }
    }
    await open('simulasi-armada.html?fromProject=1');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'fleet page overflow');
    assert.equal(await evaluate('document.querySelectorAll(".fleet-scenario-card").length'),3);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".fleet-table-wrapper")).overflowX'),'auto');
    await capture('fleet-mobile');
    // Restore original workflow fixture before exercising its completed-project lock.
    await evaluate(`localStorage.clear();Object.entries(JSON.parse(${JSON.stringify(stableStorage)})).forEach(([key,value])=>localStorage.setItem(key,value))`);
    await send('Emulation.clearDeviceMetricsOverride');
    await open('analisis-laporan.html?fromProject=1');
    console.log('PASS new UI: volume KPI/restoration; seven dynamic recommendations; productivity values/units; print button and actual PDF; light/dark 320-1440px; responsive fleet table; presentation does not write storage');
};
const body=finalChecks.toString(),volumeBody=volumeChecks.toString();
const anchor='    await evaluate(\'window.confirm=()=>true;window.alert=()=>{};document.getElementById("completeProjectBtn").click()\');';
let expanded=source.replace(anchor,body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+'\n'+anchor);
expanded=expanded.replace("    await next('rekomendasi.html');",volumeBody.slice(volumeBody.indexOf('{')+1,volumeBody.lastIndexOf('}'))+"\n    await next('rekomendasi.html');");
eval(expanded);
