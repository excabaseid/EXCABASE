// All real pages and project stages, using an isolated browser profile.
const fs = require('node:fs');
const harness = fs.readFileSync(require('node:path').join(__dirname,'productivity.cjs'),'utf8');
const test = async function () {
    const titlePath=require('node:path'), baselineMode=process.env.EXCABASE_HEADER_BASELINE==='1';
    const baselinePath=titlePath.join(require('node:os').tmpdir(),'excabase-page-title-baseline.json');
    const baseline=!baselineMode && fs.existsSync(baselinePath)?JSON.parse(fs.readFileSync(baselinePath,'utf8')):{};
    const results={}, exceptions=[];
    const files=['../index.html',...fs.readdirSync(titlePath.join(root,'pages')).filter(f=>f.endsWith('.html'))];
    const stages=['kalkulator-volume-tanah','rekomendasi','produktivitas','estimasi-proyek','simulasi-armada','analisis-laporan'];
    files.push(...stages.map(f=>f+'.html?fromProject=1'));
    const fixture={id:451,name:'Title audit',status:'selesai',soilVolumeBCM:1000,soilType:'Tanah lempung',workType:'Pemadatan Tanah',workHoursPerDay:8,targetDays:10,
        results:{earthwork:{bcm:1000,lcm:1250,ccm:900,material:'tanah-lempung'},recommendation:{equipment:'Compactor'},selectedEquipment:['compactor'],
        productivity:{compactor:{type:'compactor',model:'Test',hourly:300,daily:2400,volumeBasis:'ccm',unit:'m³'}},
        estimate:{equipment:[{type:'compactor',units:1,hourlyProductivity:300,totalHourlyProductivity:300,dailyProductivity:2400,volumeBasis:'ccm',workVolumeBasis:'ccm',workVolume:900,costPerHour:250000,totalHourlyCost:250000,dailyCost:2000000,durationHours:3,durationDays:.375,totalOperatingCost:750000}]}}};
    await open('pengaturan.html');
    await evaluate('localStorage.clear();localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(fixture))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([fixture]))+')');
    const projectBytes=()=>evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])');
    const before=await projectBytes();
    async function visit(file) {
        if(file!=='../index.html')return open(file);
        await send('Page.navigate',{url:base+'/index.html'});
        for(let i=0;i<100;i++){await delay(40);if(await evaluate('location.pathname==="/index.html" && document.readyState==="complete"'))return;}
        throw Error('Dashboard navigation timeout');
    }
    for(const theme of ['light','dark']) {
        await evaluate('localStorage.setItem("excabaseTheme",'+JSON.stringify(theme)+')');
        for(const width of [1440,390]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            for(const file of files) {
                await visit(file);
                const data=await evaluate(`(()=>{const h=document.querySelector('h1');if(!h)return null;const s=getComputedStyle(h),r=h.getBoundingClientRect();return {count:document.querySelectorAll('h1').length,classes:document.querySelectorAll('h1.excabase-page-title, body.standalone-estimate > .main-content > .page-header > h1').length,text:h.textContent,description:h.nextElementSibling?.tagName==='P'?h.nextElementSibling.textContent:null,font:s.fontSize,weight:s.fontWeight,color:s.color,background:s.backgroundImage,border:s.borderLeftWidth,rect:{left:r.left,right:r.right,width:r.width},titleOverflow:h.scrollWidth>h.clientWidth,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,subheadings:[...document.querySelectorAll('h2,h3,h4,h5,h6')].map(el=>{const v=getComputedStyle(el);return [el.textContent,v.fontSize,v.fontWeight,v.color,v.backgroundImage,v.borderLeftWidth]}),links:[...document.querySelectorAll('a')].map(el=>[el.textContent,el.getAttribute('href')]),descriptionBackground:h.nextElementSibling?.tagName==='P'?getComputedStyle(h.nextElementSibling).backgroundImage:null}})()`);
                assert.ok(data,file+' missing H1');
                const key=theme+'/'+width+'/'+file; results[key]=data;
                if(baselineMode)continue;
                assert.equal(data.count,1,file+' duplicate H1');
                assert.equal(data.classes,1,file+' title class applied to other elements');
                assert.equal(data.font,width===1440?'32px':'26px',key);
                assert.equal(data.weight,'800',key); assert.equal(data.border,'6px',key);
                assert.equal(data.color,theme==='dark'?'rgb(241, 245, 249)':'rgb(18, 52, 77)',key);
                assert.ok(data.background.startsWith('linear-gradient(90deg'),key);
                assert.equal(data.titleOverflow,false,key+JSON.stringify(data));
                assert.ok(data.rect.right<=width+1,key+' title exceeds viewport: '+JSON.stringify(data.rect));
                assert.ok(data.documentWidth<=width,key+' horizontal page overflow: '+data.documentWidth);
                if(data.descriptionBackground!==null)assert.equal(data.descriptionBackground,'none',key);
                if(baseline[key]) {
                    assert.equal(data.text,baseline[key].text,key+' title text changed');
                    assert.equal(data.description,baseline[key].description,key+' description changed');
                    assert.deepEqual(data.links,baseline[key].links,key+' navigation changed');
                    assert.deepEqual(data.subheadings,baseline[key].subheadings,key+' section/card heading styles changed');
                    if(data.documentWidth>width && data.documentWidth>baseline[key].documentWidth+1)exceptions.push(key+': overflow grew '+baseline[key].documentWidth+' -> '+data.documentWidth);
                }
                if(['../index.html','proyek-aktif.html','katalog.html','produktivitas-excavator.html','analisis-laporan.html?fromProject=1'].includes(file)) {
                    const shot=await send('Page.captureScreenshot',{format:'png'});
                    fs.writeFileSync(titlePath.join(require('node:os').tmpdir(),'excabase-title-'+file.replace(/[\W]/g,'_')+'-'+theme+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
                }
            }
        }
    }
    assert.equal(await projectBytes(),before,'project data modified');
    assert.equal(errors.length,0,JSON.stringify(errors));
    if(baselineMode){fs.writeFileSync(baselinePath,JSON.stringify(results));console.log('BASELINE '+Object.keys(results).length+' page/theme/viewport cases saved');return;}
    assert.deepEqual(exceptions,[],'header changes increased horizontal overflow');
    console.log('PASS '+Object.keys(results).length+' page/theme/viewport cases; one title only; consistent type/accent; original text/descriptions/navigation/subheadings; no clipped title; project data unchanged');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
