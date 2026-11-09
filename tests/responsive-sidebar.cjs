// Isolated all-page responsive and native sidebar interaction audit.
const fs=require('node:fs');
const harness=fs.readFileSync(require('node:path').join(__dirname,'productivity.cjs'),'utf8');
const test=async function () {
    const sidebarPath=require('node:path');
    const project={id:617,name:'Responsive sidebar test',status:'selesai',soilType:'Tanah lempung',soilVolumeBCM:1000,workType:'Pemadatan Tanah',targetDays:10,workHoursPerDay:8,results:{earthwork:{bcm:1000,lcm:1250,ccm:900,material:'tanah-lempung',swellFactor:25,shrinkageFactor:10},selectedEquipment:['compactor'],recommendation:{equipment:'Compactor'},productivity:{compactor:{type:'compactor',hourly:300,daily:2400,volumeBasis:'ccm',model:'Test'}},estimate:{equipment:[{type:'compactor',units:1,hourlyProductivity:300,totalHourlyProductivity:300,dailyProductivity:2400,workVolumeBasis:'ccm',volumeBasis:'ccm',workVolume:900,costPerHour:250000,totalHourlyCost:250000,durationHours:3,durationDays:.375,totalOperatingCost:750000}]}}};
    async function dashboard() {
        await send('Page.navigate',{url:base+'/index.html'});
        for(let i=0;i<100;i++){await delay(40);if(await evaluate('location.pathname==="/index.html" && document.readyState==="complete"'))return;}
        throw Error('Dashboard timeout');
    }
    async function resize(width) {await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await delay(300);}
    const state=()=>evaluate('({mode:document.body.dataset.sidebarMode,open:document.body.dataset.sidebarOpen,toggleDisabled:document.querySelector(".sidebar-shell-toggle").disabled,expanded:document.querySelector(".sidebar-shell-toggle").getAttribute("aria-expanded")})');
    const toggle=()=>evaluate('document.querySelector(".sidebar-shell-toggle").click()');
    const close=()=>evaluate('document.querySelector(".sidebar-shell-close").click()');
    await send('Emulation.setFocusEmulationEnabled',{enabled:true});
    await dashboard();
    await evaluate('localStorage.clear();localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(project))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([project]))+')');
    const projectBefore=await evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])');
    async function screenshot(name) {await delay(270);const image=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(sidebarPath.join(require('node:os').tmpdir(),'excabase-sidebar-'+name+'.png'),Buffer.from(image.data,'base64'));}
    await resize(1440);await dashboard();
    assert.equal((await state()).open,'true');
    await screenshot('desktop-expanded');
    const expandedWidth=await evaluate('document.querySelector(".sidebar-shell-content").getBoundingClientRect().width');
    await toggle();await delay(270);
    assert.equal((await state()).open,'false');
    assert.equal(await evaluate('document.querySelector(".sidebar-shell-toggle").dataset.sidebarIcon'),'panel-left-open');
    assert.ok(await evaluate('document.querySelector(".sidebar-shell-toggle").getBoundingClientRect().right<=innerWidth'),'collapsed toggle outside viewport');
    await screenshot('desktop-collapsed');
    assert.ok(await evaluate('document.querySelector(".sidebar-shell-content").getBoundingClientRect().width')>expandedWidth+180);
    assert.equal(await evaluate('localStorage.getItem("excabase_sidebar_desktop")'),'closed');
    await open('katalog.html');assert.equal((await state()).open,'false');
    await resize(390);assert.equal((await state()).open,'false');
    const leftBefore=await evaluate('document.querySelector(".sidebar-shell-content").getBoundingClientRect().x');
    await toggle();assert.equal((await state()).open,'true');
    assert.equal(await evaluate('document.querySelector(".sidebar-shell-backdrop").hidden'),false);
    assert.equal(await evaluate('document.querySelector(".sidebar-shell-content").getBoundingClientRect().x'),leftBefore);
    assert.equal(await evaluate('document.querySelector(".sidebar-shell-content").inert'),true);
    assert.equal(await evaluate('getComputedStyle(document.documentElement).overflowY'),'hidden');
    await delay(270);
    assert.ok(await evaluate('(()=>{const w=document.querySelector(".sidebar").getBoundingClientRect().width;return w>=innerWidth*.8 && w<=320})()'));
    assert.equal(await evaluate('document.activeElement.className'),'sidebar-shell-close');
    await screenshot('mobile-drawer');
    const scrollBefore=await evaluate('scrollY');
    await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:350,y:500,deltaX:0,deltaY:200});await delay(50);
    assert.equal(await evaluate('scrollY'),scrollBefore,'background scrolled behind drawer');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
    assert.equal(await evaluate('document.activeElement.getAttribute("href")'),'pengaturan.html','Shift+Tab escaped drawer');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await evaluate('document.activeElement.className'),'sidebar-shell-close','Tab escaped drawer');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    assert.equal((await state()).open,'false');
    assert.equal(await evaluate('document.activeElement.className'),'sidebar-shell-toggle');
    await toggle();await evaluate('document.querySelector(".sidebar-shell-backdrop").click()');assert.equal((await state()).open,'false');
    await toggle();await close();assert.equal((await state()).open,'false');
    assert.equal(await evaluate('localStorage.getItem("excabase_sidebar_desktop")'),'closed','mobile changed desktop preference');
    await toggle();
    await evaluate('document.querySelector(".sidebar .menu a").click()');
    await delay(150);
    assert.equal(await evaluate('location.pathname'),'/index.html');assert.equal((await state()).open,'false');
    await resize(1440);assert.equal((await state()).open,'false');await toggle();assert.equal((await state()).open,'true');
    await resize(768);assert.equal((await state()).open,'false','desktop preference opened mobile drawer');
    await resize(1440);assert.equal((await state()).open,'true');
    const pages=['../index.html',...fs.readdirSync(sidebarPath.join(root,'pages')).filter(file=>file.endsWith('.html')),
        ...['kalkulator-volume-tanah','rekomendasi','produktivitas','estimasi-proyek','simulasi-armada','analisis-laporan'].map(name=>name+'.html?fromProject=1')];
    const overflows=[];
    for(const theme of ['light','dark']) {
        await evaluate('localStorage.setItem("excabaseTheme",'+JSON.stringify(theme)+')');
        for(const width of [320,375,390,768,1024,1440]) {
            await resize(width);
            for(const page of pages) {
                if(page==='../index.html')await dashboard();else await open(page);
                assert.equal(await evaluate('document.querySelectorAll(".sidebar").length'),1,page);
                assert.equal(await evaluate('document.querySelectorAll(".sidebar-shell-toggle").length'),1,page);
                const toggleLayout=await evaluate(`(()=>{const button=document.querySelector('.sidebar-shell-toggle'),toolbar=button.parentElement,header=document.querySelector('.sidebar-shell-header'),b=button.getBoundingClientRect(),h=header.getBoundingClientRect();const overlap=[...header.querySelectorAll('h1, p, .profile')].some(el=>{const r=el.getBoundingClientRect();return Math.min(b.right,r.right)>Math.max(b.left,r.left)+1 && Math.min(b.bottom,r.bottom)>Math.max(b.top,r.top)+1});return {integrated:toolbar.parentElement===header,navigationHost:toolbar.parentElement.classList.contains("sidebar-shell-mobile-navigation"),bottom:b.bottom,edgeHost:toolbar.parentElement===document.querySelector(".sidebar"),icon:button.dataset.sidebarIcon,left:b.left,titleLeft:header.querySelector('h1').getBoundingClientRect().left,titleCenter:(header.querySelector('h1').getBoundingClientRect().top+header.querySelector('h1').getBoundingClientRect().bottom)/2,buttonCenter:(b.top+b.bottom)/2,sidebarRight:document.querySelector('.sidebar').getBoundingClientRect().right,text:button.textContent.trim(),width:b.width,height:b.height,right:b.right,headerRight:h.right,top:b.top,headerTop:h.top,overlap,margin:getComputedStyle(toolbar).margin,position:getComputedStyle(toolbar).position}})()`);
                if(width<=1024){assert.equal(toggleLayout.integrated,false,page+' toggle still attached to title');assert.equal(toggleLayout.navigationHost,true,page+' mobile navigation host');assert.equal(toggleLayout.icon,'menu');assert.ok(toggleLayout.bottom<=toggleLayout.headerTop,page+' navigation overlaps title');}else{assert.equal(toggleLayout.edgeHost,true,page+' desktop clipping host');assert.ok(toggleLayout.left>0 && toggleLayout.right<toggleLayout.sidebarRight,page+' not inside sidebar');assert.equal(toggleLayout.icon,'panel-left-close');}
                assert.equal(toggleLayout.text,'',page+' toggle text');
                assert.equal(toggleLayout.width,40);assert.equal(toggleLayout.height,40);
                assert.equal(toggleLayout.overlap,false,page+' toggle overlaps header content');
                assert.ok(toggleLayout.right<=toggleLayout.headerRight+1,page+' toggle outside header');
                if(width<=1024)assert.ok(toggleLayout.top>=0,page+' mobile toggle outside viewport');
                assert.equal(toggleLayout.margin,'0px');assert.equal(toggleLayout.position,width<=1024?'static':'absolute');
                assert.equal((await state()).toggleDisabled,false,'navigation disabled for completed project '+page);
                assert.equal((await state()).mode,width<=1024?'drawer':'desktop');
                assert.equal((await state()).open,width<=1024?'false':'true');
                const sizes=await evaluate('({scroll:document.documentElement.scrollWidth,width:innerWidth})');
                if(sizes.scroll>sizes.width+1)overflows.push(theme+'/'+width+'/'+page+' '+sizes.scroll);
                if(theme==='dark' && width===390 && page==='produktivitas-compactor.html')await screenshot('mobile-calculator-dark');
                if(width===1440) {
                    await toggle();await delay(260);
                    assert.deepEqual(await evaluate(`(()=>{const s=document.querySelector('.sidebar');return {width:s.getBoundingClientRect().width,inert:s.inert,hidden:s.getAttribute('aria-hidden'),labels:[...s.querySelectorAll('.sidebar-menu-label')].every(el=>getComputedStyle(el).display==='none'),links:[...s.querySelectorAll('.menu a')].every(el=>el.getBoundingClientRect().width>0)}})()`),{width:68,inert:false,hidden:'false',labels:true,links:true},page+' mini');
                    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),page+' mini overflow');
                    await evaluate('document.querySelector(".sidebar .menu a").focus()');
                    assert.equal(await evaluate('document.querySelector(".sidebar-shell-tooltip").hidden'),false,page+' keyboard tooltip '+JSON.stringify(await evaluate('({active:document.activeElement.outerHTML,mode:document.body.dataset.sidebarMode,open:document.body.dataset.sidebarOpen,tooltip:document.querySelector(".sidebar-shell-tooltip").outerHTML})')));
                    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
                    assert.equal(await evaluate('document.querySelector(".sidebar-shell-tooltip").hidden'),true);
                    await toggle();await delay(260);
                }
                if(theme==='light' && [375,390].includes(width) && page==='../index.html') {
                    await screenshot('navigation-'+width+'-closed');
                    await toggle();await screenshot('navigation-'+width+'-open');
                    await close();await delay(270);
                }
                const isProject=page.includes('fromProject=1');
                if(isProject)assert.ok(await evaluate('document.querySelector(".sidebar .menu").textContent.includes("TAHAPAN PROYEK")'),page);
                else assert.ok(await evaluate('document.querySelector(".sidebar .menu").textContent.includes("PERHITUNGAN MANDIRI")'),page);
            }
        }
    }
    assert.deepEqual(overflows,[],'page overflow');
    await open('estimasi-proyek.html');
    const estimateTools=['excavator','dumptruck','compactor'];
    await evaluate(`(()=>{for(const type of ${JSON.stringify(estimateTools)}){const choice=document.querySelector('[data-equipment="'+type+'"]');choice.checked=true;choice.dispatchEvent(new Event('change',{bubbles:true}));for(const [key,value] of Object.entries({volume:'2400',productivity:'100',rate:'200000',target:'2',units:'3'})){const input=document.querySelector('[data-type="'+type+'"][data-field="'+key+'"]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}}document.getElementById('standaloneEstimateForm').requestSubmit()})()`);
    assert.deepEqual(await evaluate('(()=>{const r=JSON.parse(localStorage.getItem("excabase_standalone_estimate")).calculated;return [r.totalUnits,r.totalCost]})()'),[6,14400000]);
    for(const width of [320,375,390,768,1024,1440]) {
        await resize(width);await delay(270);
        assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'populated standalone estimate overflow '+width);
        assert.equal(await evaluate('document.querySelectorAll("[data-card]:not([hidden])").length'),3);
    }
    await evaluate('const mode=document.getElementById("estimateMode");mode.value="units";mode.dispatchEvent(new Event("change",{bubbles:true}));document.getElementById("standaloneEstimateForm").requestSubmit()');
    assert.deepEqual(await evaluate('(()=>{const r=JSON.parse(localStorage.getItem("excabase_standalone_estimate")).calculated;return [r.totalUnits,r.totalCost]})()'),[9,14400000]);
    await resize(390);await open('kalkulator-volume-tanah.html?fromProject=1');
    assert.equal(await evaluate('document.getElementById("calculateEarthworkBtn").disabled'),true);
    await toggle();assert.equal((await state()).open,'true');await close();
    await open('analisis-laporan.html?fromProject=1');
    await send('Emulation.setEmulatedMedia',{media:'print'});
    for(const selector of ['.sidebar','.sidebar-shell-toolbar','.sidebar-shell-backdrop'])assert.equal(await evaluate(`getComputedStyle(document.querySelector('${selector}')).display`),'none');
    const pdf=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});assert.ok(Buffer.from(pdf.data,'base64').subarray(0,4).toString()==='%PDF');
    await send('Emulation.setEmulatedMedia',{media:'',features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".sidebar")).transitionDuration'),'0s');
    assert.equal(await evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])'),projectBefore,'project data changed');
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS desktop persistence/expansion; drawer overlay/Escape/X/menu close/inert/scroll lock; responsive '+pages.length*12+' page cases; project/standalone menus; completed lock; PDF; reduced motion; project data unchanged');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
