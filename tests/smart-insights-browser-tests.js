window.runSmartInsightsAudit=async function(){
    let checks=0;const assert=(v,m)=>{if(!v)throw Error(m);checks++;};
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const frame=document.createElement('iframe');frame.style.cssText='width:1366px;height:1100px;border:0';document.body.append(frame);
    const allTypes=['excavator','dumptruck','wheelloader','bulldozer','motorgrader','compactor'];
    function fixture(types,id,options={}){
        const p={id,name:'Smart Insights '+id,status:'aktif',targetDays:3,workHoursPerDay:8,results:{productivity:{}}};
        p.results.estimate={equipment:types.map((type,i)=>{
            const basis=type==='compactor'?'ccm':'lcm',hourly=type==='dumptruck'?(options.truckHourly??80):160,units=2;
            p.results.productivity[type]={hourly,volumeBasis:basis,model:'Model uji '+type};
            return {type,units,hourlyProductivity:hourly,totalHourlyProductivity:hourly*units,volumeBasis:basis,workVolumeBasis:basis,workVolume:1000,costPerHour:100000,totalOperatingCost:1000/hourly*100000,durationDays:1000/(hourly*units*8)};
        })};
        if(types.includes('compactor'))p.results.productivityInputs={compactor:{fields:{compactorPasses:'4',compactorThickness:'.25'}}};
        return p;
    }
    async function open(p){
        localStorage.setItem('excabase_active_project',JSON.stringify(p));localStorage.setItem('excabase_projects',JSON.stringify([p]));
        await new Promise(resolve=>{frame.onload=resolve;frame.src='simulasi-armada.html?fromProject=1';});await wait(180);
        const w=frame.contentWindow,d=frame.contentDocument;
        return {w,d,panel:d.getElementById('smartInsights')};
    }
    let last;
    for(const [label,types]of [['ex',['excavator','dumptruck']],['loader',['wheelloader','dumptruck']],['dozer',['bulldozer']],['grader',['motorgrader']],['compactor',['compactor']],['no-truck',['bulldozer','motorgrader','compactor']],['six',allTypes]]){
        const p=fixture(types,label),{w,d,panel}=await open(p);last={w,d,panel};
        assert(panel.hidden,'hidden before calculation '+label);
        let envelope;d.addEventListener('excabase:fleet-visualization',e=>envelope=e.detail);
        const before=JSON.stringify({...localStorage}),session=JSON.stringify({...sessionStorage});
        d.getElementById('calculateFleetScenarioBtn').click();
        assert(!panel.hidden,'visible after calculation '+label);
        assert(d.getElementById('siToggle').getAttribute('aria-expanded')==='false'&&d.getElementById('siDashboard').inert,'dashboard starts compact');
        d.getElementById('siToggle').click();
        assert(d.getElementById('siToggle').getAttribute('aria-expanded')==='true'&&!d.getElementById('siDashboard').inert,'dashboard opens with keyboard-accessible controls');
        for(const selected of ['dasar','hemat','cepat']){
            const input=d.getElementById(selected==='hemat'?'siScenario':'fleetSelectedScenario');input.value=selected;input.dispatchEvent(new w.Event('change'));
            let model=w.ExcabaseSmartInsights.getState();
            assert(model.selected===selected&&d.getElementById('siActiveScenario').textContent.includes(w.ExcabaseFleetData.names[selected]),'active scenario '+label+'/'+selected);
            assert(d.getElementById('siScenario').value===d.getElementById('fleetSelectedScenario').value,'one synchronized scenario state');
            const rows=envelope.scenarios[selected].equipment;
            assert(model.overview.units===envelope.scenarios[selected].totalUnits&&model.overview.types===types.length,'overview counts actual units and types');
            assert(model.overview.duration===envelope.scenarios[selected].longestEquipmentDuration&&model.overview.cost===envelope.scenarios[selected].totalCost,'overview source totals');
            assert(d.querySelectorAll('[data-equipment]').length===types.length,'only active equipment cards');
            for(const equipment of model.equipment){
                const row=rows.find(row=>row.type===equipment.type);
                assert(equipment.total===row.totalProductivity&&equipment.perUnit===row.productivityPerUnit&&equipment.units===row.units,'equipment Q and units match source');
                assert(equipment.duration===row.durationDays&&equipment.cost===row.totalCost,'equipment duration and cost match source');
                if(equipment.type==='compactor')assert(equipment.passes===4&&equipment.thickness===.25,'stored compactor parameters preserved');
                const base=envelope.scenarios.dasar.equipment.find(e=>e.type===equipment.type),expected=(row.durationDays-base.durationDays)/base.durationDays*100;
                assert(Math.abs(equipment.durationChange.percent-expected)<1e-7,'equipment duration percent matches source');
                const details=d.querySelector('[data-equipment="'+equipment.type+'"] details');details.open=true;
                assert(details.querySelectorAll('.si-mini-chart .si-bar-row').length===3,'three functioning mini-chart bars');
            }
            for(const change of model.comparison){
                const s=envelope.scenarios[change.key],base=envelope.scenarios.dasar;
                assert(Math.abs(change.duration.percent-(s.longestEquipmentDuration-base.longestEquipmentDuration)/base.longestEquipmentDuration*100)<1e-7,'scenario duration percent');
                assert(Math.abs(change.cost.percent-(s.totalCost-base.totalCost)/base.totalCost*100)<1e-7,'scenario cost percent');
                assert(change.units.absolute===s.totalUnits-base.totalUnits,'scenario unit difference');
            }
            assert(model.durationDriver.verified,'duration maximum verified against original scenario');
            assert(d.querySelectorAll('#siDurationChart .si-driver').length===model.durationDriver.names.length,'all maximum-duration drivers visually marked');
            if(label==='six'){
                assert(!model.balance.valid&&!d.getElementById('siLoaderControl').hidden,'two loaders need confirmation');
                for(const choice of ['excavator','wheelloader']){
                    const selector=d.getElementById('siLoader');selector.value=choice;selector.dispatchEvent(new w.Event('change'));
                    model=w.ExcabaseSmartInsights.getState();
                    const q=rows.find(r=>r.type===choice).totalProductivity,truck=rows.find(r=>r.type==='dumptruck').totalProductivity;
                    assert(Math.abs(model.balance.ratio-truck/q*100)<1e-8,'explicit loader ratio '+choice);
                }
                const selector=d.getElementById('siLoader');selector.value='';selector.dispatchEvent(new w.Event('change'));
            }else if(!types.includes('dumptruck')){
                assert(!model.balance.valid&&d.getElementById('siBalanceValues').hidden,'no forced hauling model');
                assert(model.balanceIndicator.tone==='gray'&&d.getElementById('siGaugeValue').textContent==='—','missing pair gray without fake ratio');
            }else{
                const loader=rows.find(r=>r.type!=='dumptruck'),truck=rows.find(r=>r.type==='dumptruck');
                assert(model.balance.loading===loader.totalProductivity&&model.balance.hauling===truck.totalProductivity,'total scenario capacity directly');
                assert(Math.abs(model.balance.ratio-truck.totalProductivity/loader.totalProductivity*100)<1e-8,'ratio equals source');
            }
            for(const metric of ['duration','cost','units']){
                const control=d.getElementById('siMetric');control.value=metric;control.dispatchEvent(new w.Event('change'));
                const field={duration:'longestEquipmentDuration',cost:'totalCost',units:'totalUnits'}[metric];
                const bars=[...d.querySelectorAll('#siScenarioChart .si-bar-row')];
                assert(bars.length===3,'three scenario bars');
                for(const [i,key]of ['dasar','hemat','cepat'].entries()){
                    assert(bars[i].textContent.includes(Number(envelope.scenarios[key][field]).toLocaleString('id-ID',{maximumFractionDigits:2})),'chart value '+metric+'/'+key);
                    const max=Math.max(...['dasar','hemat','cepat'].map(k=>envelope.scenarios[k][field]));
                    const expected=max>0?envelope.scenarios[key][field]/max*100:0;
                    assert(Math.abs(parseFloat(bars[i].querySelector('.si-fill').style.width)-expected)<.0001,'bar scale follows selected metric');
                    assert(bars[i].classList.contains('si-active')===(key===selected),'active bar marked');
                }
            }
            assert(d.querySelectorAll('#siInsights li').length>=2&&d.querySelectorAll('#siInsights li').length<=6,'contextual recommendation cards');
            assert([...d.querySelectorAll('#siInsights li')].every(n=>n.querySelector('h4')&&n.querySelector('.si-recommendation-value')),'recommendations have titles and supporting values');
            assert(!/undefined|NaN|null/.test(panel.textContent),'no invalid visible text');
        }
        if(label==='ex'){
            d.getElementById('siCriticalLow').value='40';d.getElementById('siApplyThresholds').click();
            assert(w.ExcabaseSmartInsights.getState().balanceIndicator.tone==='yellow','session threshold changes indicator');
            d.getElementById('siCriticalLow').value='120';d.getElementById('siApplyThresholds').click();
            assert(!d.getElementById('siThresholdError').hidden&&w.ExcabaseSmartInsights.getState().thresholds.criticalLow===40,'invalid threshold rejected transparently');
            d.getElementById('siCriticalLow').value='70';d.getElementById('siApplyThresholds').click();
            d.getElementById('siToggle').click();assert(d.getElementById('siDashboard').inert,'close restores compact header');d.getElementById('siToggle').click();
        }
        assert(before===JSON.stringify({...localStorage})&&session===JSON.stringify({...sessionStorage}),'analysis never writes storage '+label);
        const oldUnits=w.ExcabaseSmartInsights.getState().scenarios.hemat.totalUnits;
        const units=d.querySelector('#fleetEquipmentHemat input[data-type]');units.value=Number(units.value)+2;units.dispatchEvent(new w.Event('input',{bubbles:true}));
        assert(panel.hidden,'changed inputs invalidate all-three result view');
        d.getElementById('calculateFleetScenarioBtn').click();
        assert(!panel.hidden&&w.ExcabaseSmartInsights.getState().scenarios.hemat.totalUnits===oldUnits+2,'recalculation refreshes numbers');
        const nav=d.querySelector('.project-step-navigation');assert(nav&&panel.getBoundingClientRect().bottom<=nav.getBoundingClientRect().top,'panel before report navigation');
        d.getElementById('resetFleetScenarioBtn').click();assert(panel.hidden,'reset invalidates insights');
        d.getElementById('calculateFleetScenarioBtn').click();
        localStorage.setItem('excabase_active_project',JSON.stringify(fixture(['excavator','dumptruck'],'different-project')));await wait(100);
        assert(panel.hidden&&w.ExcabaseSmartInsights.getState()===null,'project switching invalidates old display');
    }
    for(const [hourly,tone,side]of [[80,'red','pengangkutan'],[160,'green','setara'],[192,'yellow','pemuatan'],[480,'red','pemuatan']]){
        last=await open(fixture(['excavator','dumptruck'],'indicator-'+hourly,{truckHourly:hourly}));last.d.getElementById('calculateFleetScenarioBtn').click();
        const state=last.w.ExcabaseSmartInsights.getState();
        assert(state.balanceIndicator.tone===tone&&state.balanceIndicator.side===side,'actual producer ratio classification '+hourly);
        assert(last.d.getElementById('siBalanceStatus').classList.contains('si-'+tone),'visible status color');
        assert(last.d.getElementById('siGaugeValue').textContent===(hourly/160*100).toLocaleString('id-ID',{maximumFractionDigits:2})+'%','gauge ratio not clipped');
    }
    const mismatch=fixture(['excavator','dumptruck'],'mixed-basis');
    Object.assign(mismatch.results.estimate.equipment[1],{volumeBasis:'ccm',workVolumeBasis:'ccm'});mismatch.results.productivity.dumptruck.volumeBasis='ccm';
    last=await open(mismatch);last.d.getElementById('calculateFleetScenarioBtn').click();
    assert(!last.panel.hidden&&!last.w.ExcabaseSmartInsights.getState().balance.valid,'different bases show balance limitation');
    const area=fixture(['motorgrader'],'area-basis');Object.assign(area.results.estimate.equipment[0],{volumeBasis:'m2',workVolumeBasis:'m2'});area.results.productivity.motorgrader.volumeBasis='m2';
    last=await open(area);last.d.getElementById('calculateFleetScenarioBtn').click();
    assert(last.w.ExcabaseSmartInsights.getState().equipment[0].unit==='m²/jam'&&last.d.getElementById('siEquipmentGrid').textContent.includes('m²/jam'),'area productivity remains area based');
    const incomplete=fixture(['excavator','dumptruck'],'incomplete');incomplete.results.estimate.equipment[0].totalHourlyProductivity=null;
    last=await open(incomplete);assert(last.panel.hidden,'incomplete or stale estimate stays hidden');
    last=await open(fixture(['excavator','dumptruck'],'inconsistent-duration'));
    let diagnosticSource;last.d.addEventListener('excabase:fleet-visualization',e=>diagnosticSource=e.detail);
    last.d.getElementById('calculateFleetScenarioBtn').click();
    const diagnosticCopy=structuredClone(diagnosticSource),storedBefore=localStorage.getItem('excabase_active_project');
    diagnosticCopy.scenarios.dasar.equipment[0].durationDays+=10;
    last.d.dispatchEvent(new last.w.CustomEvent('excabase:fleet-visualization',{detail:diagnosticCopy}));
    assert(!last.w.ExcabaseSmartInsights.getState().durationDriver.verified&&last.d.getElementById('siDurationAssumption').textContent.includes('belum terverifikasi'),'inconsistent duration does not claim parallel model');
    assert(last.d.querySelectorAll('#siDurationChart .si-driver').length===0,'inconsistent duration has no claimed driver');
    assert(localStorage.getItem('excabase_active_project')===storedBefore,'inconsistent diagnostic fixture never repairs stored data');
    const p=fixture(allTypes,'responsive');last=await open(p);last.d.getElementById('calculateFleetScenarioBtn').click();
    const selector=last.d.getElementById('siLoader');selector.value='excavator';selector.dispatchEvent(new last.w.Event('change'));
    window.smartAuditFrame=frame;
    return {passed:true,assertions:checks};
};
