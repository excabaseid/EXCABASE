const fs=require('node:fs');
const harness=fs.readFileSync(require('node:path').join(__dirname,'productivity.cjs'),'utf8');
const test=async function () {
    async function dashboard() {
        await send('Page.navigate',{url:base+'/index.html'});
        for(let i=0;i<100;i++){await delay(40);if(await evaluate('location.pathname==="/index.html" && document.readyState==="complete"'))return;}
        throw Error('Dashboard load timeout');
    }
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await dashboard();
    const projects=[{id:1,name:'A',status:'aktif'},{id:2,name:'B',status:'selesai'},{id:3,name:'C',status:'aktif'},{id:4,name:'D',status:'selesai'}];
    await evaluate('localStorage.clear();localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify(projects))+')');
    await dashboard();
    const original=await evaluate('JSON.stringify({...localStorage})');
    const measure=()=>evaluate(`(()=>{const grid=document.querySelector('.dashboard-stats');return {columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,height:grid.getBoundingClientRect().height,cards:[...grid.children].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return [r.x,r.y,r.width,r.height,s.padding,s.borderRadius]}),labels:[...grid.querySelectorAll('.card p')].map(el=>[el.textContent,getComputedStyle(el).fontSize,el.scrollWidth<=el.clientWidth]),values:[...grid.querySelectorAll('h2')].map(el=>el.textContent),notes:[...grid.querySelectorAll('small')].map(el=>getComputedStyle(el).display),carousel:document.querySelector('.dashboard-hero').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth}})()`);
    for(const dark of [false,true])for(const width of [320,375,390,430,431,768,1440]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
        await evaluate(`document.documentElement.classList.toggle('excabase-dark',${dark});document.body.classList.toggle('excabase-dark',${dark})`);await delay(30);
        const data=await measure();assert.equal(data.overflow,false);
        assert.deepEqual(data.values,['4','2','2']);
        assert.ok(data.labels.every(item=>item[2]),'label clipping at '+width);
        await evaluate(`(()=>{for(const sheet of document.styleSheets){const i=[...sheet.cssRules].findIndex(r=>r.conditionText==='screen and (max-width: 430px)'&&r.cssText.includes('.cards.dashboard-stats'));if(i>=0){window.__statsRule={sheet,index:i,text:sheet.cssRules[i].cssText};sheet.deleteRule(i);return;}}throw Error('Stats rule missing')})()`);
        const previous=await measure();
        await evaluate('__statsRule.sheet.insertRule(__statsRule.text,__statsRule.index)');
        if(width<=430) {
            assert.equal(data.columns,3);assert.equal(new Set(data.cards.map(r=>r[1])).size,1);
            assert.ok(data.height<previous.height);assert.ok(data.notes.every(v=>v==='none'));
            assert.ok(data.labels.every(v=>v[1]==='11px'));
            assert.deepEqual(data.carousel,previous.carousel,'carousel geometry changed');
            if(!dark)console.log('PASS '+width+'px: 3 statistics in one row, height '+Math.round(previous.height)+' -> '+Math.round(data.height)+'px');
        } else assert.deepEqual(data,previous,'tablet/desktop stats changed '+width);
        if(width===375||width===1440){const image=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(require('node:path').join(require('node:os').tmpdir(),'excabase-dashboard-stats-'+(dark?'dark':'light')+'-'+width+'.png'),Buffer.from(image.data,'base64'));}
    }
    assert.equal(await evaluate('JSON.stringify({...localStorage})'),original);
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS smartphone stats 3 columns; original tablet/desktop styles and carousel geometry; readable labels; unchanged numbers/storage; light/dark; no overflow');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
