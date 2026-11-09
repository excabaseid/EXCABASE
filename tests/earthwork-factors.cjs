// Uses the existing dependency-free Chrome/CDP harness with an isolated browser profile.
const fs = require('node:fs');
const harness = fs.readFileSync(require('node:path').join(__dirname, 'productivity.cjs'), 'utf8');
const test = async function () {
    const page = 'kalkulator-volume-tanah.html';
    const key = 'excabase_standalone_earthwork';
    await open(page);
    const project = { id: 998, name: 'Earthwork isolation', soilVolumeBCM: 1000, soilType: 'Tanah biasa', results: {} };
    await evaluate('localStorage.clear()');
    for (const [name, value] of Object.entries({
        excabase_active_project: project, excabase_projects: [project],
        excabase_standalone_productivity_inputs: { keep: 'individual' },
        excabase_combination_productivity_inputs: { keep: 'combination' }
    })) await evaluate('localStorage.setItem(' + JSON.stringify(name) + ',' + JSON.stringify(JSON.stringify(value)) + ')');
    const untouchedKeys = ['excabase_active_project', 'excabase_projects', 'excabase_standalone_productivity_inputs', 'excabase_combination_productivity_inputs'];
    const untouched = await evaluate('JSON.stringify(' + JSON.stringify(untouchedKeys) + '.map(key=>localStorage.getItem(key)))');
    await open(page);
    const set = async (id, value) => evaluate(`(() => {const el=document.getElementById(${JSON.stringify(id)});el.value=${JSON.stringify(String(value))};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const mainSnapshot = () => evaluate(`JSON.stringify(['earthworkMaterial','earthworkSwell','earthworkShrinkage','earthworkParameterSource','earthworkSourceNote'].map(id=>document.getElementById(id).value))`);
    const calculate = async () => {
        await evaluate('document.getElementById("calculateEarthworkBtn").click()');
        return evaluate('[...document.querySelectorAll("#earthworkCalculationDetails strong")].slice(0,3).map(el=>parseFloat(el.textContent))');
    };
    assert.equal(await evaluate('document.querySelectorAll("#earthworkReferenceMaterial option").length'), 4);
    assert.ok(await evaluate('document.getElementById("earthworkFactorHelper").textContent.includes("Pilih material referensi yang sesuai dengan kondisi tanah sebenarnya. Pilihan ini hanya digunakan untuk menentukan Swell dan Shrinkage, tanpa mengubah jenis material pekerjaan.")'));
    const originalCategories = ['tanah-biasa','tanah-lempung','tanah-berpasir','tanah-keras','batuan','lainnya'];
    assert.deepEqual(await evaluate('[...document.getElementById("earthworkMaterial").options].filter(o=>o.value).map(o=>o.value)'),originalCategories);
    await set('earthworkBCM', '1000');
    await set('earthworkMaterial', 'tanah-biasa');
    await set('earthworkSwell', '20');
    await set('earthworkShrinkage', '8');
    await set('earthworkParameterSource', 'pengujian-laboratorium');
    await set('earthworkSourceNote', 'Laboratory data');
    assert.deepEqual(await calculate(), [1000, 1200, 920]);
    await open(page);
    assert.equal(await evaluate('document.getElementById("earthworkSourceNote").value'), 'Laboratory data');
    assert.deepEqual(await calculate(), [1000, 1200, 920]);
    await set('earthworkReferenceMaterial', 'pasir');
    assert.equal(await evaluate('document.getElementById("applyEarthworkFactors").disabled'), true);
    assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'), 'tanah-biasa');
    for (const source of ['pengujian-laboratorium', 'data-proyek', 'lainnya']) {
        await set('earthworkParameterSource', source);
        const before = await mainSnapshot();
        const storage = await evaluate('JSON.stringify({...localStorage})');
        await set('earthworkReferenceMaterial', 'tanah-liat');
        await set('earthworkReferenceMaterial', 'pasir');
        assert.equal(await mainSnapshot(), before);
        assert.equal(await evaluate('JSON.stringify({...localStorage})'), storage);
        assert.equal(await evaluate('document.getElementById("applyEarthworkFactors").disabled'), true);
        await evaluate('document.getElementById("applyEarthworkFactors").disabled=false;document.getElementById("applyEarthworkFactors").click()');
        assert.equal(await mainSnapshot(), before, 'protected source overwritten');
    }
    await set('earthworkParameterSource', 'referensi-teknis');
    await set('earthworkMaterial', 'tanah-berpasir');
    assert.equal(await evaluate('document.getElementById("applyEarthworkFactors").disabled'), false);
    assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'), 'tanah-berpasir');
    console.log('PASS six original categories; independent reference preview; protected sources');

    for (const [material, swell, shrinkage, lcm, ccm] of [
        ['pasir', 11, 5, 1110, 950], ['tanah-liat-berpasir', 25, 10, 1250, 900], ['tanah-liat', 43, 10, 1430, 900]
    ]) {
        await set('earthworkMaterial', 'tanah-berpasir');
        await set('earthworkReferenceMaterial', material);
        const before = await mainSnapshot();
        const storage = await evaluate('JSON.stringify({...localStorage})');
        await set('earthworkReferenceMaterial', '');
        await set('earthworkReferenceMaterial', material);
        assert.equal(await mainSnapshot(), before);
        assert.equal(await evaluate('JSON.stringify({...localStorage})'), storage);
        assert.equal(await evaluate('document.getElementById("applyEarthworkFactors").disabled'), false);
        await evaluate('document.getElementById("applyEarthworkFactors").click()');
        assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),'tanah-berpasir');
        assert.equal(await evaluate('Number(document.getElementById("earthworkSwell").value)'), swell);
        assert.equal(await evaluate('Number(document.getElementById("earthworkShrinkage").value)'), shrinkage);
        assert.equal(await evaluate('document.getElementById("earthworkParameterSource").value'), 'referensi-teknis');
        const saved = await evaluate('JSON.parse(localStorage.getItem(' + JSON.stringify(key) + '))');
        assert.equal(saved.factorReference.referenceMaterial, material);
        assert.equal(saved.inputs.earthworkMaterial,'tanah-berpasir');
        assert.equal(saved.factorReference.estimated, true);
        assert.equal(saved.factorReference.source.page, 1);
        assert.equal(saved.result, null);
        assert.deepEqual(await calculate(), [1000, lcm, ccm]);
        await open(page);
        assert.equal(await evaluate('document.getElementById("earthworkReferenceMaterial").value'), material);
        assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),'tanah-berpasir');
        assert.equal(await evaluate('Number(document.getElementById("earthworkSwell").value)'), swell);
        assert.equal(await evaluate('JSON.parse(localStorage.getItem(' + JSON.stringify(key) + ')).result.ccm'), ccm);
        assert.deepEqual(await calculate(), [1000, lcm, ccm]);
        console.log('PASS reference ' + material + ': apply, source metadata, calculation, restore');
    }
    for (const category of originalCategories) {
        await set('earthworkMaterial',category);
        assert.equal(await evaluate('document.getElementById("earthworkParameterSource").value'),'referensi-teknis');
        assert.equal(await evaluate('JSON.parse(localStorage.getItem(' + JSON.stringify(key) + ')).factorReference.referenceMaterial'),'tanah-liat');
        assert.deepEqual(await calculate(),[1000,1430,900]);
        await open(page);
        assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),category);
    }
    await set('earthworkSwell', '21');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem(' + JSON.stringify(key) + ')).factorReference'), null);
    assert.equal(await evaluate('document.getElementById("earthworkParameterSource").value'), 'asumsi-estimasi');
    assert.deepEqual(await calculate(), [1000, 1210, 900]);
    await set('earthworkShrinkage', '-10');
    assert.deepEqual(await calculate(), []);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem(' + JSON.stringify(key) + ')).result'), null);
    await set('earthworkShrinkage', '10');
    await calculate();
    await evaluate('document.getElementById("earthworkFactorHelper").open=true');
    for (const width of [1440,1280,1100,1024,768,600,390,360]) {
        await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:false});
        const measure = function () {
            const a=document.querySelector('.earthwork-input-panel').getBoundingClientRect();
            const b=document.querySelector('.earthwork-result-panel').getBoundingClientRect();
            return { overflow:document.documentElement.scrollWidth>innerWidth, side:b.x>a.right && b.y===a.y, stacked:b.y>a.bottom };
        };
        const r=await evaluate('('+measure.toString()+')()');
        assert.equal(r.overflow,false,'overflow at '+width);
        assert.equal(width>1100?r.side:r.stacked,true,'wrong panel arrangement at '+width);
    }
    await evaluate('document.getElementById("resetEarthworkBtn").click()');
    assert.equal(await evaluate('localStorage.getItem(' + JSON.stringify(key) + ')'), null);
    assert.equal(await evaluate('document.getElementById("earthworkReferenceMaterial").value'), '');
    assert.equal(await evaluate('document.getElementById("earthworkCalculationDetails").textContent'), '');
    assert.equal(await evaluate('document.getElementById("earthworkSwell").value'), '');
    assert.equal(await evaluate('JSON.stringify(' + JSON.stringify(untouchedKeys) + '.map(key=>localStorage.getItem(key)))'), untouched);
    for (const [legacy, swell, shrinkage] of [['pasir',11,5],['tanah-liat-berpasir',25,10],['tanah-liat',43,10]]) {
        const old = {version:1,inputs:{earthworkBCM:'1000',earthworkMaterial:legacy,earthworkSwell:String(swell),earthworkShrinkage:String(shrinkage),earthworkParameterSource:'referensi-teknis',earthworkSourceNote:'Legacy reference'},
            factorReference:{material:legacy,swell,shrinkage,source:{page:1},estimated:true},result:{bcm:1000,lcm:1000*(1+swell/100),ccm:1000*(1-shrinkage/100)}};
        await evaluate('localStorage.setItem('+JSON.stringify(key)+','+JSON.stringify(JSON.stringify(old))+')');
        const raw=await evaluate('localStorage.getItem('+JSON.stringify(key)+')');
        await open(page);
        assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),'');
        assert.equal(await evaluate('document.getElementById("earthworkReferenceMaterial").value'),legacy);
        assert.equal(await evaluate('document.getElementById("earthworkLegacyMaterialNotice")'),null);
        assert.equal(await evaluate('document.body.textContent.includes("data kompatibilitas")'),false);
        assert.equal(await evaluate('localStorage.getItem('+JSON.stringify(key)+')'),raw,'legacy data rewritten on load');
        await set('earthworkMaterial','tanah-lempung');
        const updated=await evaluate('JSON.parse(localStorage.getItem('+JSON.stringify(key)+'))');
        assert.deepEqual(updated.legacyMaterial.inputs,old.inputs);
        assert.deepEqual(updated.legacyMaterial.result,old.result);
        assert.equal(updated.inputs.earthworkMaterial,'tanah-lempung');
        assert.equal(updated.factorReference.referenceMaterial,legacy);
        await calculate();
        await open(page);
        assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),'tanah-lempung');
        assert.equal(await evaluate('document.getElementById("earthworkReferenceMaterial").value'),legacy);
    }
    assert.equal(await evaluate('JSON.stringify(' + JSON.stringify(untouchedKeys) + '.map(key=>localStorage.getItem(key)))'), untouched);
    const beforeProject = await evaluate('JSON.stringify({...localStorage})');
    await open(page+'?fromProject=1');
    assert.ok(await evaluate('!!document.getElementById("earthworkFactorHelper")'));
    assert.equal(await evaluate('document.getElementById("earthworkMaterial").querySelector("option[value=pasir]")'), null);
    assert.equal(await evaluate('JSON.stringify({...localStorage})'), beforeProject);
    assert.equal(await evaluate('document.querySelectorAll(".project-step-navigation").length'), 1);
    for (const [soil,category] of [['Tanah biasa','tanah-biasa'],['Tanah lempung','tanah-lempung'],['Tanah berpasir','tanah-berpasir'],['Tanah keras','tanah-keras'],['Batuan','batuan'],['Lainnya','lainnya']]) {
        const p={...project,soilType:soil,workType:'Pemadatan Tanah',results:{}};
        await evaluate('localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(p))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([p]))+')');
        await open(page+'?fromProject=1');
        assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),category);
        for(const [id,value] of Object.entries({earthworkSwell:'20',earthworkShrinkage:'8',earthworkParameterSource:'data-proyek'}))await set(id,value);
        assert.deepEqual(await calculate(),[1000,1200,920]);
        assert.equal(await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.earthwork.material'),category);
        assert.equal(await evaluate('JSON.parse(localStorage.getItem("excabase_projects"))[0].soilType'),soil);
        await open('rekomendasi.html?fromProject=1');
        assert.equal(await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).soilType'),soil);
        if(soil!=='Lainnya') assert.equal(await evaluate('document.getElementById("recommendationMaterial").value'),soil);
    }
    for(const legacy of ['pasir','tanah-liat-berpasir','tanah-liat']) {
        const p={...project,soilType:legacy,workType:'Pemadatan Tanah',results:{earthwork:{material:legacy}}};
        await evaluate('localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(p))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([p]))+')');
        const bytes=await evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])');
        await open(page+'?fromProject=1');
        assert.equal(await evaluate('document.getElementById("earthworkMaterial").value'),'');
        assert.equal(await evaluate('document.getElementById("earthworkLegacyMaterialNotice")'),null);
        await open('rekomendasi.html?fromProject=1');
        assert.equal(await evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])'),bytes);
    }
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS all six categories, three independent references, legacy preservation, project/recommendation mappings, Reset and responsive layout');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
