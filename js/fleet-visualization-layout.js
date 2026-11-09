/* Presentation only: move/read existing counters. Never write config, engine state, or storage. */
(function(root){
    'use strict';
    const $=id=>document.getElementById(id);
    const format=(value,digits=2)=>Number(value).toLocaleString('id-ID',{maximumFractionDigits:digits});
    const cards={excavator:'fvExcavatorCard',truck:'fvTruckCard',dozer:'fvDozerPanel',loader:'fv-loader-panel',grader:'fv-grader-panel',compactor:'fv-compactor-panel'};
    const counts=ctx=>({excavator:ctx.excavatorCount,truck:ctx.truckCount,dozer:ctx.bulldozerCount,loader:ctx.loaderCount||0,grader:ctx.graderCount||0,compactor:ctx.compactorCount||0});
    const active=(ctx,key)=>key==='excavator'?ctx.haulingEnabled&&ctx.loadingSource!=='wheelloader':key==='truck'?ctx.haulingEnabled:key==='dozer'?!!ctx.bulldozer:key==='loader'?ctx.loaderActive:!!ctx[key];
    function setup(ctx){
        const quantities=counts(ctx);
        document.querySelector('.fv-progress-section').hidden=false;
        for(const [key,id]of Object.entries(cards))$(id).hidden=!(quantities[key]>0);
        $('fvProgressGrid').dataset.cardCount=Object.values(quantities).filter(n=>n>0).length;
        $('fvTruckStatusPanel').hidden=!(ctx.truckCount>0);
        $('fvAdditionalCounts').textContent=[quantities.loader,quantities.grader,quantities.compactor].join(' / ')+' unit';
    }
    function update(state,ctx){
        const quantities=counts(ctx);
        for(const [key,id]of Object.entries(cards)){
            if(!(quantities[key]>0))continue;
            const running=active(ctx,key),card=$(id);card.classList.toggle('fv-is-idle',!running);
            if(key==='truck'){
                $('fvHaulProgress').hidden=!running;$('fvTruckIdle').hidden=running;
                $('fvTruckCompact').textContent=running?quantities.truck+' unit · '+format(state?.delivered||0)+' / '+format(ctx.volumeLCM)+' m³ LCM di disposal. Di armada '+format(state?.inTransit||0)+' m³ · sisa '+format(state?.remaining??ctx.volumeLCM)+' m³.':'';
                continue;
            }
            const progress=$(key==='excavator'?'fvExcavatorProgress':key==='dozer'?'fvDozerProgress':'fv-'+key+'-progress');
            const bar=$(key==='excavator'?'fvExcavatorBar':key==='dozer'?'fvDozerProgressBar':'fv-'+key+'-bar');
            const compact=$(key==='excavator'?'fvExcavatorSummary':key==='dozer'?'fvDozerCompact':'fv-'+key+'-compact');
            const details=key==='excavator'?null:$(key==='dozer'?'fvDozerDetails':'fv-'+key+'-details');
            bar.hidden=!running;if(details)details.hidden=!running;
            if(key==='dozer')$('fvDozerSummary').hidden=false;
            if(!running){
                progress.textContent='—';
                compact.textContent=quantities[key]+' unit · Siaga. Progres operasional tidak tersedia dalam mode ini. Lihat cakupan operasi untuk keterangan pemuat atau data yang belum valid.';
                continue;
            }
            if(key==='excavator'){
                const picked=state?.extracted||0,percent=ctx.volumeLCM>0?Math.min(100,picked/ctx.volumeLCM*100):0;
                progress.textContent=format(percent,1)+'%';bar.value=percent;
                compact.textContent=quantities[key]+' unit · '+format(picked)+' / '+format(ctx.volumeLCM)+' m³ LCM diambil untuk pemuatan. Progres ini tidak ditambahkan lagi ke volume disposal.';
            }else if(key==='dozer'){
                compact.textContent=quantities[key]+' unit · '+format(state?.bulldozer?.pushed||0)+' / '+format(ctx.bulldozer.volume)+' m³ '+ctx.bulldozer.basis.toUpperCase()+' selesai didorong. Aktivitas terpisah dari pengangkutan.';
            }else if(key==='loader'){
                compact.textContent=quantities[key]+' unit · '+format(state?.loader?.completed||0)+' / '+format(ctx.wheelLoader.volumeLCM)+' m³ LCM '+(ctx.loadingSource==='wheelloader'?'dimuat ke truk.':'dipindah jarak pendek.')+' Bucket berisi '+format(state?.loader?.bucketLoad||0)+' m³.';
            }else{
                const s=state?.[key],m=ctx[key];
                compact.textContent=quantities[key]+' unit · '+(s?format(s.completedArea)+' / '+format(s.totalArea)+' m² selesai.':('Target '+format(m.target)+(m.basis==='m2'?' m².':' m³ '+m.basis.toUpperCase()+'.')))+' '+(s?.completedPasses||0)+' lintasan selesai'+(s?' · '+s.requiredPasses+' pass/petak.':'.')+(key==='compactor'?' Jumlah pass bukan bukti kepadatan teknis.':'');
            }
        }
    }
    function refreshInput(input){
        const display=input.parentElement.querySelector('.fv-input-display'),value=input.valueAsNumber;
        if(!display)return;
        const valid=input.value!==''&&Number.isFinite(value);display.hidden=!valid;input.classList.toggle('fv-compact-number',valid);
        if(valid){
            const approximate=Number(value.toFixed(3))!==value;
            display.textContent=(approximate?'≈ ':'')+format(value,3);
            input.title='Nilai penuh: '+input.value+(approximate?'. Tampilan ringkas dibulatkan; nilai perhitungan tetap penuh.':'. Fokus untuk mengedit.');
        }else input.removeAttribute('title');
    }
    function decorateField(wrapper,input,origin){
        const shell=document.createElement('div');shell.className='fv-input-shell';
        const display=document.createElement('span');display.className='fv-input-display';display.setAttribute('aria-hidden','true');
        input.before(shell);shell.append(input,display);
        const help=document.createElement('details');help.className='fv-field-help';
        const summary=document.createElement('summary');summary.textContent='Sumber & presisi';
        origin.before(help);help.append(summary,origin);
        input.addEventListener('input',()=>refreshInput(input));input.addEventListener('change',()=>refreshInput(input));refreshInput(input);
    }
    function refreshInputs(){document.querySelectorAll('.fv-input-shell input').forEach(refreshInput);}
    function fail(){
        document.querySelector('.fv-progress-section').hidden=true;$('fvTruckStatusPanel').hidden=true;$('fvAdditionalCounts').textContent='—';
    }
    root.ExcabaseFleetLayout={setup,update,decorateField,refreshInputs,fail};
})(window);
