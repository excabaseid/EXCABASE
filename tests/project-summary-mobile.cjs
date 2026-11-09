const fs=require('node:fs');
const harness=fs.readFileSync(require('node:path').join(__dirname,'productivity.cjs'),'utf8');
const test=async function () {
    const project={id:941,name:'Pembangunan Jalan Penghubung Kawasan Industri Tahap Kedua',location:'Kabupaten dengan nama lokasi yang panjang',workType:'Galian dan Timbunan',soilVolumeBCM:1234567,targetDays:120,workHoursPerDay:8,status:'aktif',results:{}};
    await open('proyek-aktif.html');
    await evaluate('localStorage.clear();localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(project))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([project]))+')');
    await open('proyek-aktif.html?project=941');await delay(200);
    const storage=await evaluate('JSON.stringify({...localStorage})');
    const values=await evaluate('[...document.querySelectorAll("#projectContent > .project-summary .summary-value")].map(el=>[el.id,el.textContent])');
    const measure=()=>evaluate(`(()=>{const grid=document.querySelector('#projectContent > .project-summary'),s=getComputedStyle(grid);return {columns:s.gridTemplateColumns.split(' ').length,height:grid.getBoundingClientRect().height,workflow:document.querySelector('.workflow-heading > h2').getBoundingClientRect().top,cards:[...grid.children].map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height,getComputedStyle(el).padding]}),readable:[...grid.querySelectorAll('.summary-value')].every(el=>el.scrollWidth<=el.clientWidth && el.scrollHeight<=el.clientHeight),overflow:document.documentElement.scrollWidth>innerWidth}})()`);
    // Temporarily remove only the new CSS rule to compare the previous layout in-place.
    const removeRule=()=>evaluate(`(()=>{for(const sheet of document.styleSheets){const rules=[...sheet.cssRules];const i=rules.findIndex(rule=>rule.conditionText==='screen and (max-width: 430px)' && rule.cssText.includes('#projectContent > .project-summary'));if(i>=0){window.__summaryRule={sheet,index:i,text:sheet.cssRules[i].cssText};sheet.deleteRule(i);return true}}return false})()`);
    const restoreRule=()=>evaluate('__summaryRule.sheet.insertRule(__summaryRule.text,__summaryRule.index)');
    for(const dark of [false,true]) {
        await evaluate(`document.documentElement.classList.toggle('excabase-dark',${dark});document.body.classList.toggle('excabase-dark',${dark})`);
        for(const width of [320,375,390,430,431,768,1024,1440]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await delay(270);
            const current=await measure();
            assert.equal(current.cards.length,6);assert.equal(current.overflow,false,'overflow '+width);
            assert.equal(current.readable,true,'clipped long text '+width);
            assert.equal(await removeRule(),true);const previous=await measure();await restoreRule();
            if(width<=430) {
                assert.equal(current.columns,2);
                assert.equal(new Set(current.cards.map(card=>card[1])).size,3,'not three rows');
                assert.ok(current.height<previous.height,'summary not shorter '+width+' '+JSON.stringify({current,previous}));
                assert.ok(current.workflow<previous.workflow,'workflow not brought upward '+width);
                assert.ok(current.cards[0][0]<current.cards[1][0]);
                if(!dark)console.log('PASS '+width+'px: summary '+Math.round(previous.height)+' -> '+Math.round(current.height)+'px; workflow '+Math.round(previous.workflow-current.workflow)+'px closer');
            } else assert.deepEqual(current,previous,'tablet/desktop changed '+width);
            if(width===375){const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(require('node:path').join(require('node:os').tmpdir(),'excabase-project-summary-'+(dark?'dark':'light')+'.png'),Buffer.from(shot.data,'base64'));}
        }
    }
    assert.deepEqual(await evaluate('[...document.querySelectorAll("#projectContent > .project-summary .summary-value")].map(el=>[el.id,el.textContent])'),values);
    assert.equal(await evaluate('JSON.stringify({...localStorage})'),storage);
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS six cards, 2x3 mobile grid, long values readable, light/dark, unchanged 431-1440px layout, values/storage/navigation untouched');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
