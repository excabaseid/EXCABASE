// Regression: actual checkbox identifiers must reach the existing shared calculators.
const fs = require('node:fs');
const harness = fs.readFileSync(require('node:path').join(__dirname, 'productivity.cjs'), 'utf8');
const test = async function () {
    const all = ['excavator','bulldozer','dumptruck','wheelloader','motorgrader','compactor'];
    const fields = {
        excavator:{bucket:2,fillFactor:.8,cycleTime:30,efficiency:.75,workingHours:8},
        dumptruck:{truckCapacity:10,truckCycleTime:20,truckEfficiency:.8,truckWorkingHours:8},
        wheelloader:{loaderBucket:2,loaderFillFactor:.8,loaderCycleTime:30,loaderEfficiency:.75,loaderWorkingHours:8},
        motorgrader:{graderWidth:3,graderSpeed:4,graderEfficiency:.75,graderPasses:4,graderThickness:.2,graderWorkingHours:8},
        bulldozer:{dozerCapacity:2,dozerFillFactor:.8,dozerCycleTime:30,dozerEfficiency:.75,dozerWorkingHours:8},
        compactor:{compactorWidth:2,compactorSpeed:4,compactorEfficiency:.75,compactorPasses:4,compactorThickness:.2,compactorWorkingHours:8}
    };
    const expected = {excavator:144,dumptruck:24,wheelloader:144,motorgrader:450,bulldozer:144,compactor:300};
    const sentinel={id:501,name:'Unrelated project',results:{keep:'untouched'}};
    await open('rekomendasi.html?fromProject=1');
    await evaluate('localStorage.clear()');
    for(const existing of [false,true]) {
        for(const selection of [['motorgrader'],all,['motorgrader','dumptruck','compactor'],['excavator','bulldozer','wheelloader']]) {
            const project={id:502,name:existing?'Existing project':'New project',status:'aktif',soilType:'Tanah lempung',workType:'Pemadatan Tanah',
                results:{keep:{existing},...(existing?{selectedEquipment:['motorgrader'],earthwork:{bcm:1000,lcm:1250,ccm:900}}:{})}};
            await evaluate('localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(project))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([sentinel,project]))+')');
            await open('rekomendasi.html?fromProject=1');
            await evaluate(`document.querySelectorAll('.equipment-choice').forEach(input=>input.checked=${JSON.stringify(selection)}.includes(input.value));document.getElementById('saveSelectedEquipmentBtn').click()`);
            assert.deepEqual((await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.selectedEquipment')).sort(),[...selection].sort());
            await open('rekomendasi.html?fromProject=1');
            assert.deepEqual((await evaluate('[...document.querySelectorAll(".equipment-choice:checked")].map(input=>input.value)')).sort(),[...selection].sort());
            await evaluate('document.querySelector(".project-nav-next").click()');
            for(let i=0;i<100;i++){await delay(40);if(await evaluate('location.pathname.endsWith("/produktivitas.html") && document.readyState==="complete"'))break;}
            assert.deepEqual((await evaluate('[...document.querySelectorAll("[data-calculator]")].map(section=>section.dataset.calculator)')).sort(),[...selection].sort(),(existing?'existing':'new')+': '+selection.join(','));
            for(const type of selection) {
                assert.ok(await evaluate(`document.querySelector('[data-calculator=${type}] [data-model]').options.length>1`));
                assert.ok(await evaluate(`!!document.querySelector('[data-calculator=${type}] .parameter-helper')`));
                await evaluate(`(() => {const section=document.querySelector('[data-calculator=${type}]');const select=section.querySelector('[data-model]');select.value='custom';select.dispatchEvent(new Event('change',{bubbles:true}));section.querySelector('[data-custom-model-name]').value='Regression custom';for(const [key,value] of Object.entries(${JSON.stringify(fields[type])})){const input=section.querySelector('[data-field="'+key+'"]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}section.querySelector('[data-action=calculate]').click();})()`);
                assert.equal(await evaluate(`JSON.parse(localStorage.getItem('excabase_active_project')).results.productivity.${type}.hourly`),expected[type]);
            }
            await open('produktivitas.html?fromProject=1');
            assert.deepEqual((await evaluate('[...document.querySelectorAll("[data-calculator]")].map(section=>section.dataset.calculator)')).sort(),[...selection].sort());
            for(const type of selection) {
                assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-model]').value`),'custom');
                assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-custom-model-name]').value`),'Regression custom');
                assert.equal(await evaluate(`Number(document.querySelector('[data-calculator=${type}] [data-field]').value)`),Object.values(fields[type])[0]);
            }
            assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("excabase_projects")).find(p=>p.id===501)'),sentinel);
            assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.keep'),{existing});
            console.log('PASS '+(existing?'existing':'new')+': checkbox/save/render/refresh/formulas/custom/helper '+selection.join(','));
        }
    }
    for(const identifier of ['motorgrader','motor-grader','Motor Grader']) {
        const project={id:503,name:'Identifier compatibility',status:'aktif',results:{selectedEquipment:[identifier],keep:{legacy:true}}};
        await evaluate('localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(project))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([sentinel,project]))+')');
        await open('produktivitas.html?fromProject=1');
        assert.equal(await evaluate('document.querySelectorAll("[data-calculator=motorgrader]").length'),1);
        assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.selectedEquipment'),[identifier]);
    }
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS Motor Grader aliases; saved identifiers preserved; no browser exceptions');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
