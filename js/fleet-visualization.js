(function () {
    'use strict';
    const $ = id => document.getElementById(id), data = window.ExcabaseFleetData;
    const renderer = new window.ExcabaseFleetRenderer($('fvCanvas'));
    const format = (value, digits = 2) => Number(value).toLocaleString('id-ID', { maximumFractionDigits: digits });
    const clock = seconds => { const n = Math.floor(seconds); return [Math.floor(n / 3600), Math.floor(n / 60) % 60, n % 60].map(v => String(v).padStart(2, '0')).join(':'); };
    const fields = [
        ['bucketCapacity','Kapasitas bucket','m³ LCM','equipment',.001,null],
        ['fillFactor','Bucket fill factor','0–1,2','equipment',.001,1.2],
        ['excavatorCycleSeconds','Siklus Excavator','detik','equipment',.001,null],
        ['excavatorEfficiency','Efisiensi Excavator','0–1','equipment',.001,1],
        ['truckCapacity','Kapasitas muatan Dump Truck','m³ LCM','equipment',.001,null],
        ['truckEfficiency','Efisiensi Dump Truck','0–1','equipment',.001,1],
        ['workingHours','Jam kerja per hari','jam','common',.001,24],
        ['totalCycleMinutes','Siklus TOTAL proyek','menit','total',.001,null],
        ['referenceLoadingMinutes','Muat acuan di siklus TOTAL','menit','total',.001,null],
        ['referenceQueueMinutes','Antrean acuan di siklus TOTAL','menit','total',0,null],
        ['outboundShare','Bagian perjalanan bermuatan','% waktu perjalanan','total',.001,99.999],
        ['loadedTravelMinutes','Perjalanan bermuatan','menit, tanpa muat/antre','segments',.001,null],
        ['returnTravelMinutes','Perjalanan kembali','menit, tanpa bongkar/antre','segments',.001,null],
        ['unloadMinutes','Bongkar + manuver, tanpa antrean','menit','unload',.001,null],
        ['dozerCycleSeconds','Siklus efektif lengkap Bulldozer','detik','dozer',.001,null],
        ['dozerApproachShare','Bagian maju mendekati material','% siklus','dozer',.001,99],
        ['dozerPushShare','Bagian mendorong material','% siklus','dozer',.001,99],
        ['dozerReturnShare','Bagian mundur','% siklus','dozer',.001,99]
    ];
    const activeFields = () => fields.filter(([, , ,group]) => group==='common' || (group==='dozer'?!!context?.bulldozer:context?.haulingEnabled));
    let source, project, context, engine = null, playing = false, dirty = true, invalid = false;
    let frame = null, last = 0, lastDraw = 0, lastCheck = 0, speed = 1, lastLog = '';
    let sourceOrigin = 'belum tersedia', stage = 'membaca snapshot', lastFailure = null;
    const sourceLabels = {};
    function getDiagnostics() {
        const query = new URLSearchParams(location.search);
        return { sourceOrigin, stage, error: lastFailure, handoffMatches: query.has('handoff') ? query.get('handoff') === source?.handoffId : null,
            activities:context?{haulingEnabled:context.haulingEnabled,bulldozerEnabled:!!context.bulldozer,limitations:[...context.limitations]}:null,
            ...data.diagnostics(source, getProject(), $('fvScenario').value || query.get('scenario')) };
    }
    function showDiagnostics() { $('fvDiagnosticsOutput').textContent = JSON.stringify(getDiagnostics(),null,2); }
    function getProject() { return getExcabaseActiveProject(); }
    function pause(message) {
        playing = false;
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        $('fvPause').disabled = true;
        $('fvPlay').disabled = invalid || dirty || !engine || engine.finished;
        $('fvRunBadge').textContent = engine?.finished ? 'Selesai' : engine ? 'Dijeda' : 'Belum dimulai';
        if (message) $('fvStatus').textContent = message;
    }
    function fail(error) {
        lastFailure = error.message;
        invalid = true; pause();
        engine = null;
        $('fvCanvas').hidden = true;
        $('fvSceneMessage').hidden = false; $('fvSceneMessage').textContent = error.message;
        $('fvParameters').hidden = true;
        $('fvError').hidden = false; $('fvError').textContent = error.message;
        $('fvStatus').textContent = error.message;
        $('fvApply').disabled = true; $('fvReset').disabled = true;
        $('fvRunBadge').textContent = 'Visualisasi belum siap';
        for (const id of ['fvCounts','fvTotal','fvProgress','fvDelivered','fvExtracted','fvInTransit','fvRemaining','fvTime','fvDays','fvLoading','fvHauling','fvUnloading','fvReturning','fvQueued','fvStandby','fvDozerCount','fvDozerProgress','fvDozerTarget','fvDozerPushed','fvDozerInProgress','fvDozerRemaining','fvDozerRate','fvDozerTime','fvDozerStates']) $(id).textContent = '—';
        $('fvProgressBar').removeAttribute('value');
        showDiagnostics();
    }
    function verify() {
        data.verify(source, getProject());
        const query = new URLSearchParams(location.search);
        data.verifyHandoff(source, query.get('handoff'));
        if (query.get('projectId') && query.get('projectId') !== source.projectId) throw new Error('Identitas proyek pada tautan berbeda dari proyek visualisasi. Kembali ke Simulasi Armada.');
    }
    function legacy() {
        try { return JSON.parse(localStorage.getItem('excabase_productivity_' + project.id) || '{}'); }
        catch { return {}; }
    }
    function timingMode() {
        $('fvTimingMode').disabled=!context?.haulingEnabled;
        for (const mode of ['total','segments']) {
            const target = $(mode === 'total' ? 'fvTotalFields' : 'fvSegmentFields');
            target.hidden = !context?.haulingEnabled || mode !== $('fvTimingMode').value;
            target.querySelectorAll('input').forEach(input => { input.disabled = target.hidden; });
        }
        $('fvDeriveLoading').hidden = !context?.haulingEnabled || $('fvTimingMode').value !== 'total';
    }
    function parameters() {
        const containers = { equipment: $('fvEquipmentFields'), total: $('fvTotalFields'), segments: $('fvSegmentFields'), unload: $('fvUnloadFields'), common:$('fvCommonFields'), dozer:$('fvDozerFields') };
        Object.values(containers).forEach(node => node.replaceChildren());
        Object.keys(sourceLabels).forEach(key=>delete sourceLabels[key]);
        for (const [key, label, unit, group, min, max] of activeFields()) {
            const wrapper = document.createElement('div'), input = document.createElement('input'), title = document.createElement('label'), origin = document.createElement('small');
            input.id = 'fv-' + key; input.name = key; input.type = 'number'; input.step = 'any'; input.min = min; input.required = true;
            if (max !== null) input.max = max;
            input.inputMode = 'decimal'; input.value = context.params[key].value ?? ''; input.placeholder = 'Wajib diisi';
            origin.id = input.id + '-source'; input.setAttribute('aria-describedby', origin.id);
            title.htmlFor = input.id; title.textContent = label + ' (' + unit + ')';
            origin.textContent = context.params[key].origin; sourceLabels[key] = origin;
            wrapper.append(title,input,origin); containers[group].append(wrapper);
        }
        timingMode();
    }
    function clearMetrics() {
        update({ time: 0, total: context.volumeLCM, extracted:0, delivered: 0, inTransit: 0, remaining: context.volumeLCM, progress: 0,
            bulldozer:context.bulldozer?{time:0,pushed:0,inProgress:0,remaining:context.bulldozer.volume,progress:0,counts:{approaching:0,pushing:0,returning:0,waiting:0,standby:context.bulldozerCount}}:null,
            counts: { loading: 0, hauling: 0, unloading: 0, returning: 0, queued: context.haulingEnabled?context.truckCount:0, standby: context.haulingEnabled?0:context.truckCount } });
        lastLog = ''; $('fvLog').replaceChildren();
        const li = document.createElement('li'); li.textContent = 'Terapkan parameter untuk memulai.'; $('fvLog').append(li);
    }
    function choose(key) {
        try {
            lastFailure = null; stage = 'validasi snapshot';
            $('fvScenarioName').textContent = data.names[key] || '—';
            $('fvProjectName').textContent = project?.name || 'Proyek';
            verify(); pause(); engine = null; context = null; dirty = true; lastLog = '';
            const partition = data.partitionEquipment(source.scenarios?.[key]?.equipment || []);
            $('fvEquipmentNotice').textContent = partition.unsupported.length
                ? 'Belum didukung: ' + partition.unsupported.map(item => item.name + ': ' + item.units + ' unit').join(', ') + '. Produktivitasnya tidak dimasukkan ke model operasional.'
                : '';
            stage = 'membaca alat dan parameter skenario';
            context = data.context(source, project, key, legacy());
            const activities=[context.haulingEnabled?'Excavator–Dump Truck':null,context.bulldozer?'Bulldozer (dorong mandiri)':null].filter(Boolean);
            $('fvEquipmentNotice').textContent=['Animasi: '+activities.join(' dan ')+'.',$('fvEquipmentNotice').textContent,...context.limitations].filter(Boolean).join(' ');
            $('fvHaulingEquipment').hidden=!context.haulingEnabled; $('fvHaulingTiming').hidden=!context.haulingEnabled;
            $('fvHaulProgress').hidden=!context.haulingEnabled;
            document.querySelectorAll('.fv-haul-only').forEach(node=>node.hidden=!context.haulingEnabled);
            $('fvDozerPanel').hidden=!context.bulldozer; $('fvDozerSummary').hidden=!context.bulldozer; $('fvDozerParameters').hidden=!context.bulldozer;
            $('fvSceneTitle').textContent=context.haulingEnabled?(context.bulldozer?'Galian → Disposal · Dorong tanah':'Galian → Disposal'):'Dorong tanah · Bulldozer';
            $('fvCanvas').setAttribute('aria-label',activities.join(' dan ')+'. Posisi isometrik ilustratif; progres tiap aktivitas ditampilkan terpisah.');
            if(context.bulldozer){
                const b=context.bulldozer,unit=' m³ '+b.basis.toUpperCase();
                $('fvDozerTarget').textContent=format(b.volume)+unit;
                $('fvDozerRate').textContent=format(b.hourlyPerUnit*b.count)+unit+'/jam';
                $('fvDozerSource').textContent='Q acuan per unit: '+format(b.hourlyPerUnit)+unit+'/jam dari hasil skenario '+context.name+' × '+b.count+' unit. Target dorong terpisah: '+format(b.volume)+unit+'.';
            }
            $('fvCanvas').hidden = false; $('fvSceneMessage').hidden = true; $('fvParameters').hidden = false;
            invalid = false; $('fvError').hidden = true; $('fvApply').disabled = false; $('fvReset').disabled = true;
            $('fvProjectName').textContent = context.projectName; $('fvScenarioName').textContent = context.name;
            $('fvCounts').textContent = context.excavatorCount + ' / ' + context.truckCount + ' unit';
            $('fvDozerCount').textContent=context.bulldozerCount+' unit';
            $('fvTotal').textContent = context.haulingEnabled?format(context.volumeLCM) + ' m³ LCM':'—';
            $('fvOtherEquipment').textContent=$('fvEquipmentNotice').textContent;
            parameters(); clearMetrics(); stage = 'inisialisasi renderer'; renderer.setContext(context); renderer.draw(null);
            $('fvTimingSummary').textContent = '';
            $('fvRunBadge').textContent = 'Siap dikonfigurasi';
            $('fvStatus').textContent = 'Skenario ' + context.name + ': ' + activities.join(' dan ') + '. Periksa sumber parameter dan isi data/asumsi yang belum tersedia, lalu Terapkan.';
            stage = 'siap dikonfigurasi'; showDiagnostics();
        } catch (error) { fail(error); }
    }
    function update(state) {
        const set = (id,value) => { if ($(id).textContent !== value) $(id).textContent = value; };
        set('fvProgress', format(state.progress,1) + '%'); $('fvProgressBar').value = state.progress;
        set('fvExtracted',format(state.extracted||0)+' m³');
        set('fvDelivered', format(state.delivered) + ' m³'); set('fvInTransit', format(state.inTransit) + ' m³');
        set('fvRemaining', format(state.remaining) + ' m³'); set('fvTime',clock(state.time));
        set('fvDays', format(engine ? state.time / (engine.config.workingHours * 3600) : 0,3));
        for (const name of ['loading','hauling','unloading','returning','queued','standby']) set('fv' + name[0].toUpperCase() + name.slice(1), String(state.counts[name]));
        if(state.bulldozer){
            const b=state.bulldozer,unit=' m³ '+context.bulldozer.basis.toUpperCase();
            set('fvDozerProgress',format(b.progress,1)+'%');$('fvDozerProgressBar').value=b.progress;
            set('fvDozerPushed',format(b.pushed)+unit);set('fvDozerInProgress',format(b.inProgress)+unit);set('fvDozerRemaining',format(b.remaining)+unit);set('fvDozerTime',clock(b.time));
            set('fvDozerStates','Maju '+b.counts.approaching+' · Dorong '+b.counts.pushing+' · Mundur '+b.counts.returning+' · Jeda '+b.counts.waiting+' · Siaga '+b.counts.standby);
        }
        if (engine?.log.length) {
            const latest = engine.log.at(-1), signature = latest.time + latest.message;
            if (signature !== lastLog) {
                lastLog = signature; $('fvLog').replaceChildren();
                engine.log.slice(-6).reverse().forEach(event => { const li = document.createElement('li'); li.textContent = clock(event.time) + ' · ' + event.message; $('fvLog').append(li); });
            }
        }
    }
    function tick(now) {
        if (!playing) return;
        if (now - lastCheck > 1000) {
            lastCheck = now;
            try { verify(); } catch (error) { fail(error); return; }
        }
        try {
        const dt = Math.min(.25, Math.max(0, (now - last) / 1000)); last = now;
        const state = engine.advance(dt * speed);
        const units = context.excavatorCount + context.truckCount + context.bulldozerCount;
        const fps = units > 500 ? 8 : units > 120 ? 15 : 30;
        if (now - lastDraw >= 1000 / fps || state.finished) { lastDraw = now; renderer.draw(engine); update(state); }
        if (state.finished) { pause('Selesai: seluruh aktivitas operasional mencapai target masing-masing dan alat kembali siaga. Reset untuk mengulang.'); return; }
        frame = requestAnimationFrame(tick);
        } catch(error) { fail(error); }
    }
    $('fvForm').addEventListener('submit', event => {
        event.preventDefault();
        try {
            verify();
            const values = Object.fromEntries(activeFields().map(([key]) => [key,$('fv-' + key).value]));
            const cfg = data.config(context,values,$('fvTimingMode').value);
            stage = 'inisialisasi engine';
            pause(); engine = new window.ExcabaseFleetEngine.FleetEngine(cfg); dirty = false;
            $('fvPlay').disabled = false; $('fvReset').disabled = false; $('fvError').hidden = true;
            renderer.draw(engine); update(engine.snapshot());
            lastFailure = null; stage = 'siap diputar'; showDiagnostics();
            $('fvRunBadge').textContent = 'Siap diputar'; $('fvStatus').textContent = 'Konfigurasi diterapkan. Klik Play untuk memulai waktu kerja simulasi.';
            const summaries=[];
            if(context.haulingEnabled)summaries.push('Perjalanan bermuatan ' + format(cfg.loadedTravelSeconds / 60) + ' menit; bongkar ' + format(cfg.unloadSeconds / 60) + ' menit; kembali ' + format(cfg.returnTravelSeconds / 60) + ' menit (sebelum efisiensi truk). Muat per bucket ' + format(cfg.excavatorCycleSeconds / cfg.excavatorEfficiency) + ' detik efektif. Antrean berasal dari model.');
            if(cfg.bulldozer){const b=cfg.bulldozer;summaries.push('Bulldozer: siklus efektif '+format(b.cycleSeconds)+' detik; volume acuan '+format(b.hourlyPerUnit*b.cycleSeconds/3600)+' m³ '+b.basis.toUpperCase()+'/unit/siklus. Jeda '+format(100-b.approachShare-b.pushShare-b.returnShare)+'%. Fase animasi bersifat asumsi; produktivitas tetap Q skenario.');}
            $('fvTimingSummary').textContent=summaries.join(' ')+' Jam kerja '+format(cfg.workingHours)+' jam/hari. Volume dorong dan disposal tidak dijumlahkan.';
        } catch (error) { lastFailure = error.message; dirty = true; pause(error.message); $('fvError').hidden = false; $('fvError').textContent = error.message; showDiagnostics(); }
    });
    function markDirty(event) {
        if (invalid) return;
        dirty = true; pause('Parameter berubah. Klik Terapkan & reset simulasi sebelum melanjutkan.');
        if (event?.target.name && sourceLabels[event.target.name]) sourceLabels[event.target.name].textContent = 'Input tambahan/penyesuaian sesi visualisasi — tidak mengubah data proyek';
    }
    $('fvForm').addEventListener('input',markDirty);
    $('fvTimingMode').addEventListener('change', () => { timingMode(); markDirty(); });
    $('fvDeriveLoading').addEventListener('click', () => {
        const bucket=Number($('fv-bucketCapacity').value),fill=Number($('fv-fillFactor').value),cycle=Number($('fv-excavatorCycleSeconds').value),capacity=Number($('fv-truckCapacity').value);
        if (!(bucket>0&&fill>0&&cycle>0&&capacity>0)) { $('fvStatus').textContent='Isi kapasitas bucket, fill factor, siklus Excavator, dan kapasitas truk terlebih dahulu.'; return; }
        $('fv-referenceLoadingMinutes').value = Math.ceil(capacity/(bucket*fill))*cycle/60;
        sourceLabels.referenceLoadingMinutes.textContent='Turunan input sesi: jumlah bucket bulat × siklus mentah; tanpa efisiensi.'; markDirty();
    });
    $('fvPlay').addEventListener('click', () => {
        try {
            verify(); if (!engine || dirty || engine.finished || playing) return;
            playing=true;last=performance.now();lastCheck=last;lastDraw=0;
            $('fvPlay').disabled=true;$('fvPause').disabled=false;$('fvRunBadge').textContent='Berjalan';
            $('fvStatus').textContent='Simulasi berjalan. Kecepatan hanya mengubah pemutaran waktu, bukan kapasitas atau produktivitas model.';
            frame=requestAnimationFrame(tick);
        } catch(error) { fail(error); }
    });
    $('fvPause').addEventListener('click', () => pause('Dijeda. Waktu dan seluruh muatan dipertahankan.'));
    $('fvReset').addEventListener('click', () => {
        try { verify(); pause(); if (!engine) return; engine.reset(); lastLog=''; $('fvLog').replaceChildren();
            renderer.draw(engine); update(engine.snapshot());
            $('fvPlay').disabled=dirty; $('fvRunBadge').textContent='Diatur ulang'; $('fvStatus').textContent='Simulasi kembali ke awal. Data proyek dan skenario tetap tersimpan.';
        } catch(error) { fail(error); }
    });
    $('fvSpeed').addEventListener('change', () => { const value=Number($('fvSpeed').value); speed=[1,2,5,10].includes(value)?value:1; });
    $('fvScenario').addEventListener('change', () => choose($('fvScenario').value));
    document.addEventListener('visibilitychange', () => { if (document.hidden&&playing) pause('Dijeda karena tab tidak aktif. Klik Play saat kembali.'); });
    window.addEventListener('pagehide', () => pause());
    window.addEventListener('pageshow', () => { if(source)try{verify();}catch(error){fail(error);} });
    window.addEventListener('storage', event => {
        if (!source) return;
        if(event.key==='excabase_productivity_'+source.projectId) { fail(new Error('Input Produktivitas proyek berubah di tab lain. Buka visualisasi terbaru melalui Simulasi.')); return; }
        if(event.key===null||event.key==='excabase_active_project'||event.key==='excabase_projects')try{verify();}catch(error){fail(error);}
    });
    const observer=new ResizeObserver(() => { renderer.resize(); renderer.draw(engine); }); observer.observe($('fvCanvas'));
    // Read-only diagnostics for accessible integration tests and troubleshooting.
    window.ExcabaseFleetView=Object.freeze({ getState:()=>engine?{...engine.snapshot(),playing,dirty,invalid}:null, getConfig:()=>engine?{...engine.config}:null, getDiagnostics });
    $('fvDiagnostics').addEventListener('toggle', () => { if ($('fvDiagnostics').open) showDiagnostics(); });
    $('fvDownloadDiagnostics').addEventListener('click', () => {
        showDiagnostics();
        const url = URL.createObjectURL(new Blob([JSON.stringify(getDiagnostics(),null,2)],{type:'application/json'}));
        const link = document.createElement('a'); link.href=url; link.download='excabase-fleet-diagnostics.json'; link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    try {
        project=getProject();
        if(!project)throw new Error('Proyek aktif tidak ditemukan. Buka fitur melalui tahap Simulasi Armada.');
        const query=new URLSearchParams(location.search);
        try{source=JSON.parse(sessionStorage.getItem(data.SESSION_KEY)||'null');if(source)sourceOrigin='sessionStorage';}catch{source=null;sourceOrigin='sessionStorage JSON tidak valid';}
        if(!source) {
            const saved=project.results?.fleet;
            if(!saved||saved.estimateSignature!==getExcabaseEstimateSignature(project))throw new Error('Hasil visualisasi tidak tersedia pada tab ini. Kembali ke Simulasi, hitung skenario, dan klik Visualisasikan Armada.');
            source=data.envelope(project,saved.scenarios,saved.selectedScenario);
            sourceOrigin='hasil skenario tersimpan';
        }
        verify();
        for(const key of ['dasar','hemat','cepat']) {
            if(!source.scenarios?.[key])continue;
            const option=document.createElement('option');option.value=key;option.textContent=data.names[key];$('fvScenario').append(option);
        }
        const selected=query.get('scenario')||source.selected;
        if(!source.scenarios?.[selected])throw new Error('Skenario yang diminta belum dihitung. Kembali ke Simulasi Armada.');
        $('fvScenario').value=selected;$('fvScenario').disabled=false;choose(selected);
    } catch(error) { fail(error); }
})();
