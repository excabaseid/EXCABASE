// Native browser interaction, real six-second autoplay, then controlled timer checks.
const fs=require('node:fs');
const harness=fs.readFileSync(require('node:path').join(__dirname,'productivity.cjs'),'utf8');
const test=async function () {
    await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const nativeSet=window.setTimeout.bind(window),nativeClear=window.clearTimeout.bind(window);const timers=new Map();window.__heroTimers=timers;window.setTimeout=(callback,delay,...args)=>{let id;id=nativeSet(()=>{timers.delete(id);callback(...args)},delay);if(delay===6000)timers.set(id,()=>callback(...args));return id};window.clearTimeout=id=>{timers.delete(id);nativeClear(id)};window.__advanceHero=()=>{for(const [id,callback] of [...timers]){window.clearTimeout(id);callback()}}})()`});
    async function dashboard() {
        await send('Page.navigate',{url:base+'/index.html'});
        for(let i=0;i<100;i++){await delay(40);if(await evaluate('location.pathname==="/index.html" && document.readyState==="complete"'))return;}
        throw Error('Dashboard load timeout');
    }
    const index=()=>evaluate('[...document.querySelectorAll(".hero-carousel-slide")].findIndex(el=>el.classList.contains("is-active"))');
    const timers=()=>evaluate('__heroTimers.size');
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await dashboard();
    const fixture=[{id:'A',name:'A',status:'aktif',createdAt:'2024-01-01T00:00:00Z',results:{}},{id:'B',name:'B',status:'selesai',createdAt:'2025-01-01T00:00:00Z',results:{}},{id:'C',name:'C',status:'aktif',createdAt:'2023-01-01T00:00:00Z',results:{}}];
    await evaluate('localStorage.clear();localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify(fixture))+');localStorage.setItem("excabase_project_access",JSON.stringify({A:Date.now()-2000,B:Date.now()-1000}));localStorage.setItem("excabaseTheme","light");localStorage.setItem("excabaseAdminName","Carousel Tester")');
    await dashboard();
    const storage=await evaluate('JSON.stringify({...localStorage})');
    assert.equal(await index(),0);assert.equal(await timers(),1);
    await delay(6250);
    assert.equal(await index(),1,'native six-second autoplay failed');
    assert.equal(await timers(),1);
    await evaluate('__advanceHero();__advanceHero();__advanceHero()');
    assert.equal(await index(),0,'4-to-1 loop failed');
    for(let i=0;i<4;i++) {
        await evaluate(`document.querySelector('[data-hero-dot="${i}"]').click()`);
        assert.equal(await index(),i);
        assert.equal(await evaluate('document.querySelectorAll("[data-hero-dot][aria-current=true]").length'),1);
        assert.equal(await evaluate(`document.querySelectorAll('.hero-carousel-slide:not(.is-active) a:not([tabindex="-1"])').length`),0);
        assert.equal(await evaluate('document.querySelectorAll(".hero-carousel-slide:not(.is-active)[inert][aria-hidden=true]").length'),3);
        assert.equal(await timers(),1,'manual action created duplicate timers');
    }
    await evaluate('document.querySelector("[data-hero-next]").click()');assert.equal(await index(),0);
    await evaluate('document.querySelector("[data-hero-prev]").click()');assert.equal(await index(),3);
    // Hover pauses; leaving restarts a fresh six-second timer.
    const rect=await evaluate('(()=>{const r=document.getElementById("dashboardHero").getBoundingClientRect();return {x:r.x+20,y:r.y+20}})()');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x,y:rect.y});
    assert.equal(await timers(),0);await evaluate('__advanceHero()');assert.equal(await index(),3);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});assert.equal(await timers(),1);
    // Mouse clicks leave focus on the arrow: leaving the banner must still resume autoplay.
    const arrowPoint=await evaluate('(()=>{const r=document.querySelector("[data-hero-next]").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...arrowPoint});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...arrowPoint});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...arrowPoint});
    assert.equal(await index(),0);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
    assert.equal(await timers(),1,'mouse focus on carousel arrow blocked autoplay after mouseleave');
    await evaluate(`document.querySelector('[data-hero-dot="3"]').click()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    // Real keyboard activation and focus pause.
    await evaluate('document.querySelector("[data-hero-next]").focus()');assert.equal(await timers(),0);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    assert.equal(await index(),0);
    await evaluate('document.activeElement.blur()');await delay(10);assert.equal(await timers(),1);
    assert.equal(await evaluate('document.querySelector("[data-hero-pause]")'),null);
    await evaluate('window.__hidden=true;Object.defineProperty(document,"hidden",{configurable:true,get:()=>window.__hidden});document.dispatchEvent(new Event("visibilitychange"))');assert.equal(await timers(),0);
    await evaluate('window.__hidden=false;document.dispatchEvent(new Event("visibilitychange"))');assert.equal(await timers(),1);
    await evaluate('window.dispatchEvent(new Event("pageshow"));window.dispatchEvent(new Event("pageshow"))');assert.equal(await timers(),1);
    await evaluate(fs.readFileSync(require('node:path').join(root,'js/dashboard-carousel.js'),'utf8'));
    await evaluate('document.querySelector("[data-hero-next]").click()');assert.equal(await index(),1,'duplicate event handler');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(50);
    assert.equal(await timers(),0);assert.equal(await evaluate('getComputedStyle(document.querySelector(".hero-carousel-slide")).transitionDuration'),'0s');
    assert.equal(await evaluate('document.querySelector("[data-hero-pause]")'),null);
    const urls=['pages/buat-proyek.html','pages/katalog.html','pages/produktivitas.html','pages/estimasi-proyek.html'];
    const images=['excavator.jpg','hero-katalog.jpg','hero-produktivitas.jpg','hero-estimasi.jpg'];
    for(const theme of ['light','dark']) {
        await evaluate('localStorage.setItem("excabaseTheme",'+JSON.stringify(theme)+');applyExcabasePreferences()');
        for(const width of [1440,1024,768,390,320]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
            await evaluate('window.scrollTo(0,0)');
            const heights=[];
            for(let i=0;i<4;i++) {
                await evaluate(`document.querySelector('[data-hero-dot="${i}"]').click()`);
                const data=await evaluate(`(async()=>{const hero=document.getElementById('dashboardHero'),slide=hero.querySelector('.is-active'),control=hero.querySelector('.hero-carousel-controls'),button=slide.querySelector('a'),s=getComputedStyle(slide);const src=s.backgroundImage.match(/url\\("?([^"\\)]+)"?\\)/)[1];const image=new Image();image.src=src;await image.decode();const r=hero.getBoundingClientRect(),b=button.getBoundingClientRect(),c=control.getBoundingClientRect();return {src,href:button.getAttribute('href'),cover:s.backgroundSize,radius:getComputedStyle(hero).borderRadius,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth,overlap:b.bottom>c.top,color:getComputedStyle(slide.querySelector('h2 span')).color,buttonColor:getComputedStyle(button).color}})()`);
                assert.ok(new URL(data.src).pathname.endsWith('/assets/'+images[i]));
                if(i>=2)assert.equal(new URL(data.src).searchParams.get('v'),require('node:crypto').createHash('sha256').update(fs.readFileSync(require('node:path').join(root,'assets',images[i]))).digest('hex').slice(0,12));assert.equal(data.href,urls[i]);
                assert.ok(data.cover.split(',').every(v=>v.trim()==='cover'));assert.equal(data.radius,'18px');
                assert.equal(data.overflow,false,theme+' '+width);assert.equal(data.overlap,false,'controls overlap CTA '+width);
                assert.equal(data.color,'rgb(255, 200, 61)');assert.equal(data.buttonColor,'rgb(20, 43, 59)');
                heights.push(data.height);
                if(width===1440||width===390){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(require('node:path').join(require('node:os').tmpdir(),`excabase-carousel-${theme}-${width}-${i+1}.png`),Buffer.from(shot.data,'base64'));}
            }
            assert.equal(new Set(heights).size,1,'banner height changes between slides');
            if(width>=1024) {
                const oldHeight=await evaluate(`(()=>{const hero=document.getElementById('dashboardHero'),old=document.createElement('section');old.className='dashboard-hero';old.innerHTML=hero.querySelector('.hero-carousel-slide').innerHTML;old.style.cssText='position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:'+hero.getBoundingClientRect().width+'px';document.body.append(old);const height=old.getBoundingClientRect().height;old.remove();return height})()`);
                assert.ok(Math.abs(oldHeight-heights[0])<1,'desktop hero dimensions changed: '+oldHeight+' -> '+heights[0]);
            }
        }
    }
    await evaluate('localStorage.setItem("excabaseTheme","light");applyExcabasePreferences()');
    assert.equal(await evaluate('JSON.stringify({...localStorage})'),storage,'carousel changed storage');
    assert.equal(await evaluate('document.getElementById("totalProjects").textContent'),'3');
    assert.equal(await evaluate('document.getElementById("completedProjects").textContent'),'1');
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".dashboard-live-project h4")].map(el=>el.textContent)'),['B','A']);
    assert.equal(await evaluate('document.querySelector("h1").textContent'),'Beranda');
    assert.equal(await evaluate('document.querySelector(".profile").textContent'),'Carousel Tester');
    for(let i=0;i<4;i++) {
        await dashboard();assert.equal(await index(),0);
        await evaluate(`document.querySelector('[data-hero-dot="${i}"]').click();document.querySelector('.hero-carousel-slide.is-active a').click()`);
        await delay(150);assert.equal(await evaluate('location.pathname'),'/'+urls[i]);
        assert.equal(await evaluate('location.search'),'');
    }
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS four local images; original desktop hero dimensions; stable slide height; real 6s autoplay; loop/arrows/dots; timer reset/single initialization; mouse focus recovery/hover/keyboard focus/hidden tab/reduced motion/no pause button; keyboard; four correct destinations; light/dark 320-1440px; no overlap/overflow; stats/recency/name/title/storage unchanged');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
