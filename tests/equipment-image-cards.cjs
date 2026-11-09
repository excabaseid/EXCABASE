// Isolated browser checks for the two opt-in card grids and their original links.
const fs = require('node:fs');
const harness = fs.readFileSync(require('node:path').join(__dirname,'productivity.cjs'),'utf8');
const test = async function () {
    const types=['excavator','bulldozer','dumptruck','wheelloader','motorgrader','compactor'];
    const sentinel={id:809,name:'Image-card regression',status:'aktif',results:{recommendation:{equipment:'Excavator'},keep:'unchanged'}};
    await open('katalog.html');
    await evaluate('localStorage.clear();localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(sentinel))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([sentinel]))+')');
    const projectBytes=()=>evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])');
    const before=await projectBytes();
    for(const page of ['katalog.html','produktivitas.html']) {
        for(const theme of ['light','dark']) {
            await evaluate('localStorage.setItem("excabaseTheme",'+JSON.stringify(theme)+')');
            for(const width of [1440,1280,1024,768,430,390,375,320]) {
                await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
                await open(page);
                assert.equal(await evaluate('document.documentElement.classList.contains("excabase-dark")'),theme==='dark');
                const rows=await evaluate(`(async()=>{const cards=[...document.querySelectorAll('.equipment-image-card')];return await Promise.all(cards.map(async card=>{const s=getComputedStyle(card),h=getComputedStyle(card.querySelector('h3'));const match=s.backgroundImage.match(/url\\("?([^"\\)]+)"?\\)/);const image=new Image();image.src=match?.[1]||'';let loaded=true;try{await image.decode()}catch{loaded=false}return {image:image.src,loaded,gradient:s.backgroundImage,cover:s.backgroundSize,titleSize:h.fontSize,titleWeight:h.fontWeight,titleColor:h.color,height:card.getBoundingClientRect().height,first:card.firstElementChild.tagName,imgCount:card.querySelectorAll('img').length,modelCount:card.querySelectorAll('.catalog-models li').length,overflow:card.scrollWidth>card.clientWidth,rect:{left:card.getBoundingClientRect().left,right:card.getBoundingClientRect().right},gridColumn:s.gridColumn}}))})()`);
                assert.equal(rows.length,page==='katalog.html'?6:7);
                assert.equal(new Set(rows.map(r=>r.titleSize+' '+r.titleWeight)).size,1);
                for(const row of rows) {
                    assert.ok(row.loaded,row.image);
                    if(row.image.includes('/assets/bulldozer-'))assert.ok(row.image.endsWith('/assets/bulldozer-2.jpg'));
                    assert.equal(row.first,'H3'); assert.equal(row.imgCount,0); assert.ok(row.cover.split(',').every(v=>v.trim()==='cover'));
                    const stops = page==='katalog.html' ? ['0.99) 0%', '0.96) 40%', '0.82) 65%', '0.25) 100%'] : ['0.99) 0%', '0.9) 30%', '0.65) 60%', '0.2) 100%'];
                    assert.ok(stops.every(stop=>row.gradient.includes(stop)),row.gradient);
                    assert.equal(row.overflow,false);
                    assert.equal(row.titleColor,theme==='dark'?'rgb(241, 246, 252)':'rgb(23, 50, 77)');
                    if(page==='katalog.html')assert.equal(row.modelCount,3);
                }
                assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,page+' '+theme+' '+width);
                if(width>=1280)assert.equal(await evaluate('getComputedStyle(document.querySelector(".equipment-grid")).gridTemplateColumns.split(" ").length'),3);
                if(page==='produktivitas.html' && [768,1024].includes(width))assert.equal(await evaluate('getComputedStyle(document.querySelector(".equipment-grid")).gridTemplateColumns.split(" ").length'),2);
                if(width<=430) {
                    assert.deepEqual(await evaluate(`(()=>{const g=document.querySelector('.equipment-grid'), cards=[...g.children].slice(0,6), r=cards.map(c=>c.getBoundingClientRect());return {columns:getComputedStyle(g).gridTemplateColumns.split(' ').length,rows:new Set(r.map(v=>v.top)).size}})()`),page==='katalog.html'?{columns:2,rows:3}:{columns:1,rows:6},page+' '+width);
                }
                if(page==='produktivitas.html') {
                    const last=rows.at(-1);
                    assert.ok(last.image.endsWith('/assets/proyek.jpg'));
                    assert.ok(last.gridColumn.includes('-1'));
                    const grid=await evaluate('(()=>{const r=document.getElementById("productivityEquipmentGrid").getBoundingClientRect();return {left:r.left,right:r.right}})()');
                    assert.ok(Math.abs(last.rect.left-grid.left)<1 && Math.abs(last.rect.right-grid.right)<1);
                }
                if((width===1440)||(width===390&&theme==='dark')) {
                    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
                    const filename=require('node:path').join(require('node:os').tmpdir(),`excabase-cards-${page.split('.')[0]}-${theme}-${width}.png`);
                    fs.writeFileSync(filename,Buffer.from(shot.data,'base64'));
                    console.log('Preview '+filename);
                }
            }
        }
    }
    await send('Emulation.clearDeviceMetricsOverride');
    await open('katalog.html');
    for(const type of types) {
        assert.equal(await evaluate(`document.querySelector('.equipment-card--${type}').style.display`),'');
        assert.ok(await evaluate(`getComputedStyle(document.querySelector('.equipment-card--${type}')).backgroundImage.includes('/assets/${type}-${type==='bulldozer'?2:1}.jpg')`));
        assert.deepEqual(await evaluate(`(()=>{const expected=equipmentData.find(v=>v.id==='${type}').models.slice(0,3).map(m=>m.manufacturer+' '+m.model);const actual=[...document.querySelectorAll('.equipment-card--${type} li')].map(el=>el.textContent);return {expected,actual}})()` ).then(v=>v.actual),await evaluate(`equipmentData.find(v=>v.id==='${type}').models.slice(0,3).map(m=>m.manufacturer+' '+m.model)`));
        await evaluate(`document.querySelector('.equipment-card--${type} a').click()`);
        await delay(100);
        assert.equal(await evaluate('location.pathname'),'/pages/detail-'+type+'.html');
        await open('katalog.html');
    }
    await evaluate('document.getElementById("equipmentSearch").value="Excavator";document.getElementById("equipmentSearch").dispatchEvent(new Event("input"))');
    assert.equal(await evaluate('document.querySelectorAll(".equipment-image-card").length'),1);
    for(const type of [...types,'kombinasi']) {
        await open('produktivitas.html');
        await evaluate(`document.querySelector('[href="produktivitas-${type}.html"]').click()`);
        await delay(100);
        assert.equal(await evaluate('location.pathname'),'/pages/produktivitas-'+type+'.html');
        if(type!=='kombinasi')assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'),1);
    }
    await open('produktivitas.html?fromProject=1');
    assert.equal(await evaluate('getComputedStyle(document.getElementById("productivityEquipmentGrid")).display'),'none');
    assert.equal(await evaluate('document.querySelectorAll("#projectCalculatorList .equipment-image-card").length'),0);
    await open('produktivitas.html');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".equipment-image-card")).transitionDuration'),'0s');
    assert.equal(await projectBytes(),before,'card redesign changed project data');
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS 7 actual JPGs; shared full-card gradients; model text; all 13 original destinations; filter; light/dark; 1440/1024/768/390/320px without overflow; full-width combination; reduced motion; project isolation');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
