/* Real browser integration audit; use a disposable browser profile, never production data.
   No external packages. For file:// runs, Chrome needs --allow-file-access-from-files. */
(async function () {
    'use strict';
    if(new URLSearchParams(location.search).get('run')!=='1')return;
    const output=document.getElementById('fvTestOutput'), frame=document.querySelector('iframe');
    const checks=[],errors=[];
    const assert=(condition,label)=>{if(!condition)throw new Error(label);checks.push(label);};
    const near=(a,b)=>Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a),Math.abs(b));
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const E=window.ExcabaseFleetEngine.Engine,D=window.ExcabaseFleetData;
    const make=overrides=>({volumeLCM:72,excavatorCount:1,truckCount:3,bucketCapacity:1.5,fillFactor:1,excavatorCycleSeconds:5,
        excavatorEfficiency:1,truckCapacity:6,truckEfficiency:1,loadedTravelSeconds:30,unloadSeconds:5,returnTravelSeconds:20,workingHours:8,...overrides});
    const snapshotStorage=storage=>Object.fromEntries(Array.from({length:storage.length},(_,i)=>{const key=storage.key(i);return [key,storage.getItem(key)];}));
    const localBefore=snapshotStorage(localStorage),sessionBefore=snapshotStorage(sessionStorage);
    const restore=(storage,before)=>{for(const key of Object.keys(snapshotStorage(storage)))if(!(key in before))storage.removeItem(key);for(const [key,value]of Object.entries(before))storage.setItem(key,value);};
    async function open(url){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Load timeout: '+url)),12000);frame.onload=()=>{clearTimeout(timer);resolve();};frame.src=new URL('../'+url,location.href).href;});await wait(100);const w=frame.contentWindow;w.addEventListener('error',event=>errors.push(event.message));return frame.contentDocument;}
    const read=()=>JSON.parse(localStorage.getItem('excabase_active_project'));
    const fixture=()=>{
        const p={id:'fv-audit',name:'Uji Fleet — <aman>',status:'aktif',workType:'Galian',soilVolumeBCM:288,targetDays:5,workHoursPerDay:8,
            results:{earthwork:{bcm:288,lcm:360,ccm:260},selectedEquipment:['Excavator','Dump Truck'],productivity:{excavator:{hourly:270,daily:2160,volumeBasis:'lcm'},dumptruck:{hourly:60,daily:480,volumeBasis:'lcm'}},
                productivityInputs:{excavator:{model:'custom',fields:{bucket:'1.5',fillFactor:'1',cycleTime:'20',efficiency:'1',workingHours:'8'}},dumptruck:{model:'custom',fields:{truckCapacity:'6',truckCycleTime:'6',truckEfficiency:'1',truckWorkingHours:'8'}}}}};
        p.results.estimate={equipment:[['excavator',2,270],['dumptruck',4,60]].map(([type,units,hourly])=>({type,units,hourlyProductivity:hourly,totalHourlyProductivity:units*hourly,dailyProductivity:units*hourly*8,volumeBasis:'lcm',workVolumeBasis:'lcm',workVolume:360,costPerHour:200000,totalHourlyCost:units*200000,durationHours:360/(units*hourly),durationDays:360/(units*hourly*8),totalOperatingCost:360/hourly*200000}))};return p;
    };
    const save=p=>{localStorage.setItem('excabase_active_project',JSON.stringify(p));localStorage.setItem('excabase_projects',JSON.stringify([p]));};
    try {
        output.textContent='RUNNING';
        // Pure engine: volume is only delivered at the end of unloading.
        const single=new E(make({volumeLCM:7,bucketCapacity:4,truckCount:1}));
        single.advance(5);assert(single.extracted===4&&single.delivered===0,'scoop is not counted as delivered');
        single.advance(5);assert(single.trucks[0].state==='hauling'&&single.trucks[0].load===6,'truck capacity limits the final bucket');
        single.advance(30);assert(single.trucks[0].state==='unloading'&&single.delivered===0,'arrival alone does not deliver material');
        single.advance(5);assert(single.delivered===6&&single.trucks[0].load===0,'material delivered once at unload completion');
        single.advance(10000);assert(single.finished&&single.delivered===7&&single.extracted===7,'partial final load completes exactly');
        assert(single.trucks[0].trips===2&&single.excavators[0].scoops===3,'no phantom full truck or extra material');
        single.reset();assert(single.time===0&&single.extracted===0&&single.delivered===0&&!single.finished,'reset restores initial mass and clock');
        for(const volumeLCM of [1,5.5,17,72])for(const excavatorCount of [1,2,5])for(const truckCount of [1,3]){
            const e=new E(make({volumeLCM,excavatorCount,truckCount}));
            for(let step=0;step<5000&&!e.finished;step++){
                const s=e.advance(1.3),onboard=e.trucks.reduce((sum,t)=>sum+t.load,0);
                assert(near(e.extracted,s.delivered+onboard),'mass balance '+volumeLCM+'/'+excavatorCount+'/'+truckCount+'/'+step);
                if(!(s.progress>=0&&s.progress<=100&&near(s.delivered+s.remaining,volumeLCM)))throw new Error('Volume overrun');
            }
            assert(e.finished&&near(e.delivered,volumeLCM),'finish all mass cases '+volumeLCM+'/'+excavatorCount+'/'+truckCount);
        }
        const a=new E(make()),b=new E(make());a.advance(200);for(let i=0;i<200;i++)b.advance(1);
        assert(JSON.stringify(a.snapshot())===JSON.stringify(b.snapshot()),'deterministic across frame partitions');
        const one=new E(make({truckCount:1})),many=new E(make({truckCount:4})),extraEx=new E(make({truckCount:4,excavatorCount:2}));
        for(const e of [one,many,extraEx])e.advance(100000);
        assert(many.time<one.time,'more trucks reduce loader idle time');assert(extraEx.time<many.time,'more excavators improve a loading bottleneck');
        const ineff=new E(make({excavatorEfficiency:.5,truckEfficiency:.5}));ineff.advance(100000);assert(ineff.time>a.time,'efficiency affects operation time');
        for(const bad of [{truckCount:0},{excavatorCount:1.5},{truckEfficiency:1.1},{volumeLCM:-1},{unloadSeconds:0},{excavatorCount:2000,truckCount:2}]){
            let thrown=false;try{new E(make(bad));}catch{thrown=true;}assert(thrown,'reject invalid config '+JSON.stringify(bad));
        }
        const project=fixture();save(project);sessionStorage.setItem('excabase_welcome_seen','true');
        const source=D.envelope(project,{dasar:{equipment:project.results.estimate.equipment}},'dasar');
        const ctx=D.context(source,project,'dasar');
        assert(ctx.excavatorCount===2&&ctx.truckCount===4&&ctx.volumeLCM===360,'adapter reads actual scenario counts and volume');
        assert(ctx.params.unloadMinutes.value===null,'missing unloading is not fabricated');
        const values=Object.fromEntries(Object.entries(ctx.params).map(([key,p])=>[key,p.value]));values.unloadMinutes=1;
        const cfg=D.config(ctx,values,'total');
        assert(near((cfg.loadedTravelSeconds+cfg.returnTravelSeconds)/60,6-4*20/60-1),'subtract existing loading and unloading once from total cycle');
        values.referenceQueueMinutes=.5;
        assert(near((D.config(ctx,values,'total').loadedTravelSeconds+D.config(ctx,values,'total').returnTravelSeconds)/60,6-4*20/60-1-.5),'remove embedded reference queue before modeling a new queue');
        let invalidTiming=false;try{D.config(ctx,{...values,totalCycleMinutes:1},'total');}catch{invalidTiming=true;}assert(invalidTiming,'reject negative residual travel');
        const converted=JSON.parse(JSON.stringify(source));converted.scenarios.dasar.equipment.forEach(item=>{item.workVolume=288;item.workVolumeBasis='bcm';});assert(D.context(converted,project,'dasar').volumeLCM===360,'BCM converted using actual earthwork ratio');
        let missingPair=false;try{D.context(D.envelope(project,{dasar:{equipment:[project.results.estimate.equipment[0]]}},'dasar'),project,'dasar');}catch{missingPair=true;}assert(missingPair,'missing equipment pair is explicit');
        let d=await open('pages/simulasi-armada.html?fromProject=1');
        assert(d.getElementById('visualizeFleetLink').getAttribute('aria-disabled')==='true','link unavailable before scenario results');
        d.getElementById('calculateFleetScenarioBtn').click();
        assert(d.getElementById('visualizeFleetLink').getAttribute('aria-disabled')==='false','link ready after calculation');
        const capture=()=>{const link=d.getElementById('visualizeFleetLink');link.addEventListener('click',e=>e.preventDefault(),{once:true});link.click();return JSON.parse(sessionStorage.getItem(D.SESSION_KEY));};
        const sources={};
        for(const [key,ex,tr]of [['dasar',2,4],['hemat',1,3],['cepat',3,5]]){
            const select=d.getElementById('fleetSelectedScenario');select.value=key;select.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));
            sources[key]=capture();const entries=sources[key].scenarios[key].equipment;
            assert(entries.find(x=>x.type==='excavator').units===ex&&entries.find(x=>x.type==='dumptruck').units===tr,'selected '+key+' transfers exact units');
        }
        const input=d.getElementById('fleet-cepat-dumptruck');input.value='7';input.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));
        assert(d.getElementById('visualizeFleetLink').getAttribute('aria-disabled')==='true','edited scenario cannot open stale visualization');
        d.getElementById('calculateFleetScenarioBtn').click();sources.cepat=capture();
        assert(sources.cepat.scenarios.cepat.equipment.find(x=>x.type==='dumptruck').units===7,'recalculated fleet change reaches visualization');
        assert(d.querySelector('.project-nav-next').href.includes('analisis-laporan.html'),'existing next workflow stage still points to report');
        d.getElementById('saveFleetScenarioBtn').click();sources.cepat=capture();
        assert(read().results.fleet.selectedScenario==='cepat'&&isExcabaseFleetCurrent(read()),'original scenario save still works');
        const savedResult=read().results.fleet.scenarios.cepat;
        for(const item of savedResult.equipment){const base=project.results.estimate.equipment.find(x=>x.type===item.type);assert(near(item.totalProductivity,item.units*base.hourlyProductivity)&&near(item.durationHours,base.workVolume/item.totalProductivity),'original scenario formulas remain unchanged '+item.type);}
        const projectBefore=JSON.stringify(read()),listBefore=localStorage.getItem('excabase_projects');
        sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(sources.cepat));
        d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=cepat');
        assert(d.getElementById('fvCounts').textContent==='3 / 7 unit','view loads selected scenario');
        assert(d.getElementById('fvPlay').disabled,'no autoplay or fabricated missing data');
        const apply=()=>{d.getElementById('fv-unloadMinutes').value='1';d.getElementById('fvForm').requestSubmit();};
        apply();assert(!d.getElementById('fvPlay').disabled,'validated parameters unlock Play');
        const w=()=>frame.contentWindow;
        const originalConfig=JSON.stringify(w().ExcabaseFleetView.getConfig());
        d.getElementById('fvPlay').click();await wait(650);d.getElementById('fvPause').click();
        const paused=w().ExcabaseFleetView.getState().time;assert(paused>0,'Play advances engine time');await wait(200);assert(w().ExcabaseFleetView.getState().time===paused,'Pause freezes engine time');
        for(const value of ['1','2','5','10']){d.getElementById('fvSpeed').value=value;d.getElementById('fvSpeed').dispatchEvent(new (w().Event)('change'));assert(JSON.stringify(w().ExcabaseFleetView.getConfig())===originalConfig,'speed '+value+' does not alter work parameters');}
        d.getElementById('fvPlay').click();await wait(650);d.getElementById('fvPause').click();assert(w().ExcabaseFleetView.getState().time-paused>paused*3,'10x increases playback rate');
        d.getElementById('fvReset').click();assert(w().ExcabaseFleetView.getState().time===0&&w().ExcabaseFleetView.getState().delivered===0,'UI Reset restores initial simulation');
        for(const [key,ex,tr]of [['dasar',2,4],['hemat',1,3],['cepat',3,7]]){
            d.getElementById('fvScenario').value=key;d.getElementById('fvScenario').dispatchEvent(new (w().Event)('change'));apply();const c=w().ExcabaseFleetView.getConfig();
            assert(c.excavatorCount===ex&&c.truckCount===tr,'view scenario switch '+key+' resets engine with correct units');
        }
        d.getElementById('fvTimingMode').value='segments';d.getElementById('fvTimingMode').dispatchEvent(new (w().Event)('change'));d.getElementById('fv-loadedTravelMinutes').value='2';d.getElementById('fv-returnTravelMinutes').value='3';apply();
        assert(w().ExcabaseFleetView.getConfig().loadedTravelSeconds===120&&w().ExcabaseFleetView.getConfig().returnTravelSeconds===180,'explicit travel mode does not reuse total cycle');
        // Short, explicitly entered test timings let real RAF exercise digging, haul and dump.
        d.getElementById('fv-excavatorCycleSeconds').value='.2';d.getElementById('fv-loadedTravelMinutes').value='.02';d.getElementById('fv-returnTravelMinutes').value='.02';d.getElementById('fv-unloadMinutes').value='.02';d.getElementById('fvForm').requestSubmit();
        const initialPixels=d.getElementById('fvCanvas').toDataURL();
        d.getElementById('fvPlay').click();await wait(750);d.getElementById('fvPause').click();
        const liveState=w().ExcabaseFleetView.getState();
        assert(liveState.extracted>0&&liveState.delivered>0&&liveState.progress<=100,'real-time engine digs, hauls and unloads under Play');
        assert(Object.values(liveState.counts).reduce((a,b)=>a+b,0)===7,'truck state counts conserve all selected units');
        assert(d.getElementById('fvCanvas').toDataURL()!==initialPixels,'canvas actually animates with engine progress');
        assert(d.getElementById('fvDelivered').textContent!=='0 m³','real-time delivered panel follows engine events');
        d.getElementById('fv-truckCapacity').value='5';d.getElementById('fv-truckCapacity').dispatchEvent(new (w().Event)('input',{bubbles:true}));
        assert(d.getElementById('fvPlay').disabled,'edited runtime parameters pause and require reapply');
        d.getElementById('fvForm').requestSubmit();
        assert(JSON.stringify(read())===projectBefore&&localStorage.getItem('excabase_projects')===listBefore,'visualization controls never mutate project or scenario records');
        for(const width of [360,390,768,1366,1920]){
            frame.style.width=width+'px';await wait(300);
            assert(d.documentElement.scrollWidth<=w().innerWidth,'no horizontal overflow '+width);
            for(const id of ['fvPlay','fvPause','fvReset','fvSpeed','fvApply']){const r=d.getElementById(id).getBoundingClientRect();assert(r.width>0&&r.height>=40&&r.right<=w().innerWidth,'touch control fits '+id+'/'+width);}
            const canvas=d.getElementById('fvCanvas');assert(canvas.width>0&&canvas.height>0,'canvas resizes '+width);
            if(width<=768){d.querySelector('.sidebar-shell-toggle').click();await wait(260);assert(d.body.dataset.sidebarOpen==='true','drawer opens '+width);d.querySelector('.sidebar-shell-close').click();await wait(260);assert(!d.querySelector('.sidebar-shell-content').inert,'drawer releases content '+width);}
        }
        d=await open('pages/analisis-laporan.html?fromProject=1');
        assert(d.getElementById('reportResultsTable').textContent.includes('Dump Truck'),'report still renders the saved equipment results');
        assert(JSON.stringify(read())===projectBefore,'report navigation preserves project results');
        sessionStorage.removeItem(D.SESSION_KEY);d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=hemat');apply();
        assert(frame.contentWindow.ExcabaseFleetView.getConfig().excavatorCount===1&&frame.contentWindow.ExcabaseFleetView.getConfig().truckCount===3,'direct reload can use matching saved scenario without handoff');
        // Completed projects remain inspectable; the visualization itself stays read-only.
        const complete={...fixture(),status:'selesai'};save(complete);sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(D.envelope(complete,sources.cepat.scenarios,'dasar')));
        d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar');apply();
        assert(!d.getElementById('fvPlay').disabled,'completed project can replay without editing project');
        const stale=JSON.parse(JSON.stringify(complete));stale.results.estimate.equipment[0].workVolume+=1;save(stale);d.getElementById('fvPlay').click();
        assert(!d.getElementById('fvError').hidden&&d.getElementById('fvPlay').disabled,'stale project blocks Play');
        sessionStorage.removeItem(D.SESSION_KEY);save(fixture());d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar');
        assert(!d.getElementById('fvError').hidden,'missing handoff has recovery message');
        assert(errors.length===0,'no browser errors: '+errors.join('; '));
        window.ExcabaseFleetTestPreview={project:JSON.parse(projectBefore),source:sources.cepat};
        output.textContent=JSON.stringify({passed:true,assertions:checks.length,widths:[360,390,768,1366,1920],lastChecks:checks.slice(-12)});
    } catch(error) {
        output.textContent=JSON.stringify({passed:false,assertions:checks.length,error:error.stack,lastChecks:checks.slice(-8),errors});
    } finally {
        restore(localStorage,localBefore);restore(sessionStorage,sessionBefore);
    }
})();
