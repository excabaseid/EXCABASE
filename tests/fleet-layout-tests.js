/* Real DOM/layout regression. Fixture seeds are isolated by the existing disposable-profile runner. */
window.runFleetLayoutAudit=async function(helpers){
    'use strict';
    const {assert,near,wait,open,save}=helpers;
    const sources={one:window.ExcabaseOperationsTestPreviews.roller,three:window.ExcabaseBulldozerTestPreviews.combined,six:window.ExcabaseOperationsTestPreviews.six};
    const frame=document.querySelector('iframe');
    const format=(value,digits=2)=>Number(value).toLocaleString('id-ID',{maximumFractionDigits:digits});
    function apply(d){
        const w=d.defaultView,mode=d.getElementById('fvTimingMode');
        if(!mode.disabled){mode.value='segments';mode.dispatchEvent(new w.Event('change'));}
        for(const [key,value]of [['excavatorCycleSeconds','.2'],['bucketCapacity','4'],['dozerCycleSeconds','.4'],['loaderCycleSeconds','.4'],['graderLength','.1'],['compactorLength','.1'],['loadedTravelMinutes','.02'],['returnTravelMinutes','.02'],['unloadMinutes','.02']]){
            const input=d.getElementById('fv-'+key);if(input)input.value=value;
        }
        d.getElementById('fvForm').requestSubmit();assert(!d.getElementById('fvPlay').disabled,'layout parameters apply');
        d.getElementById('fvSpeed').value='10';d.getElementById('fvSpeed').dispatchEvent(new w.Event('change'));
    }
    for(const [mode,p]of Object.entries(sources)){
        save(p.project);sessionStorage.setItem(ExcabaseFleetData.SESSION_KEY,JSON.stringify(p.source));
        frame.style.width='1366px';
        const d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=cepat'),w=d.defaultView;
        assert(d.getElementById('fvError').hidden,'layout fixture opens '+mode);
        assert(!d.getElementById('fvDiagnostics')&&!d.getElementById('fvDownloadDiagnostics')&&typeof w.ExcabaseFleetView.getDiagnostics==='function','production diagnostics removed; internal API retained '+mode);
        assert(!Array.from(d.querySelectorAll('main a')).some(a=>a.getAttribute('href')?.startsWith('simulasi-armada.html')),'back links removed from production content '+mode);
        const before=localStorage.getItem('excabase_active_project'),list=localStorage.getItem('excabase_projects');
        apply(d);const configBefore=JSON.stringify(w.ExcabaseFleetView.getConfig());
        for(const width of [1920,1366,768,390,360]){
            frame.style.width=width+'px';await wait(350);
            const grid=d.getElementById('fvProgressGrid'),cards=Array.from(grid.children).filter(n=>!n.hidden),count={one:1,three:3,six:6}[mode];
            const columns=w.getComputedStyle(grid).gridTemplateColumns.split(' ').length,expectedColumns=Math.min(count,width<=600?1:width<=1024?2:3);
            assert(cards.length===count&&columns===expectedColumns,'visible cards and responsive columns '+mode+'/'+width+'/'+columns);
            if(count===6&&width>=1366){
                const tops=[...new Set(cards.map(card=>Math.round(card.getBoundingClientRect().top)))];
                assert(tops.length===2&&cards.slice(0,3).every(c=>Math.round(c.getBoundingClientRect().top)===tops[0]),'six cards use two rows of three '+width);
            }
            const canvas=d.getElementById('fvCanvas'),scene=d.querySelector('.fv-scene-panel'),wrap=d.querySelector('.fv-canvas-wrap');
            const r=canvas.getBoundingClientRect(),sceneRect=scene.getBoundingClientRect();
            assert(Math.abs(r.width-sceneRect.width+2)<2&&Math.abs(r.width-wrap.getBoundingClientRect().width)<1,'canvas spans full scene width '+mode+'/'+width);
            assert(canvas.width>=Math.floor(r.width*Math.min(w.devicePixelRatio||1,2))-1&&canvas.height>0,'canvas backing pixels follow display size '+mode+'/'+width);
            assert(d.documentElement.scrollWidth<=w.innerWidth,'no horizontal overflow '+mode+'/'+width);
            const order=[scene,d.querySelector('.fv-progress-section'),d.getElementById('fvOperationalSummary')];
            const truck=d.getElementById('fvTruckStatusPanel');if(!truck.hidden)order.push(truck);
            order.push(d.getElementById('fvActivityPanel'),d.getElementById('fvParameters'));
            assert(order.every((node,i)=>!i||order[i-1].getBoundingClientRect().bottom<=node.getBoundingClientRect().top+1),'mandatory vertical section order '+mode+'/'+width);
            assert(truck.hidden===(mode==='one'),'truck status hidden only without trucks '+mode+'/'+width);
            for(const id of ['fvPlay','fvPause','fvReset','fvSpeed','fvSceneZone','fvApply']){
                const cr=d.getElementById(id).getBoundingClientRect();assert(cr.width>0&&cr.height>=40&&cr.right<=w.innerWidth,'controls remain usable '+id+'/'+mode+'/'+width);
            }
            const old=w.ExcabaseFleetView.getState().time,pixels=canvas.toDataURL();
            d.getElementById('fvPlay').click();await wait(450);d.getElementById('fvPause').click();
            const s=w.ExcabaseFleetView.getState();
            assert(s.time>old&&canvas.toDataURL()!==pixels,'canvas still animates after resize '+mode+'/'+width);
            assert(JSON.stringify(w.ExcabaseFleetView.getConfig())===configBefore,'resize never changes model inputs '+mode+'/'+width);
            if(s.haulingEnabled)assert(near(d.getElementById('fvProgressBar').value,s.progress),'truck progress remains bound to engine '+mode+'/'+width);
            if(s.bulldozer){
                assert(near(d.getElementById('fvDozerProgressBar').value,s.bulldozer.progress)&&d.getElementById('fvDozerPushed').textContent.startsWith(format(s.bulldozer.pushed)),'dozer summary and moved details remain live '+mode+'/'+width);
            }
            if(s.grader)assert(near(d.getElementById('fv-grader-bar').value,s.grader.progress)&&d.getElementById('fv-grader-summary').textContent.includes(format(s.grader.completedArea)),'grader card and details remain live '+width);
            if(s.compactor)assert(near(d.getElementById('fv-compactor-bar').value,s.compactor.progress)&&d.getElementById('fv-compactor-summary').textContent.includes(format(s.compactor.completedArea)),'roller card and details remain live '+mode+'/'+width);
            if(mode!=='one'){
                assert(d.getElementById('fvExcavatorProgress').textContent===format(Math.min(100,s.extracted/s.total*100),1)+'%','excavator presentation follows existing extracted material '+width);
                const total=['fvLoading','fvHauling','fvUnloading','fvReturning','fvQueued','fvStandby'].reduce((sum,id)=>sum+Number(d.getElementById(id).textContent),0);
                assert(total===w.ExcabaseFleetView.getConfig().truckCount,'all moved truck states conserve selected count '+width);
            }
            assert(d.getElementById('fvTime').textContent!=='00:00:00'&&d.getElementById('fvLog').isConnected,'operational clock and activity log remain connected '+mode+'/'+width);
        }
        if(mode==='six'){
            d.getElementById('fvLoadingSource').value='wheelloader';d.getElementById('fvLoadingSource').dispatchEvent(new w.Event('change'));apply(d);
            d.getElementById('fvPlay').click();await wait(400);d.getElementById('fvPause').click();
            assert(d.getElementById('fvExcavatorProgress').textContent==='—'&&d.getElementById('fvExcavatorCard').textContent.includes('Siaga'),'idle Excavator card never fabricates progress');
            assert(near(d.getElementById('fv-loader-bar').value,w.ExcabaseFleetView.getState().loader.loadingProgress),'loader card stays live after loading-source change');
        }
        if(mode==='one'){
            const input=d.getElementById('fv-compactorLength'),exact='0.123456789123';input.value=exact;input.dispatchEvent(new w.Event('input',{bubbles:true}));
            const display=input.parentElement.querySelector('.fv-input-display');
            assert(input.value===exact&&display.textContent==='≈ 0,123','compact number display retains exact input value');
            input.focus();assert(w.getComputedStyle(display).visibility==='hidden'&&d.activeElement===input,'focused numeric input reveals full precision');input.blur();
            d.getElementById('fvForm').requestSubmit();assert(w.ExcabaseFleetView.getConfig().compactor.length===Number(exact)&&input.value===exact,'Apply uses original precision, never rounded preview');
        }
        d.getElementById('fvReset').click();assert(w.ExcabaseFleetView.getState().time===0,'Reset still works in redesigned layout '+mode);
        assert(localStorage.getItem('excabase_active_project')===before&&localStorage.getItem('excabase_projects')===list,'layout never writes project data '+mode);
    }
    window.ExcabaseLayoutTestPreviews=sources;
};
