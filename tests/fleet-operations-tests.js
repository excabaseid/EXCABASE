/* Stage A loader audit; later stages append checks and retain these regressions. */
window.runOperationsAudit=async function(helpers){
    'use strict';
    const {assert,near,wait,open,fixture,save}=helpers,api=window.ExcabaseFleetEngine,D=window.ExcabaseFleetData;
    const loader=overrides=>({count:2,volumeLCM:17,hourlyPerUnit:3600,cycleSeconds:4,truckCount:2,truckCapacity:6,loadedTravelSeconds:5,unloadSeconds:2,returnTravelSeconds:3,truckEfficiency:1,...overrides});
    for(const count of [1,2,4])for(const volumeLCM of [1,5.5,17,72])for(const truckCount of [0,1,3]){
        const e=new api.WheelLoaderEngine(loader({count,volumeLCM,truckCount}));
        for(let i=0;i<3000&&!e.finished;i++){
            const s=e.advance(.31),onboard=e.trucks.reduce((sum,t)=>sum+t.load,0)+e.units.reduce((sum,u)=>sum+u.load,0);
            assert(near(e.extracted,e.delivered+onboard)&&e.extracted<=volumeLCM&&s.progress<=100&&near(s.remaining+s.delivered,volumeLCM),'loader mass balance '+count+'/'+volumeLCM+'/'+truckCount+'/'+i);
            assert(e.trucks.every(t=>t.load<=6),'loader truck capacity conserved');
        }
        assert(e.finished&&e.delivered===volumeLCM,'loader final target exact '+count+'/'+volumeLCM+'/'+truckCount);
    }
    const a=new api.WheelLoaderEngine(loader()),b=new api.WheelLoaderEngine(loader());a.advance(20);for(let i=0;i<80;i++)b.advance(.25);
    assert(JSON.stringify(a.snapshot())===JSON.stringify(b.snapshot()),'loader deterministic across frame partitions');
    const first=new api.WheelLoaderEngine(loader({count:1,truckCount:1,volumeLCM:7}));
    first.advance(.39);assert(first.extracted===0&&first.trucks[0].load===0,'loader approach never fills truck');
    first.advance(.62);assert(first.extracted===4&&first.trucks[0].load===0&&first.units[0].load===4,'scoop moves volume into bucket before truck');
    first.advance(1.6);assert(first.trucks[0].load===4&&first.delivered===0,'dumping transfers bucket to truck without disposal credit');
    const baseFixture=types=>{
        const p=fixture();p.results.estimate.equipment=p.results.estimate.equipment.filter(row=>types.includes(row.type));
        p.results.productivity.wheelloader={hourly:360,daily:2880,volumeBasis:'lcm'};
        p.results.productivityInputs.wheelloader={fields:{loaderBucket:'2',loaderFillFactor:'1',loaderCycleTime:'20',loaderEfficiency:'1'}};
        p.results.estimate.equipment.push({type:'wheelloader',units:2,hourlyProductivity:360,totalHourlyProductivity:720,volumeBasis:'lcm',workVolumeBasis:'lcm',workVolume:360,costPerHour:200000,totalOperatingCost:100000});
        return p;
    };
    for(const types of [['wheelloader'],['wheelloader','dumptruck'],['excavator','wheelloader','dumptruck']]){
        const p=baseFixture(types);save(p);let d=await open('pages/simulasi-armada.html?fromProject=1');d.getElementById('calculateFleetScenarioBtn').click();
        const sources={};for(const key of ['dasar','hemat','cepat']){
            d.getElementById('fleetSelectedScenario').value=key;d.getElementById('fleetSelectedScenario').dispatchEvent(new d.defaultView.Event('change'));
            const link=d.getElementById('visualizeFleetLink');link.addEventListener('click',event=>event.preventDefault(),{once:true});link.click();sources[key]=JSON.parse(sessionStorage.getItem(D.SESSION_KEY));
        }
        const before=localStorage.getItem('excabase_active_project'),list=localStorage.getItem('excabase_projects');
        for(const key of ['dasar','hemat','cepat']){
            sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(sources[key]));d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario='+key);const w=d.defaultView;
            assert(d.getElementById('fvError').hidden,'loader real handoff opens '+types+'/'+key);
            if(types.includes('excavator')){
                assert(!w.ExcabaseFleetView.getDiagnostics().activities.loaderEnabled,'duplicate earthmoving target is inactive by default');
                d.getElementById('fvLoadingSource').value='wheelloader';d.getElementById('fvLoadingSource').dispatchEvent(new w.Event('change'));
            }
            if(types.includes('dumptruck')){
                d.getElementById('fvTimingMode').value='segments';d.getElementById('fvTimingMode').dispatchEvent(new w.Event('change'));
                d.getElementById('fv-loadedTravelMinutes').value='.02';d.getElementById('fv-returnTravelMinutes').value='.02';d.getElementById('fv-unloadMinutes').value='.02';
            }
            d.getElementById('fv-loaderCycleSeconds').value='.4';d.getElementById('fvForm').requestSubmit();
            assert(!d.getElementById('fvPlay').disabled,'loader parameters apply '+types+'/'+key);
            const cfg=w.ExcabaseFleetView.getConfig(),expected={dasar:2,hemat:1,cepat:3}[key];
            assert(cfg.wheelLoader.count===expected,'loader scenario count exact '+key);
            const initial=d.getElementById('fvCanvas').toDataURL();d.getElementById('fvSpeed').value='10';d.getElementById('fvSpeed').dispatchEvent(new w.Event('change'));d.getElementById('fvPlay').click();await wait(350);d.getElementById('fvPause').click();
            const state=w.ExcabaseFleetView.getState();assert(state.loader.completed>0&&d.getElementById('fvCanvas').toDataURL()!==initial,'loader real animation and loading progress '+types+'/'+key);
            const paused=JSON.stringify(state);await wait(50);assert(JSON.stringify(w.ExcabaseFleetView.getState())===paused,'loader Pause freezes state');
            const engine=new api.FleetEngine(cfg);engine.advance(100000);assert(engine.finished&&engine.loader.loaded===360&&engine.delivered===(types.includes('dumptruck')?360:0),'loader standalone versus disposal target not double counted');
            d.getElementById('fvReset').click();assert(w.ExcabaseFleetView.getState().loader.completed===0,'loader Reset clears progress');
            assert(localStorage.getItem('excabase_active_project')===before&&localStorage.getItem('excabase_projects')===list,'loader controls preserve original project');
            const frame=document.querySelector('iframe');frame.style.width='390px';await wait(350);assert(d.documentElement.scrollWidth<=w.innerWidth,'loader mobile layout fits viewport='+w.innerWidth+' scroll='+d.documentElement.scrollWidth+' overflow='+Array.from(d.querySelectorAll('main *')).filter(n=>n.getBoundingClientRect().right>w.innerWidth+1).slice(0,8).map(n=>n.tagName+'#'+n.id+'.'+n.className+':'+Math.round(n.getBoundingClientRect().width)).join(','));frame.style.width='1366px';await wait(350);
        }
    }
    // Stage B: one patch requires all passes before it becomes completed area.
    const passConfig={count:1,area:20,hourlyArea:3600,width:2,length:10,passes:4,basis:'m2',volume:null,thickness:null};
    const grader=new api.GraderEngine(passConfig);grader.advance(4.5);
    assert(grader.snapshot().completedPasses===1&&grader.snapshot().completedArea===0,'grader one of four passes does not finish patch');
    grader.advance(100);assert(grader.finished&&grader.snapshot().completedArea===20&&grader.time===20,'grader Q includes passes exactly once');
    const pa=new api.GraderEngine(passConfig),pb=new api.GraderEngine(passConfig);pa.advance(9);for(let i=0;i<36;i++)pb.advance(.25);
    assert(JSON.stringify(pa.snapshot())===JSON.stringify(pb.snapshot()),'grader deterministic across frame partitions');
    const many=new api.GraderEngine({...passConfig,count:2,area:40});many.advance(100);assert(many.time===grader.time,'grader units scale area capacity');
    for(const patch of [{passes:0},{passes:1.5},{basis:'m3'},{width:0},{area:NaN},{volume:5,basis:'lcm',thickness:.1}]){
        let thrown=false;try{new api.GraderEngine({...passConfig,...patch});}catch{thrown=true;}assert(thrown,'grader invalid units/geometry rejected '+JSON.stringify(patch));
    }
    for(const areaSource of [false,true])for(const combination of ['single','loader','hauler']){
        const p=combination==='loader'?baseFixture(['wheelloader']):fixture();
        if(combination==='single')p.results.estimate.equipment=[];
        const basis=areaSource?'m2':'lcm',hourly=areaSource?1600:320,target=areaSource?60:12;
        p.results.productivity.motorgrader={hourly,volumeBasis:basis};
        p.results.productivityInputs.motorgrader={fields:{graderWidth:'2',graderSpeed:'3',graderEfficiency:'.8',graderPasses:'3',graderThickness:'.2'}};
        p.results.estimate.equipment.push({type:'motorgrader',units:2,hourlyProductivity:hourly,totalHourlyProductivity:hourly*2,volumeBasis:basis,workVolumeBasis:basis,workVolume:target,costPerHour:200000,totalOperatingCost:100000});
        save(p);let d=await open('pages/simulasi-armada.html?fromProject=1');d.getElementById('calculateFleetScenarioBtn').click();
        const sources={};for(const key of ['dasar','hemat','cepat']){
            d.getElementById('fleetSelectedScenario').value=key;d.getElementById('fleetSelectedScenario').dispatchEvent(new d.defaultView.Event('change'));
            const link=d.getElementById('visualizeFleetLink');link.addEventListener('click',e=>e.preventDefault(),{once:true});link.click();sources[key]=JSON.parse(sessionStorage.getItem(D.SESSION_KEY));
        }
        const before=localStorage.getItem('excabase_active_project'),list=localStorage.getItem('excabase_projects');
        for(const key of ['dasar','hemat','cepat']){
            sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(sources[key]));d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario='+key);const w=d.defaultView;
            assert(d.getElementById('fvError').hidden,'grader mode opens '+areaSource+'/'+combination+'/'+key);
            if(combination==='hauler')d.getElementById('fv-unloadMinutes').value='1';
            d.getElementById('fv-graderLength').value='.1';d.getElementById('fvForm').requestSubmit();
            assert(!d.getElementById('fvPlay').disabled,'grader params apply '+key);
            const cfg=w.ExcabaseFleetView.getConfig();assert(cfg.grader.area===60&&cfg.grader.hourlyArea===1600&&cfg.grader.count===({dasar:2,hemat:1,cepat:3})[key],'grader area and Q conversion preserve units '+areaSource+'/'+key);
            assert(areaSource?!d.getElementById('fv-graderThickness'):cfg.grader.volume===12,'area source never invented as volume');
            const pixels=d.getElementById('fvCanvas').toDataURL();d.getElementById('fvSpeed').value='10';d.getElementById('fvSpeed').dispatchEvent(new w.Event('change'));d.getElementById('fvPlay').click();await wait(220);d.getElementById('fvPause').click();
            const state=w.ExcabaseFleetView.getState();assert(state.grader.completedPasses>0&&state.grader.completedArea>0&&state.grader.completedArea<=60&&d.getElementById('fvCanvas').toDataURL()!==pixels,'grader animates and finishes bounded area');
            const complete=new api.FleetEngine(cfg);complete.advance(100000);assert(complete.finished&&complete.grader.snapshot().completedArea===60&&complete.delivered===(combination==='hauler'?360:0),'grading does not add volume to disposal');
            d.getElementById('fvReset').click();assert(w.ExcabaseFleetView.getState().grader.completedArea===0,'grader Reset clears area and passes');
            assert(localStorage.getItem('excabase_active_project')===before&&localStorage.getItem('excabase_projects')===list,'grader preserves project records');
        }
    }
    // Stage C: repeated roller passes; no technical density certification.
    const roller=new api.CompactorEngine({...passConfig,basis:'ccm',volume:5,thickness:.25});roller.advance(4.5);
    assert(roller.snapshot().completedPasses===1&&roller.snapshot().completedArea===0&&roller.snapshot().volumeCompleted===0&&roller.snapshot().densityCertified===false,'one roller pass never certifies a multi-pass patch or density');
    roller.advance(100);assert(roller.finished&&roller.snapshot().completedArea===20&&roller.snapshot().volumeCompleted===5,'roller separates finished area, passes, and CCM volume');
    for(const passes of [1,2,4,7])for(const count of [1,2,5]){
        const e=new api.CompactorEngine({...passConfig,area:5.5,width:1,length:1,count,passes,basis:'ccm',volume:1.375,thickness:.25});
        for(let i=0;i<500&&!e.finished;i++){
            const s=e.advance(.13);assert(s.completedArea<=5.5&&s.passArea<=5.5*passes&&s.volumeCompleted<=1.375&&near(s.completedArea+s.remainingArea,5.5),'compactor area/pass/volume bounds '+passes+'/'+count+'/'+i);
        }
        assert(e.finished&&e.snapshot().completedArea===5.5,'compactor partial patches finish exactly '+passes+'/'+count);
    }
    const ca=new api.CompactorEngine({...passConfig,basis:'ccm',volume:5,thickness:.25}),cb=new api.CompactorEngine({...passConfig,basis:'ccm',volume:5,thickness:.25});ca.advance(9);for(let i=0;i<36;i++)cb.advance(.25);
    assert(JSON.stringify(ca.snapshot())===JSON.stringify(cb.snapshot()),'compactor deterministic across frame partitions');
    let invalidBasis=false;try{new api.CompactorEngine({...passConfig,basis:'lcm',volume:5,thickness:.25});}catch{invalidBasis=true;}assert(invalidBasis,'compactor refuses loose volume without CCM conversion');
    function sixFixture(types){
        const p=fixture();p.results.estimate.equipment=p.results.estimate.equipment.filter(row=>types.includes(row.type));
        const specs={bulldozer:[240,360,'lcm',{dozerCycleTime:'60',dozerEfficiency:'1'}],wheelloader:[360,360,'lcm',{loaderCycleTime:'20',loaderEfficiency:'1'}],motorgrader:[320,12,'lcm',{graderWidth:'2',graderPasses:'3',graderThickness:'.2',graderSpeed:'3',graderEfficiency:'.8'}],compactor:[300,12,'ccm',{compactorWidth:'2',compactorPasses:'4',compactorThickness:'.25',compactorSpeed:'3',compactorEfficiency:'.8'}]};
        for(const type of types)if(specs[type]){
            const [hourly,workVolume,basis,fields]=specs[type];p.results.productivity[type]={hourly,volumeBasis:basis};p.results.productivityInputs[type]={fields};
            p.results.estimate.equipment.push({type,units:2,hourlyProductivity:hourly,totalHourlyProductivity:hourly*2,volumeBasis:basis,workVolumeBasis:basis,workVolume,costPerHour:200000,totalOperatingCost:100000});
        }
        return p;
    }
    for(const [label,types]of [['roller',['compactor']],['grading-compaction',['motorgrader','compactor']],['loader-roller',['wheelloader','dumptruck','compactor']],['six',['excavator','dumptruck','bulldozer','wheelloader','motorgrader','compactor']]]){
        const p=sixFixture(types);save(p);let d=await open('pages/simulasi-armada.html?fromProject=1');d.getElementById('calculateFleetScenarioBtn').click();
        const sources={};for(const key of ['dasar','hemat','cepat']){
            d.getElementById('fleetSelectedScenario').value=key;d.getElementById('fleetSelectedScenario').dispatchEvent(new d.defaultView.Event('change'));
            const link=d.getElementById('visualizeFleetLink');link.addEventListener('click',e=>e.preventDefault(),{once:true});link.click();sources[key]=JSON.parse(sessionStorage.getItem(D.SESSION_KEY));
        }
        const before=localStorage.getItem('excabase_active_project'),list=localStorage.getItem('excabase_projects');
        for(const key of ['dasar','hemat','cepat']){
            sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(sources[key]));d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario='+key);const w=d.defaultView;
            assert(d.getElementById('fvError').hidden,'compactor/six mode opens '+label+'/'+key);
            if(label==='six'){d.getElementById('fvLoadingSource').value='wheelloader';d.getElementById('fvLoadingSource').dispatchEvent(new w.Event('change'));}
            for(const [id,value]of [['loaderCycleSeconds','.4'],['dozerCycleSeconds','.4'],['graderLength','.1'],['compactorLength','.1'],['unloadMinutes','1']])if(d.getElementById('fv-'+id))d.getElementById('fv-'+id).value=value;
            d.getElementById('fvForm').requestSubmit();assert(!d.getElementById('fvPlay').disabled,'compactor/six parameters apply '+label+'/'+key);
            const cfg=w.ExcabaseFleetView.getConfig(),savedConfig=JSON.stringify(cfg);
            if(label==='six')for(const zone of ['loader','grader','compactor','all']){
                const prior=d.getElementById('fvCanvas').toDataURL();d.getElementById('fvSceneZone').value=zone;d.getElementById('fvSceneZone').dispatchEvent(new w.Event('change'));
                assert(JSON.stringify(w.ExcabaseFleetView.getConfig())===savedConfig&&d.getElementById('fvCanvas').toDataURL()!==prior,'zone focus changes camera only '+zone+'/'+key);
            }
            assert(cfg.compactor.count===({dasar:2,hemat:1,cepat:3})[key]&&cfg.compactor.area===48&&cfg.compactor.hourlyArea===1200&&cfg.compactor.passes===4,'compactor scenario geometry/CCM conversion correct '+key);
            for(const speed of ['1','2','5','10']){d.getElementById('fvSpeed').value=speed;d.getElementById('fvSpeed').dispatchEvent(new w.Event('change'));assert(JSON.stringify(w.ExcabaseFleetView.getConfig())===savedConfig,'speed never changes activity units/Q '+label+'/'+speed);}
            const pixels=d.getElementById('fvCanvas').toDataURL();d.getElementById('fvPlay').click();await wait(260);d.getElementById('fvPause').click();const s=w.ExcabaseFleetView.getState();
            assert(s.compactor.completedPasses>0&&s.compactor.volumeCompleted<=12&&s.compactor.densityCertified===false&&d.getElementById('fvCanvas').toDataURL()!==pixels,'roller live passes and moving canvas '+label+'/'+key);
            const paused=JSON.stringify(s);await wait(50);assert(JSON.stringify(w.ExcabaseFleetView.getState())===paused,'all active models pause together '+label);
            const complete=new api.FleetEngine(cfg);complete.advance(100000);const end=complete.snapshot();
            assert(end.finished&&end.compactor.completedArea===48&&end.compactor.volumeCompleted===12&&end.delivered===(types.includes('dumptruck')?360:0),'CCM target and hauled target remain independent '+label+'/'+key);
            if(label==='six')assert(end.bulldozer.pushed===360&&end.loader.completed===360&&end.grader.completedArea===60&&end.total===360,'six activities preserve separate area/volume ledgers');
            d.getElementById('fvReset').click();assert(w.ExcabaseFleetView.getState().compactor.completedPasses===0,'roller Reset clears pass counter');
            assert(localStorage.getItem('excabase_active_project')===before&&localStorage.getItem('excabase_projects')===list,'six-mode controls never mutate project');
            if(key==='cepat'){
                const frame=document.querySelector('iframe');for(const width of [390,1366]){frame.style.width=width+'px';await wait(350);assert(d.documentElement.scrollWidth<=w.innerWidth,'six-mode mobile/desktop fits '+label+'/'+width);}
                window.ExcabaseOperationsTestPreviews||={};window.ExcabaseOperationsTestPreviews[label]={project:p,source:sources[key]};
                d.getElementById('fvScenario').value='hemat';d.getElementById('fvScenario').dispatchEvent(new w.Event('change'));assert(w.ExcabaseFleetView.getState()===null&&d.getElementById('fvScenarioName').textContent==='Hemat','scenario switch resets all activity engines');
            }
        }
    }
    // Incomplete geometry stays editable; unknown Q never becomes fabricated work.
    const missing=sixFixture(['compactor']);delete missing.results.productivityInputs.compactor.fields.compactorThickness;save(missing);
    const missingSource=D.envelope(missing,{dasar:{equipment:missing.results.estimate.equipment}},'dasar');sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(missingSource));
    let md=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar');
    md.getElementById('fvForm').requestSubmit();assert(md.getElementById('fvPlay').disabled&&md.getElementById('fv-compactorThickness').value==='','missing compactor thickness is required, never guessed');
    md.getElementById('fv-compactorThickness').value='.25';md.getElementById('fvForm').requestSubmit();assert(!md.getElementById('fvPlay').disabled,'explicit missing thickness enables compactor');
    const conversion=sixFixture(['compactor']);conversion.results.productivity.compactor.volumeBasis='lcm';conversion.results.estimate.equipment[0].volumeBasis='lcm';conversion.results.estimate.equipment[0].workVolumeBasis='lcm';
    const converted=D.context(D.envelope(conversion,{dasar:{equipment:conversion.results.estimate.equipment}},'dasar'),conversion,'dasar');
    assert(near(converted.compactor.target,12*260/360)&&near(converted.compactor.hourlyPerUnit,300*260/360)&&converted.compactor.basis==='ccm','compactor loose-volume conversion uses actual project ratio for both target and Q');
    delete conversion.results.earthwork;let rejected=false;try{D.context(D.envelope(conversion,{dasar:{equipment:conversion.results.estimate.equipment}},'dasar'),conversion,'dasar');}catch(e){rejected=e.message.includes('Konversi ke CCM');}assert(rejected,'missing CCM ratio is explicit, never assumed');
    for(const type of ['wheelloader','motorgrader','compactor']){
        const p=sixFixture([type]);delete p.results.productivityInputs[type];
        const src=D.envelope(p,{dasar:{equipment:p.results.estimate.equipment}},'dasar');save(p);sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(src));
        const d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar');
        assert(d.getElementById('fvError').hidden&&!d.getElementById('fvCanvas').hidden,'missing geometry leaves editable valid activity '+type);
        d.getElementById('fvForm').requestSubmit();assert(d.getElementById('fvPlay').disabled,'missing parameters never become fabricated operation '+type);
    }
    for(const bad of [{truckCount:NaN},{truckCount:-1},{count:1.5},{cycleSeconds:0},{truckEfficiency:1.5}]){
        let threw=false;try{new api.WheelLoaderEngine(loader(bad));}catch{threw=true;}assert(threw,'loader invalid configuration rejected '+JSON.stringify(bad));
    }
    const alternate=sixFixture(['excavator','dumptruck','wheelloader']);alternate.results.estimate.equipment.find(row=>row.type==='excavator').workVolume=180;
    const alternateSource=D.envelope(alternate,{dasar:{equipment:alternate.results.estimate.equipment}},'dasar');
    const alternateCtx=D.context(alternateSource,alternate,'dasar');
    assert(alternateCtx.loadingSource==='wheelloader'&&alternateCtx.haulingEnabled&&alternateCtx.volumeLCM===360,'valid loader/truck target is not blocked by inactive Excavator volume');
    assert(!alternateCtx.limitations.some(text=>text.includes('pasangan Dump Truck tidak tersedia')),'selected loader never claims existing trucks are absent');
    let wrongSource=false;try{D.context(alternateSource,alternate,'dasar',{}, {loadingSource:'excavator'});}catch(e){wrongSource=e.message.includes('Volume kerja');}assert(wrongSource,'explicit invalid loading source remains rejected without fake volume');
};
