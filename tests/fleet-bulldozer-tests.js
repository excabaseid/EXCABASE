/* Real-browser activity and integration regression suite. Fixtures run only in the audit profile. */
window.runBulldozerAudit=async function(helpers){
    'use strict';
    const {assert,near,wait,open,fixture,save}=helpers;
    const api=window.ExcabaseFleetEngine,D=window.ExcabaseFleetData;
    const make=overrides=>({count:1,volume:17,hourlyPerUnit:3600,cycleSeconds:4,basis:'lcm',approachShare:10,pushShare:50,returnShare:30,...overrides});
    const b=new api.BulldozerEngine(make({volume:5}));
    assert(b.assigned===4&&b.pushed===0,'dozer reserves one cycle without recording completion');
    b.advance(.4);assert(b.units[0].state==='pushing'&&b.pushed===0,'approach does not deliver pushed material');
    b.advance(2);assert(b.pushed===4&&b.units[0].state==='returning','only end of push records work');
    b.advance(1.6);assert(b.pushed===4&&b.assigned===5,'return and wait never count work twice');
    b.advance(100);assert(b.finished&&b.pushed===5&&b.time===8&&b.units[0].cycles===2,'partial final push ends exactly at target after return');
    b.reset();assert(b.time===0&&b.pushed===0&&!b.finished,'dozer reset restores work clock');
    for(const volume of [1,5.5,17,72])for(const count of [1,2,5]){
        const e=new api.BulldozerEngine(make({volume,count}));
        for(let step=0;step<500&&!e.finished;step++){
            const s=e.advance(.37),reserved=e.units.reduce((sum,u)=>sum+u.load,0);
            assert(s.pushed<=volume&&s.progress<=100&&near(s.pushed+s.remaining,volume)&&near(e.assigned,s.pushed+reserved),'dozer volume conservation '+volume+'/'+count+'/'+step);
        }
        assert(e.finished&&e.pushed===volume,'dozer completes all volume/unit cases '+volume+'/'+count);
    }
    const a=new api.BulldozerEngine(make()),split=new api.BulldozerEngine(make());a.advance(7);for(let i=0;i<28;i++)split.advance(.25);
    assert(JSON.stringify(a.snapshot())===JSON.stringify(split.snapshot()),'dozer deterministic across frame partitions');
    const one=new api.BulldozerEngine(make({volume:72})),many=new api.BulldozerEngine(make({volume:72,count:3}));
    one.advance(1000);many.advance(1000);assert(many.time===one.time/3,'more dozers improve completion rate at fixed Q');
    const wholeCycle=new api.BulldozerEngine(make({volume:72,cycleSeconds:8}));wholeCycle.advance(1000);
    assert(wholeCycle.time===one.time,'cycle assumptions preserve Q for whole-cycle targets');
    for(const bad of [{count:0},{count:1.2},{volume:0},{hourlyPerUnit:NaN},{cycleSeconds:0},{pushShare:100},{returnShare:-1},{basis:'unknown'}]){
        let thrown=false;try{new api.BulldozerEngine(make(bad));}catch{thrown=true;}assert(thrown,'invalid dozer config rejected '+JSON.stringify(bad));
    }
    const haulConfig={volumeLCM:7,excavatorCount:1,truckCount:1,bucketCapacity:4,fillFactor:1,excavatorCycleSeconds:5,excavatorEfficiency:1,truckCapacity:6,truckEfficiency:1,loadedTravelSeconds:30,unloadSeconds:5,returnTravelSeconds:20,workingHours:8};
    for(const volume of [1,1000]){
        const combined=new api.FleetEngine({...haulConfig,bulldozer:make({volume})}),hauler=new api.Engine(haulConfig),dozer=new api.BulldozerEngine(make({volume}));
        for(const dt of [1,4,25,100,1000]){
            combined.advance(dt);hauler.advance(dt);dozer.advance(dt);
            const s=combined.snapshot();
            assert(s.delivered===hauler.delivered&&s.extracted===hauler.extracted&&s.bulldozer.pushed===dozer.pushed,'combined activity volumes stay independent '+volume+'/'+dt);
        }
        assert(combined.finished&&combined.time===Math.max(hauler.time,dozer.time),'combined clock includes slower activity '+volume);
    }
    const fixtureFor=types=>{
        const p=fixture();
        p.results.estimate.equipment=p.results.estimate.equipment.filter(item=>types.includes(item.type));
        if(types.includes('bulldozer')){
            p.results.productivity.bulldozer={hourly:240,daily:1920,volumeBasis:'lcm'};
            p.results.productivityInputs.bulldozer={fields:{dozerCapacity:'4',dozerFillFactor:'1',dozerCycleTime:'60',dozerEfficiency:'1'}};
            p.results.estimate.equipment.push({type:'bulldozer',units:3,hourlyProductivity:240,totalHourlyProductivity:720,dailyProductivity:5760,volumeBasis:'lcm',workVolumeBasis:'lcm',workVolume:72,costPerHour:200000,totalHourlyCost:600000,durationHours:.1,durationDays:.0125,totalOperatingCost:60000});
        }
        p.results.selectedEquipment=types.map(type=>D.equipmentTypes[type].name);
        return p;
    };
    for(const types of [['excavator','dumptruck'],['bulldozer'],['bulldozer','dumptruck'],['excavator','bulldozer','dumptruck']]){
        const project=fixtureFor(types);save(project);
        let d=await open('pages/simulasi-armada.html?fromProject=1');
        d.getElementById('calculateFleetScenarioBtn').click();
        const sourceByKey={};
        for(const key of ['dasar','hemat','cepat']){
            d.getElementById('fleetSelectedScenario').value=key;d.getElementById('fleetSelectedScenario').dispatchEvent(new d.defaultView.Event('change'));
            const link=d.getElementById('visualizeFleetLink');link.addEventListener('click',event=>event.preventDefault(),{once:true});link.click();
            sourceByKey[key]=JSON.parse(sessionStorage.getItem(D.SESSION_KEY));
        }
        const unchanged=localStorage.getItem('excabase_active_project'),unchangedList=localStorage.getItem('excabase_projects');
        for(const key of ['dasar','hemat','cepat']){
            const source=sourceByKey[key],hasDozer=types.includes('bulldozer'),hasHaul=types.includes('excavator')&&types.includes('dumptruck');
            sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(source));
            d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario='+key);
            const w=d.defaultView,ctx=D.context(source,project,key);
            assert(d.getElementById('fvError').hidden&&!d.getElementById('fvCanvas').hidden,'mode opens '+types+'/'+key);
            assert(d.getElementById('fvScenarioName').textContent===D.names[key]&&d.getElementById('fvDozerCount').textContent===ctx.bulldozerCount+' unit','mode scenario and dozer count '+types+'/'+key);
            assert(d.getElementById('fvHaulingTiming').hidden===!hasHaul&&d.getElementById('fvDozerPanel').hidden===!hasDozer,'mode-specific controls '+types+'/'+key);
            if(hasHaul)d.getElementById('fv-unloadMinutes').value='1';
            if(hasDozer){
                assert(d.getElementById('fv-dozerCycleSeconds').value==='60','effective dozer cycle comes from real input '+key);
                d.getElementById('fv-dozerCycleSeconds').value='.4';
                assert(ctx.bulldozer.count===({dasar:3,hemat:2,cepat:4})[key]&&ctx.bulldozer.hourlyPerUnit===240,'dozer count and per-unit Q from scenario '+key);
            }
            d.getElementById('fvForm').requestSubmit();
            assert(!d.getElementById('fvPlay').disabled,'mode applies '+types+'/'+key);
            const cfg=w.ExcabaseFleetView.getConfig(),configBefore=JSON.stringify(cfg);
            const pixelsBefore=d.getElementById('fvCanvas').toDataURL();
            d.getElementById('fvSpeed').value='10';d.getElementById('fvSpeed').dispatchEvent(new w.Event('change'));
            d.getElementById('fvPlay').click();await wait(360);d.getElementById('fvPause').click();
            const state=w.ExcabaseFleetView.getState();
            assert(state.time>0&&d.getElementById('fvCanvas').toDataURL()!==pixelsBefore,'mode canvas moves '+types+'/'+key);
            if(hasDozer)assert(state.bulldozer.pushed>0&&state.bulldozer.pushed<=72&&near(state.bulldozer.pushed+state.bulldozer.remaining,72),'live dozer makes bounded progress '+types+'/'+key);
            if(!hasHaul){
                assert(state.delivered===0&&state.extracted===0&&state.counts.standby===ctx.truckCount&&state.counts.hauling===0&&cfg.haulingEnabled===false,'no fictional loading or hauling '+types+'/'+key);
                if(types.includes('dumptruck'))assert(d.getElementById('fvEquipmentNotice').textContent.includes('tidak memuat truk'),'inactive trucks explained '+key);
            }
            const paused=JSON.stringify(w.ExcabaseFleetView.getState());await wait(60);assert(JSON.stringify(w.ExcabaseFleetView.getState())===paused,'mode Pause freezes all activities '+types+'/'+key);
            assert(JSON.stringify(w.ExcabaseFleetView.getConfig())===configBefore,'speed does not change Q or timing config '+types+'/'+key);
            const complete=new api.FleetEngine(cfg);complete.advance(1000000);const end=complete.snapshot();
            assert(end.finished&&end.delivered===(hasHaul?360:0)&&(!hasDozer||end.bulldozer.pushed===72),'each target completed independently '+types+'/'+key);
            if(hasDozer&&hasHaul)assert(end.total===360&&end.bulldozer.total===72&&end.delivered!==432,'no sum of dozer and disposal volumes '+key);
            d.getElementById('fvReset').click();
            assert(w.ExcabaseFleetView.getState().time===0&&(!hasDozer||w.ExcabaseFleetView.getState().bulldozer.pushed===0),'mode Reset clears both models '+types+'/'+key);
            assert(localStorage.getItem('excabase_active_project')===unchanged&&localStorage.getItem('excabase_projects')===unchangedList,'mode never mutates project or formulas '+types+'/'+key);
            if(key==='cepat'){
                for(const width of [390,1366]){
                    const iframe=document.querySelector('iframe');iframe.style.width=width+'px';await wait(120);
                    assert(d.documentElement.scrollWidth<=w.innerWidth&&d.getElementById('fvCanvas').width>0,'mode responsive '+types+'/'+width);
                }
                if(hasDozer){
                    window.ExcabaseBulldozerTestPreviews ||= {};
                    window.ExcabaseBulldozerTestPreviews[hasHaul?'combined':types.includes('dumptruck')?'dozer-truck':'dozer']={project,source};
                }
            }
        }
    }
    // Missing cycle is explicitly user input, while missing productivity prevents fictional work.
    const p=fixtureFor(['bulldozer','dumptruck']);delete p.results.productivityInputs.bulldozer;save(p);
    const scenarios=Object.fromEntries(['dasar','hemat','cepat'].map(key=>[key,{equipment:p.results.estimate.equipment}]));
    const source=D.envelope(p,scenarios,'dasar');sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(source));
    let d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar');
    assert(d.getElementById('fv-dozerCycleSeconds').value===''&&d.getElementById('fv-dozerCycleSeconds-source').textContent.includes('isi'),'missing physical cycle is not fabricated');
    d.getElementById('fvForm').requestSubmit();assert(d.getElementById('fvPlay').disabled,'missing assumed cycle blocks Apply');
    d.getElementById('fv-dozerCycleSeconds').value='30';d.getElementById('fvForm').requestSubmit();
    assert(!d.getElementById('fvPlay').disabled,'explicit cycle assumption permits dozer-only operation');
    const noQ=JSON.parse(JSON.stringify(source));delete noQ.scenarios.dasar.equipment.find(item=>item.type==='bulldozer').hourlyProductivity;
    sessionStorage.setItem(D.SESSION_KEY,JSON.stringify(noQ));d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=dasar');
    assert(!d.getElementById('fvSceneMessage').hidden&&d.getElementById('fvSceneMessage').textContent.includes('Bulldozer belum dapat'),'missing dozer Q has clear limitation');
};
