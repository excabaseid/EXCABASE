window.runFleetSpeedAudit=async function({assert,wait,open,save}){
    const seed=window.ExcabaseOperationsTestPreviews.six;
    save(seed.project);sessionStorage.setItem(ExcabaseFleetData.SESSION_KEY,JSON.stringify(seed.source));
    const before=localStorage.getItem('excabase_active_project');
    const d=await open('pages/fleet-visualization.html?fromProject=1&projectId=fv-audit&scenario=cepat'),w=d.defaultView;
    const speed=d.getElementById('fvSpeed');
    assert([...speed.options].map(o=>o.value).join(',')==='1,2,5,10,50,100','six speed options');
    const unload=d.getElementById('fv-unloadMinutes');if(unload)unload.value='1';
    d.getElementById('fvForm').requestSubmit();
    assert(!d.getElementById('fvPlay').disabled,'speed fixture applied');
    const config=JSON.stringify(w.ExcabaseFleetView.getConfig());
    for(const value of [1,10,50,100]){
        d.getElementById('fvReset').click();speed.value=String(value);speed.dispatchEvent(new w.Event('change'));
        const start=w.performance.now();d.getElementById('fvPlay').click();await wait(300);d.getElementById('fvPause').click();
        const elapsed=(w.performance.now()-start)/1000,state=w.ExcabaseFleetView.getState();
        assert(state.time>elapsed*value*.5&&state.time<elapsed*value*1.3,'real simulation clock multiplier '+value);
        assert(state.progress<=100&&state.extracted>=state.delivered&&state.remaining>=0,'mass bounds at speed '+value);
        assert(JSON.stringify(w.ExcabaseFleetView.getConfig())===config,'unchanged rates/units '+value);
        const paused=JSON.stringify(w.ExcabaseFleetView.getState());await wait(70);
        assert(JSON.stringify(w.ExcabaseFleetView.getState())===paused,'pause stable '+value);
    }
    d.getElementById('fvReset').click();speed.value='1';speed.dispatchEvent(new w.Event('change'));d.getElementById('fvPlay').click();await wait(120);
    const initial=w.ExcabaseFleetView.getState().time;
    speed.value='100';speed.dispatchEvent(new w.Event('change'));await wait(200);
    speed.value='10';speed.dispatchEvent(new w.Event('change'));await wait(120);d.getElementById('fvPause').click();
    assert(w.ExcabaseFleetView.getState().time-initial>8,'live switching accelerates engine time');
    d.getElementById('fvReset').click();assert(w.ExcabaseFleetView.getState().time===0,'reset clears playback backlog');
    assert(localStorage.getItem('excabase_active_project')===before,'speed controls preserve project data');
};
