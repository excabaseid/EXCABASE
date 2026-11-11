(function(){
    'use strict';
    const panel=document.getElementById('smartInsights');if(!panel)return;
    const $=id=>document.getElementById(id),data=window.ExcabaseFleetData,model=window.ExcabaseSmartInsightsModel;
    const fmt=v=>Number(v).toLocaleString('id-ID',{maximumFractionDigits:2});
    let source=null,choice='',projectId=null,expanded=false,settings={...model.defaultThresholds};
    const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
    function current(){
        if(!source)return null;
        const p=getExcabaseActiveProject();
        try{data.verify(source,p);}catch{return null;}
        return model.analyze(source.scenarios,source.selected,choice,p.targetDays,{project:p,thresholds:settings});
    }
    function bar(root,label,value,max,unit,active=false){
        const row=el('div','si-bar-row'+(active?' si-active':''));row.tabIndex=0;
        const display=unit==='Rp'?'Rp'+fmt(value):fmt(value)+' '+unit;
        row.title=label+': '+display+(active?' · Skenario aktif':'');
        const heading=el('div','si-bar-label');heading.append(el('span','',label+(active?' · Aktif':'')),el('strong','',display));
        const track=el('div','si-track'),fill=el('div','si-fill');fill.style.width=(max>0?value/max*100:0)+'%';track.setAttribute('aria-hidden','true');track.append(fill);row.append(heading,track);root.append(row);return row;
    }
    function toggle(open){
        expanded=open;$('siToggle').textContent=open?'Tutup Smart Insights':'Buka Smart Insights';
        $('siToggle').setAttribute('aria-expanded',String(open));
        $('siDashboard').classList.toggle('si-open',open);$('siDashboard').inert=!open;$('siDashboard').setAttribute('aria-hidden',String(!open));
    }
    const value=(v,suffix='')=>v===null||!Number.isFinite(v)?'Belum tersedia':fmt(v)+suffix;
    const currency=v=>v===null||!Number.isFinite(v)?'Belum tersedia':'Rp'+fmt(v);
    const percent=c=>c.percent===null?'— ('+(c.reason||'Data belum cukup')+')':(c.percent>0?'+':'')+fmt(c.percent)+'%';
    const badge=(status)=>{const node=el('span','si-status si-'+status.tone,status.label);node.title=status.label==='Penentu durasi perencanaan'?'Durasi alat terbesar pada model paralel; bukan otomatis bottleneck lapangan.':'Indikator perencanaan dari data skenario, bukan efisiensi atau utilisasi aktual.';return node;};
    function metricList(entries){
        const dl=el('dl','si-metrics');for(const [label,text]of entries){const item=el('div');item.append(el('dt','',label),el('dd','',text));dl.append(item);}return dl;
    }
    function overview(r){
        $('siScenario').value=r.selected;$('siScenario').disabled=$('fleetSelectedScenario').disabled;
        const o=r.overview;
        $('siOverview').replaceChildren(...[['Skenario aktif',model.names[o.scenario]],['Estimasi durasi',fmt(o.duration)+' hari'],['Biaya operasional',currency(o.cost)],['Jumlah unit',fmt(o.units)+' unit'],['Jenis dianalisis',fmt(o.types)+' jenis']].map(([label,text])=>{
            const card=el('div','si-overview-card');card.append(el('span','',label),el('strong','si-number',text));if(label==='Estimasi durasi')card.title=r.durationDriver.verified?'Indikator durasi alat terlama; belum mencakup analisis ketergantungan pekerjaan.':'Indikator durasi sumber; hubungan dengan durasi alat belum terverifikasi.';return card;
        }));
        $('siScenarioChanges').replaceChildren(...r.comparison.filter(c=>c.key!=='dasar').map(c=>{
            const card=el('div','si-change-card');card.append(el('h4','',model.names[c.key]+' vs Dasar'));
            card.append(metricList([['Δ durasi',percent(c.duration)],['Δ biaya',percent(c.cost)],['Δ unit',(c.units.absolute>0?'+':'')+value(c.units.absolute,' unit')]]));
            if(c.tradeoff!==null)card.append(el('p','si-note',currency(c.tradeoff)+'/hari pengurangan durasi · biaya tambahan ÷ hari berkurang'));
            return card;
        }));
    }
    function performance(r){
        const open=new Set([...$('siEquipmentGrid').querySelectorAll('details[open]')].map(n=>n.dataset.type));
        $('siEquipmentGrid').replaceChildren(...r.equipment.map(e=>{
            const card=el('article','si-equipment-card');card.dataset.equipment=e.type;
            const heading=el('h4','',e.name),flags=el('div','si-flags');e.flags.forEach(f=>flags.append(badge(f)));
            card.append(heading,flags,metricList([['Unit aktif',value(e.units,' unit')],['Kapasitas total',e.unit?value(e.total,' '+e.unit):'Basis belum tersedia'],['Durasi pekerjaan',value(e.duration,' hari')],['Biaya operasional',currency(e.cost)]]));
            card.append(el('p','si-change-note','Δ durasi '+percent(e.durationChange)+' · Δ biaya '+percent(e.costChange)+' vs Dasar'));
            const details=el('details','si-equipment-details');details.dataset.type=e.type;details.open=open.has(e.type);
            details.append(el('summary','','Detail & perbandingan unit'));
            details.append(metricList([['Model alat',e.model||'Belum tercatat'],['Kapasitas per unit',e.unit?value(e.perUnit,' '+e.unit):'Basis belum tersedia']]));
            if(e.passes!==null||e.thickness!==null)details.append(metricList([['Lintasan sumber',value(e.passes,' pass')],['Tebal lapisan sumber',value(e.thickness,' m')]]));
            const mini=el('div','si-mini-chart');mini.setAttribute('role','group');mini.setAttribute('aria-label','Perbandingan jumlah unit '+e.name);
            const max=Math.max(0,...e.series.map(s=>s.units||0));
            e.series.forEach(s=>{if(s.units!==null)bar(mini,model.names[s.key],s.units,max,'unit',s.key===r.selected);else mini.append(el('p','si-note',model.names[s.key]+': unit belum tersedia'));});
            details.append(mini,el('p','si-note',e.insight));card.append(details);return card;
        }));
        const chart=$('siDurationChart'),valid=r.equipment.filter(e=>e.duration>0),max=Math.max(0,...valid.map(e=>e.duration));chart.replaceChildren();
        valid.forEach(e=>bar(chart,e.name+(e.driver?' · Penentu model':''),e.duration,max,'hari',false).classList.toggle('si-driver',e.driver));
        $('siDurationNote').textContent=r.durationDriver.verified?'Indikator skenario sesuai maksimum durasi alat. Penentu model: '+r.durationDriver.names.join(', ')+'. Pendekatan paralel ini bukan jadwal definitif atau bukti bottleneck operasional; ketergantungan pekerjaan perlu dianalisis terpisah.':'Durasi alat belum lengkap atau maksimum durasinya tidak sesuai indikator skenario. Penentu model belum dapat dipastikan; nilai sumber tidak diubah.';
        $('siInsights').style.setProperty('--si-recommend-columns',r.recommendations.length===4?2:3);
        $('siInsights').replaceChildren(...r.recommendations.map(item=>{
            const card=el('li','si-recommendation si-'+item.tone);card.append(el('span','si-recommendation-icon',item.icon),el('span','si-note',item.category),el('h4','',item.title),el('strong','si-recommendation-value',item.value),el('p','',item.text));return card;
        }));
    }
    function render(){
        const result=current();panel.hidden=!result;if(!result){toggle(false);return;}
        $('siActiveScenario').textContent='Aktif: '+model.names[result.selected];
        overview(result);
        $('siDurationAssumption').textContent=(result.durationDriver.verified?'Durasi memakai alat terlama dengan pendekatan pekerjaan paralel, bukan jadwal definitif.':'Indikator durasi sumber ditampilkan apa adanya; hubungan dengan durasi tiap alat belum terverifikasi. Asumsi jadwal tidak ditetapkan.')+' Setiap metrik memakai skala dan satuannya sendiri.';
        const metrics={duration:['longestEquipmentDuration','hari'],cost:['totalCost','Rp'],units:['totalUnits','unit']};
        const [field,unit]=metrics[$('siMetric').value]||metrics.duration;
        const chart=$('siScenarioChart');chart.replaceChildren();
        chart.setAttribute('aria-label','Perbandingan '+$('siMetric').selectedOptions[0].textContent);
        const max=Math.max(...Object.keys(model.names).map(key=>Number(result.scenarios[key][field])));
        for(const [key,name]of Object.entries(model.names))bar(chart,name,Number(result.scenarios[key][field]),max,unit,key===result.selected);
        const b=result.balance,select=$('siLoader');
        select.replaceChildren(new Option('Konfirmasi pasangan pemuat…',''));
        for(const key of b.candidates)select.add(new Option(key==='excavator'?'Excavator → Dump Truck':'Wheel Loader → Dump Truck',key));
        select.value=b.candidates.includes(choice)?choice:'';
        $('siLoaderControl').hidden=b.candidates.length<2||!b.hasTruck;
        $('siBalanceMessage').textContent=b.valid?b.detail:b.reason+'. '+b.detail;
        $('siBalanceValues').hidden=!b.valid;
        $('siBalanceChart').replaceChildren();
        const indicator=result.balanceIndicator;
        $('siBalanceStatus').textContent=indicator.label;$('siBalanceStatus').className='si-status si-'+indicator.tone;
        $('siGauge').className='si-gauge si-'+indicator.tone;
        $('siGauge').style.setProperty('--gauge-value',b.valid?Math.min(200,b.ratio)/2+'%':'0%');
        $('siGaugeValue').textContent=b.valid?fmt(b.ratio)+'%':'—';
        $('siGauge').setAttribute('aria-label',b.valid?'Rasio kapasitas '+fmt(b.ratio)+' persen. '+indicator.label:'Data belum cukup untuk rasio kapasitas');
        $('siBalanceLimiter').textContent=b.valid?(indicator.side==='setara'?'Kapasitas setara: ':'Pembatas potensial · '+indicator.side+': ')+fmt(indicator.capacity)+' m³/jam ('+b.basis+')':'Kapasitas pembatas belum dapat ditentukan.';
        $('siBalanceAdvice').textContent=indicator.advice;
        const t=result.thresholds;
        $('siThresholdLegend').textContent=t?'Hijau '+fmt(t.balancedLow)+'–'+fmt(t.balancedHigh)+'%; merah <'+fmt(t.criticalLow)+'% atau >'+fmt(t.criticalHigh)+'%; kuning di antaranya; abu-abu jika data belum cukup.':'Ambang belum valid.';
        if(b.valid){
            const maxCapacity=Math.max(b.loading,b.hauling),unit='m³/jam ('+b.basis+')';
            bar($('siBalanceChart'),b.loader==='excavator'?'Muat · Excavator':'Muat · Wheel Loader',b.loading,maxCapacity,unit);
            bar($('siBalanceChart'),'Angkut · Dump Truck',b.hauling,maxCapacity,unit);
            $('siRelationship').textContent=(b.loader==='excavator'?'EXCAVATOR':'WHEEL LOADER')+' → DUMP TRUCK';
            $('siRatioCaption').textContent='R = kapasitas angkut ÷ muat × 100%. Gauge 0–200%; '+(b.ratio>200?'lingkaran penuh, angka rasio tetap ditampilkan tanpa pembatasan.':'100% berarti kapasitas total setara, bukan efisiensi aktual.');
        }
        performance(result);
    }
    document.addEventListener('excabase:fleet-visualization',event=>{
        const next=event.detail;
        if(next?.projectId!==projectId){choice='';projectId=next?.projectId||null;toggle(false);$('siEquipmentGrid').replaceChildren();}
        // Clone the producer's envelope so this view cannot mutate scenario calculations.
        source=next?JSON.parse(JSON.stringify(next)):null;render();
    });
    $('siMetric').addEventListener('change',render);
    $('siToggle').addEventListener('click',()=>{if(current())toggle(!expanded);else render();});
    $('siScenario').addEventListener('change',()=>{
        if(!current()){render();return;}
        $('fleetSelectedScenario').value=$('siScenario').value;$('fleetSelectedScenario').dispatchEvent(new Event('change'));
    });
    $('siApplyThresholds').addEventListener('click',()=>{
        const values=Object.fromEntries(['criticalLow','balancedLow','balancedHigh','criticalHigh'].map(key=>{
            const text=$('si'+key[0].toUpperCase()+key.slice(1)).value;return [key,text.trim()===''?NaN:Number(text)];
        }));
        const valid=model.thresholds(values);$('siThresholdError').hidden=!!valid;
        if(!valid){$('siThresholdError').textContent='Gunakan 0 < merah bawah < hijau bawah ≤ 100 ≤ hijau atas < merah atas. Ambang sebelumnya tetap digunakan.';return;}
        settings=valid;render();
    });
    $('siLoader').addEventListener('change',()=>{choice=$('siLoader').value;render();});
    window.addEventListener('storage',render);
    window.addEventListener('focus',render);
    window.addEventListener('pageshow',render);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
    // Read-only diagnostics, useful for verifying displayed indicators.
    window.ExcabaseSmartInsights=Object.freeze({getState:()=>{const r=current();return r?JSON.parse(JSON.stringify(r)):null;}});
})();
