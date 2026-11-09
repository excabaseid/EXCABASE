const fs=require('node:fs');
const harness=fs.readFileSync(require('node:path').join(__dirname,'productivity.cjs'),'utf8');
const test=async function () {
    const detailPath=require('node:path');
    const baselineMode=process.env.EXCABASE_DETAIL_BASELINE==='1';
    const baselineFile=detailPath.join(require('node:os').tmpdir(),'excabase-detail-header-before.json');
    const baseline=baselineMode?{}:JSON.parse(fs.readFileSync(baselineFile,'utf8'));
    const types=['excavator','bulldozer','dumptruck','wheelloader','motorgrader','compactor'];
    await open('detail-excavator.html');
    await evaluate('localStorage.clear()');
    for(const theme of ['light','dark']) {
        await evaluate('localStorage.setItem("excabaseTheme",'+JSON.stringify(theme)+')');
        for(const width of [320,375,768,1440]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            for(const type of types) {
                await open('detail-'+type+'.html');
                const data=await evaluate(`(()=>{const h=document.querySelector('.detail-header'),s=getComputedStyle(h);return {layout:[h,...h.querySelectorAll('*')].map(el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);return [el.textContent,r.x,r.y,r.width,r.height,c.padding,c.margin,c.borderRadius,c.borderLeftWidth,c.fontSize,c.lineHeight]}),cards:[...document.querySelectorAll('.detail-section')].map(el=>{const c=getComputedStyle(el);return [el.outerHTML,c.background,c.padding,c.border,c.borderRadius]}),background:s.backgroundColor,border:s.borderLeftColor,title:getComputedStyle(document.getElementById('detailTitle')).color,description:getComputedStyle(h.querySelector('p')).color,overflow:document.documentElement.scrollWidth>innerWidth,options:[...document.querySelector('#modelSelect').options].map(el=>[el.value,el.textContent])}})()`);
                const key=theme+'/'+width+'/'+type;
                if(baselineMode){baseline[key]=data;continue;}
                assert.deepEqual(data.layout,baseline[key].layout,'header geometry/text changed '+key);
                assert.deepEqual(data.cards,baseline[key].cards,'information cards changed '+key);
                assert.deepEqual(data.options,baseline[key].options,'model choices changed '+key);
                assert.equal(data.background,'rgb(255, 200, 61)',key);
                for(const color of [data.border,data.title,data.description])assert.equal(color,'rgb(18, 52, 77)',key);
                assert.equal(data.overflow,false,key);
                if(type==='excavator'&&(width===375||width===1440)) {
                    const screenshot=await send('Page.captureScreenshot',{format:'png'});
                    fs.writeFileSync(detailPath.join(require('node:os').tmpdir(),'excabase-detail-header-'+theme+'-'+width+'.png'),Buffer.from(screenshot.data,'base64'));
                }
            }
        }
    }
    if(baselineMode){fs.writeFileSync(baselineFile,JSON.stringify(baseline));console.log('BASELINE 48 detail-header cases');return;}
    for(const type of types) {
        await open('detail-'+type+'.html');
        assert.ok(await evaluate('document.getElementById("modelSelect").options.length>=3'));
        await evaluate('const select=document.getElementById("modelSelect");select.selectedIndex=2;select.dispatchEvent(new Event("change",{bubbles:true}))');
        assert.equal(await evaluate('document.getElementById("modelSelect").selectedIndex'),2);
        assert.ok(await evaluate('document.querySelector(".detail-section").textContent.length>0'));
    }
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS six detail headers; 48 light/dark viewport cases; existing yellow/navy; identical geometry/text/cards/model options; no overflow; model selection and browser errors checked');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
