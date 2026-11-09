const fs=require('node:fs');
const harness=fs.readFileSync(require('node:path').join(__dirname,'productivity.cjs'),'utf8');
const test=async function () {
    const testPath=require('node:path'),baselineMode=process.env.EXCABASE_THREE_UI_BASELINE==='1';
    const snapshotFile=testPath.join(require('node:os').tmpdir(),'excabase-project-estimate-ui-before.json');
    const before=!baselineMode?JSON.parse(fs.readFileSync(snapshotFile,'utf8')):{};
    const baseline={};
    const project={id:881,name:'Protected project estimate',soilType:'Tanah lempung',soilVolumeBCM:1000,workType:'Pemadatan Tanah',targetDays:10,workHoursPerDay:8,status:'aktif',results:{earthwork:{bcm:1000,lcm:1250,ccm:900,material:'tanah-lempung',swellFactor:25,shrinkageFactor:10},selectedEquipment:['compactor'],recommendation:{equipment:'Compactor'},productivity:{compactor:{type:'compactor',hourly:300,daily:2400,volumeBasis:'ccm',model:'Existing model'}},keep:'unchanged'}};
    await open('estimasi-proyek.html');
    await evaluate('localStorage.clear();localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(project))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([project]))+')');
    const projectBytes=()=>evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])');
    const originalProject=await projectBytes();
    const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(testPath.join(require('node:os').tmpdir(),'excabase-three-ui-'+name+'.png'),Buffer.from(r.data,'base64'));};
    for(const theme of ['light','dark']) {
        await evaluate('localStorage.setItem("excabaseTheme",'+JSON.stringify(theme)+')');
        for(const width of [320,375,768,1024,1440]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            await open('estimasi-proyek.html?fromProject=1');
            const snapshot=await evaluate(`(()=>{const root=document.querySelector('.main-content');return {html:root.outerHTML,styles:[root,...root.querySelectorAll('*')].map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return [el.tagName,el.id,...['display','padding','margin','fontSize','fontWeight','color','background','border','borderRadius','gridTemplateColumns','gap'].map(k=>s[k]),r.x,r.y,r.width,r.height]}),standaloneCSS:[...document.styleSheets].some(s=>s.href?.includes('standalone-estimate.css'))}})()`);
            const key=theme+'/'+width;
            if(baselineMode)baseline[key]=snapshot;else assert.deepEqual(snapshot,before[key],'Project estimate DOM/styles changed '+key);
        }
    }
    if(baselineMode){fs.writeFileSync(snapshotFile,JSON.stringify(baseline));console.log('BASELINE project estimate DOM and computed styles: 10 cases');return;}
    assert.equal(await projectBytes(),originalProject);
    // Standalone estimate: real selections and calculations in both supported modes.
    await open('estimasi-proyek.html');
    const selected=['excavator','dumptruck','compactor'];
    assert.equal(await evaluate('document.querySelectorAll("[data-card]:not([hidden])").length'),0);
    assert.equal(await evaluate('document.getElementById("estimateEmpty").hidden'),false);
    assert.ok(await evaluate('(()=>{const s=document.querySelector(".estimate-input-section"),h=s.querySelector("h2");return h.getBoundingClientRect().top>s.getBoundingClientRect().top+10})()'),'empty section heading outside card');
    await evaluate(`document.querySelectorAll('[data-equipment]').forEach(el=>{if(${JSON.stringify(selected)}.includes(el.dataset.equipment)){el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))}})`);
    await evaluate(`(()=>{for(const type of ${JSON.stringify(selected)}){for(const [field,value] of Object.entries({volume:'2400',productivity:'100',rate:'200000',target:'2',units:'3'})){const el=document.querySelector('[data-type="'+type+'"][data-field="'+field+'"]');el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}}document.getElementById('standaloneEstimateForm').requestSubmit()})()`);
    let result=await evaluate('JSON.parse(localStorage.getItem("excabase_standalone_estimate")).calculated');
    assert.equal(result.equipment.length,3);assert.equal(result.totalUnits,6);assert.equal(result.totalCost,14400000);
    for(const row of result.equipment){assert.equal(row.units,2);assert.equal(row.durationHours,12);assert.equal(row.durationDays,1.5);}
    await open('estimasi-proyek.html');
    assert.equal(await evaluate('document.querySelectorAll("[data-card]:not([hidden])").length'),3);
    await evaluate('const mode=document.getElementById("estimateMode");mode.value="units";mode.dispatchEvent(new Event("change",{bubbles:true}));document.getElementById("standaloneEstimateForm").requestSubmit()');
    result=await evaluate('JSON.parse(localStorage.getItem("excabase_standalone_estimate")).calculated');
    assert.equal(result.totalUnits,9);assert.equal(result.totalCost,14400000);result.equipment.forEach(row=>assert.equal(row.durationHours,8));
    for(const theme of ['light','dark']) {
        await evaluate('localStorage.setItem("excabaseTheme",'+JSON.stringify(theme)+')');
        for(const width of [320,375,768,1024,1440]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            await open('estimasi-proyek.html');
            assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'standalone estimate overflow '+theme+'/'+width);
            assert.equal(await evaluate('document.querySelectorAll("[data-equipment]").length'),6);
            assert.ok(await evaluate('(()=>{const box=document.querySelector(".estimate-input-section"),h=box.querySelector("h2");const b=box.getBoundingClientRect(),r=h.getBoundingClientRect();return r.top>b.top+10 && r.left>b.left+10 && getComputedStyle(box).borderTopWidth==="1px" && getComputedStyle(h).borderLeftColor==="rgb(244, 180, 0)"})()'),'Input per Alat heading outside its section card');
            assert.ok(await evaluate('(()=>{const p=document.querySelector("fieldset.estimate-panel").getBoundingClientRect(),h=document.querySelector("fieldset.estimate-panel legend").getBoundingClientRect();return h.top>p.top+10 && h.bottom<p.bottom})()'),'legend overlaps card border');
            if(width===375||width===1440)await shot('estimate-'+theme+'-'+width);
        }
    }
    assert.equal(await projectBytes(),originalProject);
    await open('katalog.html');
    assert.equal(await evaluate('document.getElementById("totalEquipment").textContent'),'6');
    const modelCount=await evaluate('Number(document.getElementById("totalEquipmentModels").textContent)');
    const expectedModels=await evaluate('new Set(equipmentData.flatMap(item=>item.models.map(m=>JSON.stringify([m.manufacturer.trim().replace(/\\s+/g," ").toLowerCase(),m.model.trim().replace(/\\s+/g," ").toLowerCase()])))).size');
    assert.equal(modelCount,expectedModels);
    // Test duplicates only in this isolated page's memory, never in the database file.
    await evaluate('(()=>{const m=equipmentData[0].models[0];equipmentData[0].models.push({...m,manufacturer:"  "+m.manufacturer.toUpperCase()+"  ",model:" "+m.model.toLowerCase()+" "});equipmentData[1].models.push({...m});document.getElementById("equipmentSearch").dispatchEvent(new Event("input"))})()');
    assert.equal(await evaluate('Number(document.getElementById("totalEquipmentModels").textContent)'),modelCount,'duplicate brand/model counted twice');
    await evaluate('equipmentData[0].models.pop();equipmentData[1].models.pop();document.getElementById("equipmentSearch").dispatchEvent(new Event("input"))');
    await evaluate('equipmentData[0].models.push({manufacturer:"UI test brand",model:"UI test model",specifications:{}});document.getElementById("equipmentSearch").dispatchEvent(new Event("input"))');
    assert.equal(await evaluate('Number(document.getElementById("totalEquipmentModels").textContent)'),modelCount+1,'new model was not included dynamically');
    await evaluate('equipmentData[0].models.pop();document.getElementById("equipmentSearch").dispatchEvent(new Event("input"))');
    console.log('PASS actual catalog total: '+modelCount+' unique models; duplicates ignored and new models counted dynamically');
    assert.equal(await evaluate('document.querySelector(".topbar > a")'),null);
    await evaluate('document.getElementById("equipmentSearch").value="Komatsu";document.getElementById("equipmentSearch").dispatchEvent(new Event("input"))');
    assert.ok(await evaluate('document.querySelectorAll("#equipmentGrid > .equipment-card").length>0'));
    await evaluate('document.getElementById("equipmentSearch").value="";document.getElementById("equipmentSearch").dispatchEvent(new Event("input"));document.getElementById("equipmentFilter").value="transport";document.getElementById("equipmentFilter").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.querySelectorAll("#equipmentGrid > .equipment-card").length'),1);
    assert.equal(await evaluate('Number(document.getElementById("totalEquipmentModels").textContent)'),modelCount,'filter changed global model count');
    for(const theme of ['light','dark']) {
        await evaluate('localStorage.setItem("excabaseTheme",'+JSON.stringify(theme)+')');
        for(const width of [320,375,768,1024,1440]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            await open('katalog.html');
            assert.equal(await evaluate('document.querySelectorAll("#equipmentGrid > .equipment-card").length'),6);
            assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'catalog overflow '+theme+'/'+width);
            assert.equal(await evaluate('getComputedStyle(document.querySelector(".stats-container")).display'),'grid');
            if(width===375||width===1440)await shot('catalog-'+theme+'-'+width);
        }
    }
    for(const projectMode of [false,true]) {
        await open('kalkulator-volume-tanah.html'+(projectMode?'?fromProject=1':''));
        await evaluate('document.getElementById("earthworkFactorHelper").open=true');
        assert.equal(await evaluate('document.querySelectorAll("#earthworkFactorHelper .earthwork-help-block").length'),5);
        assert.equal(await evaluate('document.querySelectorAll("#earthworkFactorHelper .earthwork-help-formula").length'),2);
        assert.ok(await evaluate('document.getElementById("earthworkFactorReferenceLink").getAttribute("href").endsWith("#page=1")'));
        await evaluate('const choice=document.getElementById("earthworkReferenceMaterial");choice.value="tanah-liat-berpasir";choice.dispatchEvent(new Event("change"))');
        assert.equal(await evaluate('document.getElementById("applyEarthworkFactors").disabled'),false);
        const oldMainMaterial=await evaluate('document.getElementById("earthworkMaterial").value');
        await evaluate('document.getElementById("applyEarthworkFactors").click()');
        assert.deepEqual(await evaluate('[document.getElementById("earthworkSwell").value,document.getElementById("earthworkShrinkage").value]'),['25','10']);
        assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),oldMainMaterial);
        for(const theme of ['light','dark'])for(const width of [320,375,768,1024,1440]) {
            await evaluate(`document.documentElement.classList.toggle('excabase-dark',${theme==='dark'});document.body.classList.toggle('excabase-dark',${theme==='dark'})`);
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'factor help overflow '+theme+'/'+width);
            if(width===375||width===1440)await shot('help-'+projectMode+'-'+theme+'-'+width);
        }
        await evaluate('document.querySelector("#earthworkFactorHelper summary").click()');
        assert.equal(await evaluate('document.getElementById("earthworkFactorHelper").open'),false);
    }
    assert.equal(await projectBytes(),originalProject);
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS project estimate unchanged: exact DOM/computed styles, 10 cases; standalone target/units calculations, restore, 6 choices/3 inputs; catalog stats/filter/search; factor accordion/preview/apply/source; light/dark 320/375/768/1024/1440px without overflow; project storage untouched');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
