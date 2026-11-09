// Extend the isolated carousel suite with native mobile input and WheelEvents.
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'dashboard-carousel.cjs'),'utf8');
const gestures=async function () {
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});
    await send('Emulation.setTouchEmulationEnabled',{enabled:true});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await delay(50);
    await evaluate('window.scrollTo(0,0);document.activeElement.blur()');
    const heroBox=()=>evaluate('(()=>{const r=document.getElementById("dashboardHero").getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width,height:r.height}})()');
    async function swipe(dx,dy=0) {
        await evaluate('window.scrollTo(0,0)');await delay(50);
        const box=await heroBox(),x=dx<0?box.right-35:box.left+35,y=box.top+box.height*.40;
        const start=await index();
        await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
        for(let step=1;step<=5;step++) {
            await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step/5,y:y+dy*step/5,id:1}]});
            await delay(20);
            assert.equal(await index(),start,'more than one switch within an unfinished gesture');
        }
        await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(60);
    }
    const originalSlide=await index();
    const timerBeforeSwipe=await evaluate('[...__heroTimers.keys()][0]');
    await swipe(-120,4);assert.equal(await index(),(originalSlide+1)%4,'native left swipe');
    assert.equal(await timers(),1,'touch-generated hover or focus blocked autoplay');
    assert.notEqual(await evaluate('[...__heroTimers.keys()][0]'),timerBeforeSwipe,'swipe did not restart timer');
    await swipe(120,4);assert.equal(await index(),originalSlide,'native right swipe');
    await swipe(-25,2);assert.equal(await index(),originalSlide,'small touch changed slide');
    await swipe(0,-130);await delay(150);
    assert.equal(await index(),originalSlide,'vertical mobile scroll changed slide');
    assert.ok(await evaluate('scrollY>0'),'native vertical page scroll was blocked');
    await evaluate('window.scrollTo(0,0)');await delay(150);
    // Tap a real indicator: gesture handling must not swallow its click.
    await delay(450);
    const tap=await evaluate('(()=>{const r=document.querySelector("[data-hero-dot=\\"0\\"]").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...tap,id:2}]});
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(50);
    assert.equal(await index(),0,'touch tap indicator failed');
    assert.equal(await timers(),1,'touch tap blocked autoplay');
    await send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await evaluate('window.scrollTo(0,0)');await delay(30);
    const wheelEvent=async (dx,dy=0,extra={})=>evaluate(`(()=>{const e=new WheelEvent('wheel',{deltaX:${dx},deltaY:${dy},bubbles:true,cancelable:true,...${JSON.stringify(extra)}});document.getElementById('dashboardHero').dispatchEvent(e);return e.defaultPrevented})()`);
    assert.equal(await wheelEvent(20),true);assert.equal(await index(),0);
    await wheelEvent(20);assert.equal(await index(),0);
    await wheelEvent(20);assert.equal(await index(),1,'horizontal delta accumulation failed');
    for(let i=0;i<20;i++)await wheelEvent(100);
    assert.equal(await index(),1,'momentum burst skipped slides');
    await delay(650);
    await wheelEvent(-70);assert.equal(await index(),0,'reverse touchpad gesture failed');
    assert.equal(await wheelEvent(10,130),false);assert.equal(await index(),0);
    assert.equal(await wheelEvent(150,0,{ctrlKey:true}),false);assert.equal(await index(),0);
    assert.equal(await wheelEvent(150,0,{metaKey:true}),false);assert.equal(await index(),0);
    await evaluate('document.body.dispatchEvent(new WheelEvent("wheel",{deltaX:200,bubbles:true,cancelable:true}))');
    assert.equal(await index(),0,'wheel outside hero changed slides');
    await delay(650);
    await wheelEvent(4,0,{deltaMode:1});assert.equal(await index(),1,'line-mode wheel units not normalized');
    const desktopBox=await heroBox();
    await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:desktopBox.left+50,y:desktopBox.top+70,deltaX:0,deltaY:160});
    await delay(100);assert.ok(await evaluate('scrollY>0'),'vertical trackpad scroll blocked');
    assert.equal(await index(),1);
    await evaluate('window.scrollTo(0,0)');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    for(let i=0;i<100 && await timers()!==0;i++)await delay(20);
    assert.equal(await timers(),0);
    await delay(650);await wheelEvent(70);assert.equal(await index(),2,'reduced-motion manual wheel unavailable');
    console.log('PASS native touch swipe/tap/vertical scroll; 60px threshold; one switch per gesture; timer recovery; horizontal WheelEvent accumulation/direction/momentum latch/cooldown; vertical/Ctrl/Meta/outside-hero bypass; line-mode delta; reduced-motion manual gestures');
};
const body=gestures.toString();
const anchor='    const urls=';
if(!source.includes(anchor))throw Error('Carousel suite anchor missing');
eval(source.replace(anchor,body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+'\n'+anchor));
