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
        // Exercise the real producer and link, not snapshots assembled by the test.
        for(const extraTypes of [[],['bulldozer']]){
            const actualInput=fixture();
            for(const type of extraTypes){
                actualInput.results.selectedEquipment.push('Bulldozer');
                actualInput.results.productivity[type]={hourly:100,daily:800,volumeBasis:'lcm'};
                actualInput.results.productivityInputs.bulldozer={fields:{dozerCycleTime:'60',dozerEfficiency:'.8'}};
                actualInput.results.estimate.equipment.splice(1,0,{...actualInput.results.estimate.equipment[0],type,units:3,hourlyProductivity:100,totalHourlyProductivity:300,dailyProductivity:2400});
            }
            save(actualInput);
            let producer=await open('pages/simulasi-armada.html?fromProject=1');
            producer.getElementById('calculateFleetScenarioBtn').click();
            const generated={};
            for(const key of ['dasar','hemat','cepat']){
                producer.getElementById('fleetSelectedScenario').value=key;
                producer.getElementById('fleetSelectedScenario').dispatchEvent(new frame.contentWindow.Event('change'));
                const oldHandoff=D.envelope(actualInput,{[key]:{equipment:[{type:'bulldozer',units:1}]}},key);
                producer.dispatchEvent(new frame.contentWindow.CustomEvent('excabase:fleet-visualization',{detail:oldHandoff}));
                const link=producer.getElementById('visualizeFleetLink');link.addEventListener('click',event=>event.preventDefault(),{once:true});link.click();
                generated[key]={source:JSON.parse(sessionStorage.getItem(D.SESSION_KEY)),url:link.getAttribute('href')};
                assert(generated[key].source.handoffId!==oldHandoff.handoffId,'navigation refreshes stale cached handoff '+key+'/'+extraTypes);
                assert(new URL(link.href).searchParams.get('handoff')===generated[key].source.handoffId,'link identifies exact generated snapshot '+key+'/'+extraTypes);
                assert(generated[key].source.scenarios[key].equipment.map(item=>item.type).join(',')===actualInput.results.estimate.equipment.map(item=>item.type).join(','),'real producer retains all rows '+key+'/'+extraTypes);
            }
            const unchanged=localStorage.getItem('excabase_active_project'),unchangedList=localStorage.getItem('excabase_projects');
            for(const key of ['dasar','hemat','cepat']){
                sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(generated[key].source));
                const viewDoc=await open('pages/'+generated[key].url),viewWindow=frame.contentWindow;
                const expected=D.context(generated[key].source,actualInput,key);
                assert(viewDoc.getElementById('fvError').hidden,'real handoff initializes '+key+'/'+extraTypes);
                const diagnostic=viewWindow.ExcabaseFleetView.getDiagnostics();
                assert(diagnostic.handoffMatches===true&&diagnostic.fingerprintMatches===true&&diagnostic.snapshot[key].rows.length===actualInput.results.estimate.equipment.length,'real handoff diagnostics match producer '+key+'/'+extraTypes);
                assert(!JSON.stringify(diagnostic).includes(actualInput.id)&&!('fingerprint' in diagnostic),'diagnostics omit project identity and raw fingerprint');
                assert(viewDoc.getElementById('fvScenarioName').textContent===D.names[key]&&viewDoc.getElementById('fvCounts').textContent===expected.excavatorCount+' / '+expected.truckCount+' unit'&&viewDoc.getElementById('fvTotal').textContent.includes('360'),'real handoff reads scenario counts volume '+key+'/'+extraTypes);
                viewDoc.getElementById('fv-unloadMinutes').value='1';viewDoc.getElementById('fvForm').requestSubmit();
                assert(!viewDoc.getElementById('fvPlay').disabled,'real handoff applies '+key+'/'+extraTypes);
                const canvas=viewDoc.getElementById('fvCanvas'),initial=canvas.toDataURL();
                viewDoc.getElementById('fvPlay').click();await wait(180);viewDoc.getElementById('fvPause').click();
                assert(viewWindow.ExcabaseFleetView.getState().time>0&&canvas.toDataURL()!==initial,'real handoff canvas animates '+key+'/'+extraTypes);
                assert(localStorage.getItem('excabase_active_project')===unchanged&&localStorage.getItem('excabase_projects')===unchangedList,'real handoff leaves project unchanged '+key+'/'+extraTypes);
            }
        }
        save(project);
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
        // Mixed snapshots must isolate unsupported models, for every scenario.
        for (const extras of [[], ['bulldozer'], ['wheelloader'], ['bulldozer','wheelloader','motorgrader','compactor']]) {
            const mixed=JSON.parse(JSON.stringify(sources.cepat));
            for (const key of ['dasar','hemat','cepat']) {
                mixed.scenarios[key].equipment.push(...extras.map(type=>({type,units:2,totalProductivity:999999,workVolumeBasis:'ccm',workVolume:17})));
                sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(mixed));
                d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario='+key);
                assert(d.getElementById('fvError').hidden,'mixed snapshot initializes '+key+'/'+extras.join(','));
                d.getElementById('fv-unloadMinutes').value='1';d.getElementById('fvForm').requestSubmit();
                const view=frame.contentWindow.ExcabaseFleetView;
                assert(!d.getElementById('fvPlay').disabled,'mixed snapshot applies '+key+'/'+extras.join(','));
                const baseline=D.context(sources.cepat,read(),key);
                assert(view.getConfig().volumeLCM===baseline.volumeLCM&&view.getConfig().truckCount===baseline.truckCount&&view.getConfig().excavatorCount===baseline.excavatorCount,'unsupported productivity excluded '+key+'/'+extras.join(','));
                if(extras.length)assert(/Belum didukung|belum dapat/.test(d.getElementById('fvEquipmentNotice').textContent),'visible inactive equipment notice '+key+'/'+extras.join(','));
                const referenceValues=Object.fromEntries(Object.entries(baseline.params).map(([name,p])=>[name,p.value]));referenceValues.unloadMinutes=1;
                assert(JSON.stringify(view.getConfig())===JSON.stringify(D.config(baseline,referenceValues,'total')),'mixed operational config identical to pair '+key+'/'+extras.join(','));
                const canvas=d.getElementById('fvCanvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
                assert(pixels.some((v,i)=>i%4===3&&v>0),'mixed canvas painted '+key+'/'+extras.join(','));
                d.getElementById('fvPlay').click();await wait(120);d.getElementById('fvPause').click();
                assert(view.getState().time>0,'mixed snapshot plays '+key+'/'+extras.join(','));
            }
        }
        const aliases=JSON.parse(JSON.stringify(sources.cepat));
        aliases.scenarios.dasar.equipment.forEach(item=>{item.type=item.type==='excavator'?' Excavator ':'Dump Truck';});
        const aliasContext=D.context(aliases,read(),'dasar');
        assert(aliasContext.excavatorCount===2&&aliasContext.truckCount===4,'display names normalized in snapshot');
        for(const broken of [{equipment:{excavator:{units:2},dumptruck:{units:4}}},{equipment:[{type:'excavator',quantity:2},{type:'dumptruck',units:4}]},{equipment:[{type:'excavator',units:2},{type:'bulldozer',units:3}]}]){
            const malformed=JSON.parse(JSON.stringify(sources.cepat));malformed.scenarios.dasar=broken;
            sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(malformed));
            d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar');
            const diag=frame.contentWindow.ExcabaseFleetView.getDiagnostics();
            assert(!d.getElementById('fvError').hidden&&d.getElementById('fvApply').disabled,'invalid integration data blocks operation');
            assert(diag.error.includes('Hitung Semua Skenario')&&diag.snapshot.dasar.shape===(Array.isArray(broken.equipment)?'array':'object'),'invalid snapshot has actionable structural diagnostics');
            assert(d.getElementById('fvScenarioName').textContent==='Dasar'&&d.getElementById('fvCounts').textContent==='—','invalid snapshot keeps scenario name without invented counts');
            if(Array.isArray(broken.equipment)&&broken.equipment.length===2&&broken.equipment[1].type==='bulldozer')assert(diag.error.includes('ada di Estimasi'),'missing truck is distinguished from absent estimate pair');
        }
        sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(sources.cepat));
        d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar&handoff=old-snapshot');
        assert(frame.contentWindow.ExcabaseFleetView.getDiagnostics().handoffMatches===false&&d.getElementById('fvError').textContent.includes('snapshot lama'),'overwritten handoff has distinct diagnostic');
        for(const types of [['excavator'],['dumptruck'],['bulldozer','wheelloader','motorgrader','compactor'],[]]){
            const incomplete=JSON.parse(JSON.stringify(sources.cepat));
            incomplete.scenarios.dasar.equipment=types.map(type=>sources.cepat.scenarios.dasar.equipment.find(item=>item.type===type)||{type,units:2});
            sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(incomplete));
            d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar');
            assert(!d.getElementById('fvSceneMessage').hidden&&d.getElementById('fvSceneMessage').textContent.includes('kedua jenis alat'),'incomplete pair explains scene '+types.join(','));
            assert(frame.contentWindow.getComputedStyle(d.getElementById('fvCanvas')).display==='none','incomplete pair replaces blank canvas '+types.join(','));
            assert(d.getElementById('fvPlay').disabled&&d.getElementById('fvApply').disabled,'incomplete pair blocks operation '+types.join(','));
            d.getElementById('fvScenario').value='hemat';d.getElementById('fvScenario').dispatchEvent(new frame.contentWindow.Event('change'));
            assert(!d.getElementById('fvCanvas').hidden&&d.getElementById('fvSceneMessage').hidden,'valid scenario recovers after missing pair '+types.join(','));
        }
        sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(aliases));
        d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar');
        assert(d.getElementById('fvError').hidden&&!d.getElementById('fvCanvas').hidden,'normalized snapshot initializes canvas');
        assert(JSON.stringify(read())===projectBefore&&localStorage.getItem('excabase_projects')===listBefore,'mixed and missing pairs preserve project results');
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
        await window.runBulldozerAudit({assert,near,wait,open,fixture,save,read});
        await window.runOperationsAudit({assert,near,wait,open,fixture,save,read});
        await window.runFleetLayoutAudit({assert,near,wait,open,fixture,save,read});
        assert(errors.length===0,'no browser errors: '+errors.join('; '));
        window.ExcabaseFleetTestPreview={project:JSON.parse(projectBefore),source:sources.cepat};
        output.textContent=JSON.stringify({passed:true,assertions:checks.length,widths:[360,390,768,1366,1920],lastChecks:checks.slice(-12)});
    } catch(error) {
        output.textContent=JSON.stringify({passed:false,assertions:checks.length,error:error.stack,lastChecks:checks.slice(-8),errors});
    } finally {
        restore(localStorage,localBefore);restore(sessionStorage,sessionBefore);
    }
})();
