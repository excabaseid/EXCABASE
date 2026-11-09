/* Additional activity controls share lifecycle, never share incompatible progress units. */
(function(root){
    'use strict';
    const $=id=>document.getElementById(id),format=v=>Number(v).toLocaleString('id-ID',{maximumFractionDigits:2});
    const definitions={loader:{name:'Wheel Loader',group:'loader',fields:[['loaderCycleSeconds','Siklus efektif lengkap Wheel Loader','detik','loader',.001,null]]},
        grader:{name:'Motor Grader',fields:[['graderThickness','Tebal lapisan untuk konversi luas','m','grader',.001,null],['graderWidth','Lebar efektif blade','m','grader',.001,null],['graderPasses','Lintasan yang diperlukan per petak','pass','grader',1,1000],['graderLength','Panjang petak grading (asumsi)','m','grader',.001,null]]},
        compactor:{name:'Compactor / Roller',fields:[['compactorThickness','Tebal akhir lapisan padat','m','compactor',.001,null],['compactorWidth','Lebar efektif drum setelah overlap','m','compactor',.001,null],['compactorPasses','Lintasan pemadatan per petak','pass','compactor',1,1000],['compactorLength','Panjang petak pemadatan (asumsi)','m','compactor',.001,null]]}};
    function element(tag,text){const node=document.createElement(tag);if(text)node.textContent=text;return node;}
    const slot=$('fvProgressGrid');
    for(const [key,d]of Object.entries(definitions)){
        const panel=element('section');panel.className='fv-activity';panel.id='fv-'+key+'-panel';panel.hidden=true;
        const title=element('h3',d.name),progress=element('strong');progress.id='fv-'+key+'-progress';
        const number=element('div');number.className='fv-progress-number';number.append(progress);
        const bar=element('progress');bar.max=100;bar.value=0;bar.id='fv-'+key+'-bar';bar.setAttribute('aria-label','Progres '+d.name);bar.style.width='100%';
        const summary=element('p');summary.id='fv-'+key+'-summary';summary.className='fv-footnote';
        const compact=element('p');compact.id='fv-'+key+'-compact';compact.className='fv-footnote';
        const workDetails=element('details');workDetails.id='fv-'+key+'-details';workDetails.className='fv-work-details';workDetails.append(element('summary','Rincian pekerjaan & satuan'),summary);
        panel.append(title,number,bar,compact,workDetails);slot.append(panel);
        const fieldset=element('fieldset');fieldset.id='fv-'+key+'-parameters';fieldset.hidden=true;
        const source=element('p');source.id='fv-'+key+'-source';source.className='fv-footnote';
        const fields=element('div');fields.className='fv-field-grid';fields.id='fv-'+key+'-fields';
        const help=element('details');help.className='fv-help';help.append(element('summary','Sumber data & asumsi'),source);
        fieldset.append(element('legend',d.name+' · parameter lokal'),help,fields);$('fvForm').insertBefore(fieldset,$('fvApply'));
    }
    function model(ctx,key){return key==='loader'?(ctx?.loaderActive?ctx.wheelLoader:null):ctx?.[key];}
    function setup(ctx){
        const zones=$('fvSceneZone');zones.replaceChildren();
        for(const [value,title]of [['all','Semua zona'],[ctx.haulingEnabled||ctx.excavatorCount||ctx.truckCount?'earthmoving':null,'Galian / angkut'],[ctx.bulldozerCount?'dozer':null,'Bulldozer'],[ctx.loaderCount?'loader':null,'Wheel Loader'],[ctx.graderCount?'grader':null,'Motor Grader'],[ctx.compactorCount?'compactor':null,'Compactor']])if(value){const option=element('option',title);option.value=value;zones.append(option);}
        const select=$('fvLoadingSource');select.replaceChildren();
        for(const key of ctx.loadingChoices||[]){const option=element('option',key==='excavator'?'Excavator':'Wheel Loader');option.value=key;select.append(option);}
        select.value=ctx.loadingSource;$('fvLoadingSourceWrap').hidden=!(ctx.loadingChoices?.length);
        for(const key of Object.keys(definitions)){
            const m=model(ctx,key);$('fv-'+key+'-panel').hidden=!m;$('fv-'+key+'-parameters').hidden=!m;
            if(m)$('fv-'+key+'-source').textContent=key==='loader'?'Q per unit '+format(m.hourlyPerUnit)+' m³ LCM/jam, '+m.count+' unit, target '+format(m.volumeLCM)+' m³ LCM. Siklus efektif dari input/efisiensi jika tersedia; jika kosong wajib diisi sebagai asumsi. Fase animasi 10% maju, 15% ambil, 10% angkat, 20% menuju tujuan, 10% dumping, 35% kembali. Q tidak dikalikan efisiensi lagi. '+(ctx.loadingSource==='wheelloader'?'Bucket benar-benar dimuat ke truk; volume muat tidak dijumlahkan ke disposal.':'Pemindahan pendek ke stockpile tujuan, bukan pengangkutan truk.'):
                'Q skenario per unit '+format(m.hourlyPerUnit)+(m.basis==='m2'?' m²/jam':' m³ '+m.basis.toUpperCase()+'/jam')+', target '+format(m.target)+(m.basis==='m2'?' m²':' m³ '+m.basis.toUpperCase())+'. Untuk sumber volume: luas = volume ÷ tebal; Q luas = Q volume ÷ tebal. Lebar dan jumlah lintasan dari input jika tersedia; panjang petak adalah asumsi. Kecepatan sumber '+(m.speed==null?'belum tersedia':format(m.speed)+' km/jam')+', efisiensi '+(m.efficiency==null?'belum tersedia':format(m.efficiency))+'. Q efektif sudah mencakup efisiensi/lintasan; tidak diterapkan lagi. Fase 10% masuk, 80% bekerja, 10% berputar adalah ilustrasi, bukan pengukuran laju kendaraan. '+(m.conversion||'')+(key==='compactor'?' Jumlah pass hanyalah kriteria visual operasi, bukan bukti kepadatan teknis tanah.':'');
        }
    }
    function update(state,ctx){
        for(const key of Object.keys(definitions)){
            const m=model(ctx,key);if(!m)continue;
            const s=state?.[key],progress=key==='loader'&&ctx.haulingEnabled?s?.loadingProgress:s?.progress;
            $('fv-'+key+'-progress').textContent=format(progress||0)+'%';$('fv-'+key+'-bar').value=progress||0;
            if(key==='loader')$('fv-'+key+'-summary').textContent=(ctx.loadingSource==='wheelloader'?'Dimuat ke truk: ':'Dipindah jarak pendek: ')+format(s?.completed||0)+' / '+format(m.volumeLCM)+' m³ LCM. '+m.count+' unit · Q acuan '+format(m.count*m.hourlyPerUnit)+' m³ LCM/jam. Bucket berisi '+format(s?.bucketLoad||0)+' m³. '+Object.entries(s?.phases||{}).map(([name,n])=>name+': '+n).join(' · ');
            else{
                const thickness=ctx.params[key+'Thickness'].value,area=s?.totalArea??(m.basis==='m2'?m.target:thickness>0?m.target/thickness:null);
                const rate=s?.hourlyArea??(m.basis==='m2'?m.hourlyPerUnit:thickness>0?m.hourlyPerUnit/thickness:null);
                $('fv-'+key+'-summary').textContent=area===null?'Luas belum ditentukan; isi tebal lapisan.':format(s?.completedArea||0)+' / '+format(area)+' m² selesai. '+m.count+' unit; Q luas acuan '+format(rate*m.count)+' m²/jam. '+(s?.completedPasses||0)+' lintasan selesai; syarat '+(s?.requiredPasses||ctx.params[key+'Passes'].value||'—')+' pass per petak. Cakupan seluruh pass '+format(s?.passProgress||0)+'%. '+(s?.volumeCompleted!=null?'Volume ekuivalen '+format(s.volumeCompleted)+' m³ '+m.basis.toUpperCase()+'. ':'')+'Progres luas/volume ini tidak dijumlahkan ke pengangkutan.'+(key==='compactor'?' Tidak menyatakan kepadatan teknis tercapai.':'');
            }
        }
    }
    root.ExcabaseFleetControls={fields:Object.values(definitions).flatMap(d=>d.fields),containers:()=>Object.fromEntries(Object.keys(definitions).map(key=>[key,$('fv-'+key+'-fields')])),active:(group,ctx,key)=>definitions[group]?!!model(ctx,group)&&!(key===group+'Thickness'&&ctx[group]?.basis==='m2'):undefined,setup,update,fail:()=>Object.keys(definitions).forEach(key=>{$('fv-'+key+'-panel').hidden=true;$('fv-'+key+'-parameters').hidden=true;}),names:ctx=>[ctx.loaderActive&&ctx.loadingSource!=='wheelloader'?'Wheel Loader (pemindahan pendek)':null,ctx.grader?'Motor Grader':null,ctx.compactor?'Compactor':null].filter(Boolean)};
})(window);
