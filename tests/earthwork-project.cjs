// End-to-end flow in an isolated Chrome profile, never in the user's browser storage.
const fs = require('node:fs');
const harness = fs.readFileSync(require('node:path').join(__dirname, 'productivity.cjs'), 'utf8');
const test = async function () {
    const volume = 'kalkulator-volume-tanah.html?fromProject=1';
    const draftKey = 'excabase_project_earthwork_factors_202';
    const standaloneKey = 'excabase_standalone_earthwork';
    const sentinel = {id:101,name:'Existing project sentinel',soilType:'Batuan',results:{keep:{unchanged:true}},status:'aktif'};
    const project = {id:202,name:'Factor flow test',location:'Test',soilType:'Tanah lempung',soilVolumeBCM:1000,
        workType:'Pemadatan Tanah',targetDays:10,workHoursPerDay:8,status:'aktif',results:{keep:{unchanged:true}},userNote:'Preserve this'};
    await open('kalkulator-volume-tanah.html');
    await evaluate('localStorage.clear()');
    await evaluate('localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(project))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([sentinel,project]))+')');
    await evaluate('localStorage.setItem('+JSON.stringify(standaloneKey)+','+JSON.stringify(JSON.stringify({version:1,inputs:{earthworkBCM:'77',earthworkMaterial:'batuan',earthworkSwell:'20',earthworkShrinkage:'5',earthworkParameterSource:'data-proyek',earthworkSourceNote:'Independent'}}))+')');
    const independent=await evaluate('localStorage.getItem('+JSON.stringify(standaloneKey)+')');
    const set=async(id,value)=>evaluate(`(() => {const input=document.getElementById(${JSON.stringify(id)});input.value=${JSON.stringify(String(value))};input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const projectBytes=()=>evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])');
    const next=async file=>{
        assert.equal(await evaluate('document.querySelector(".project-nav-next").getAttribute("href")'),file+'?fromProject=1');
        await evaluate('document.querySelector(".project-nav-next").click()');
        for(let i=0;i<100;i++){await delay(40);if(await evaluate('document.readyState==="complete" && location.pathname.endsWith('+JSON.stringify('/'+file)+')'))return;}
        throw new Error('Navigation failed: '+file);
    };
    await open(volume);
    assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),'tanah-lempung');
    assert.equal(await evaluate('document.getElementById("earthworkBCM").value'),'1000');
    assert.equal(await evaluate('document.querySelectorAll("#earthworkMaterial option").length'),7);
    const pristine=await projectBytes();
    for(const [material,swell,shrinkage,lcm,ccm] of [['pasir',11,5,1110,950],['tanah-liat-berpasir',25,10,1250,900],['tanah-liat',43,10,1430,900]]){
        await set('earthworkParameterSource','referensi-teknis');
        const bytes=await projectBytes();
        const inputs=await evaluate('JSON.stringify(["earthworkBCM","earthworkMaterial","earthworkSwell","earthworkShrinkage"].map(id=>document.getElementById(id).value))');
        const storage=await evaluate('JSON.stringify({...localStorage})');
        await set('earthworkReferenceMaterial',material);
        assert.equal(await projectBytes(),bytes);
        assert.equal(await evaluate('JSON.stringify({...localStorage})'),storage);
        assert.equal(await evaluate('JSON.stringify(["earthworkBCM","earthworkMaterial","earthworkSwell","earthworkShrinkage"].map(id=>document.getElementById(id).value))'),inputs);
        await evaluate('document.getElementById("applyEarthworkFactors").click()');
        assert.equal(await projectBytes(),bytes,'apply changed project results/progress');
        await open(volume);
        assert.equal(await evaluate('Number(document.getElementById("earthworkSwell").value)'),swell);
        assert.equal(await evaluate('Number(document.getElementById("earthworkShrinkage").value)'),shrinkage);
        assert.equal(await evaluate('document.getElementById("earthworkReferenceMaterial").value'),material);
        assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),'tanah-lempung');
        assert.equal(await evaluate('document.getElementById("earthworkBCM").value'),'1000');
        await evaluate('document.getElementById("calculateEarthworkBtn").click()');
        const earth=await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.earthwork');
        assert.equal(earth.lcm,lcm);assert.equal(earth.ccm,ccm);
        assert.deepEqual(Object.keys(earth).sort(),['bcm','lcm','ccm','material','swellFactor','shrinkageFactor','parameterSource','sourceNote','calculatedAt'].sort());
        assert.equal(await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).userNote'),'Preserve this');
    }
    assert.notEqual(await projectBytes(),pristine);
    for(const protectedSource of ['pengujian-laboratorium','data-proyek']){
        await set('earthworkParameterSource',protectedSource);
        const fields=await evaluate('JSON.stringify(["earthworkSwell","earthworkShrinkage","earthworkParameterSource","earthworkSourceNote"].map(id=>document.getElementById(id).value))');
        await set('earthworkReferenceMaterial','pasir');
        assert.equal(await evaluate('document.getElementById("applyEarthworkFactors").disabled'),true);
        assert.equal(await evaluate('JSON.stringify(["earthworkSwell","earthworkShrinkage","earthworkParameterSource","earthworkSourceNote"].map(id=>document.getElementById(id).value))'),fields);
    }
    await set('earthworkSwell','26');await set('earthworkShrinkage','10');
    await evaluate('document.getElementById("calculateEarthworkBtn").click()');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.earthwork.lcm'),1260);
    const beforeReset=await projectBytes();
    await evaluate('document.getElementById("resetEarthworkBtn").click()');
    assert.equal(await evaluate('localStorage.getItem('+JSON.stringify(draftKey)+')'),null);
    assert.equal(await projectBytes(),beforeReset);
    await open(volume);
    assert.equal(await evaluate('document.getElementById("earthworkSwell").value'),'26');
    await set('earthworkParameterSource','referensi-teknis');await set('earthworkReferenceMaterial','pasir');
    await evaluate('document.getElementById("applyEarthworkFactors").click()');
    await evaluate('const p=JSON.parse(localStorage.getItem("excabase_active_project"));p.results.earthwork.swellFactor=17;p.results.earthwork.parameterSource="pengujian-laboratorium";localStorage.setItem("excabase_active_project",JSON.stringify(p))');
    const staleBytes=await projectBytes();
    await open(volume);
    assert.equal(await evaluate('document.getElementById("earthworkSwell").value'),'17');
    assert.equal(await projectBytes(),staleBytes,'stale draft overwrote newer project');
    await set('earthworkParameterSource','referensi-teknis');await set('earthworkReferenceMaterial','tanah-liat-berpasir');
    await evaluate('document.getElementById("applyEarthworkFactors").click();document.getElementById("calculateEarthworkBtn").click()');
    assert.equal(await evaluate('localStorage.getItem('+JSON.stringify(standaloneKey)+')'),independent);
    await evaluate('document.getElementById("earthworkFactorHelper").open=true');
    for(const width of [1440,1280,1100,1024,768,600,390,360]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
        const measure=function(){const form=document.querySelector('.earthwork-input-panel').getBoundingClientRect(),result=document.querySelector('.earthwork-result-panel').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,side:result.x>form.right&&form.y===result.y,stacked:result.y>form.bottom};};
        const layout=await evaluate('('+measure.toString()+')()');
        assert.equal(layout.overflow,false,'project overflow '+width);
        assert.equal(width>1100?layout.side:layout.stacked,true,'project panel layout '+width);
    }
    await send('Emulation.clearDeviceMetricsOverride');
    console.log('PASS project helper: preview, apply, three formulas, draft restore, protected sources, manual input, Reset, stale drafts, unchanged schema and isolated storage');

    // Use the actual project navigation and UI actions through every downstream stage.
    await next('rekomendasi.html');
    assert.equal(await evaluate('document.getElementById("recommendationMaterial").value'),'Tanah lempung');
    await evaluate('document.getElementById("useRecommendedEquipmentBtn").click();document.getElementById("saveSelectedEquipmentBtn").click()');
    await next('produktivitas.html');
    assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'),1);
    await evaluate(`(() => {const section=document.querySelector('[data-calculator=compactor]');const model=section.querySelector('[data-model]');model.value='custom';model.dispatchEvent(new Event('change',{bubbles:true}));for(const [key,value] of Object.entries({compactorWidth:2,compactorSpeed:4,compactorEfficiency:.75,compactorPasses:4,compactorThickness:.2,compactorWorkingHours:8})){const input=section.querySelector('[data-field="'+key+'"]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}section.querySelector('[data-action=calculate]').click();})()`);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.productivity.compactor.hourly'),300);
    await next('estimasi-proyek.html');
    await set('estimate-cost-compactor','250000');
    await evaluate('document.getElementById("calculateProjectBtn").click()');
    const estimate=await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.estimate');
    assert.ok(estimate?.equipment?.length===1,await evaluate('document.getElementById("projectCalculationStatus").textContent'));
    assert.equal(estimate.equipment[0].workVolumeBasis,'ccm');
    assert.equal(estimate.equipment[0].workVolume,900);
    await next('simulasi-armada.html');
    await evaluate('document.getElementById("calculateFleetScenarioBtn").click()');
    await set('fleetSelectedScenario','dasar');
    await evaluate('document.getElementById("saveFleetScenarioBtn").click()');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.fleet.selectedScenario'),'dasar');
    await next('analisis-laporan.html');
    assert.equal(await evaluate('document.getElementById("completeProjectBtn").disabled'),false);
    assert.ok(await evaluate('document.getElementById("reportResultsTable").children.length>0'));
    await evaluate('window.confirm=()=>true;window.alert=()=>{};document.getElementById("completeProjectBtn").click()');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).status'),'selesai');
    const completed=await evaluate('JSON.stringify({...localStorage})');
    await open(volume);
    assert.equal(await evaluate('document.getElementById("applyEarthworkFactors").disabled'),true);
    assert.equal(await evaluate('document.getElementById("earthworkReferenceMaterial").disabled'),true);
    await evaluate('document.getElementById("earthworkReferenceMaterial").value="pasir";document.getElementById("earthworkReferenceMaterial").dispatchEvent(new Event("change"));["applyEarthworkFactors","calculateEarthworkBtn","resetEarthworkBtn"].forEach(id=>{document.getElementById(id).disabled=false;document.getElementById(id).click()})');
    assert.equal(await evaluate('JSON.stringify({...localStorage})'),completed,'completed project changed');
    assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("excabase_projects")).find(p=>p.id===101)'),sentinel);
    assert.equal(await evaluate('localStorage.getItem('+JSON.stringify(standaloneKey)+')'),independent);
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS full UI flow: Volume -> Recommendation -> Productivity -> Estimate -> Fleet -> Report -> Completed; completed writes blocked, existing project untouched');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
