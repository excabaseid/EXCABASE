/* Read-only interpretation of scenario results. No calculator or storage writes. */
(function(root){
    'use strict';
    const names={dasar:'Dasar',hemat:'Hemat',cepat:'Cepat'},keys=Object.keys(names);
    const equipmentNames={excavator:'Excavator',wheelloader:'Wheel Loader',dumptruck:'Dump Truck',bulldozer:'Bulldozer',motorgrader:'Motor Grader',compactor:'Compactor'};
    const num=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):NaN;
    const type=v=>String(v||'').toLowerCase().replace(/[^a-z]/g,'');
    const fmt=v=>Number(v).toLocaleString('id-ID',{maximumFractionDigits:2});
    const scope=s=>s.equipment.map(e=>[type(e.type),num(e.workVolume),String(e.workVolumeBasis||'').toLowerCase()]).sort((a,b)=>a[0].localeCompare(b[0]));
    const defaultThresholds=Object.freeze({criticalLow:70,balancedLow:90,balancedHigh:110,criticalHigh:140});
    function thresholds(values={}){
        const t={...defaultThresholds,...values};
        return Object.values(t).every(v=>Number.isFinite(v))&&t.criticalLow>0&&t.criticalLow<t.balancedLow&&t.balancedLow<=100&&t.balancedHigh>=100&&t.balancedHigh<t.criticalHigh?t:null;
    }
    const finite=v=>Number.isFinite(v)?v:null;
    const same=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
    function change(value,base){
        const v=num(value),b=num(base);
        const delta=same(v,b)?0:v-b;
        return {absolute:finite(delta),percent:b>0?finite(delta/b*100):null,reason:!Number.isFinite(v)||!Number.isFinite(b)?'Data belum lengkap':b===0?'Nilai Dasar nol':b<0?'Nilai Dasar tidak valid':null};
    }
    function indicator(balance,settings){
        const t=thresholds(settings);
        if(!balance.valid||!t)return {tone:'gray',label:'Data belum cukup',side:null,capacity:null,explanation:t?balance.detail:'Ambang heuristik tidak valid.',advice:'Lengkapi data atau konfirmasikan pasangan operasional sebelum menarik kesimpulan.'};
        const r=balance.ratio,side=Math.abs(r-100)<1e-8?'setara':r<100?'pengangkutan':'pemuatan';
        const epsilon=1e-8;
        const tone=r<t.criticalLow-epsilon||r>t.criticalHigh+epsilon?'red':r<t.balancedLow-epsilon||r>t.balancedHigh+epsilon?'yellow':'green';
        return {tone,label:{red:'Potensi hambatan kapasitas',yellow:'Perlu evaluasi',green:'Kapasitas relatif seimbang'}[tone],side,capacity:Math.min(balance.loading,balance.hauling),
            explanation:side==='setara'?'Kapasitas total muat dan angkut sama pada data skenario.':'Kapasitas '+side+' merupakan kapasitas pembatas potensial dalam pasangan ini.',
            advice:side==='pengangkutan'?'Evaluasi siklus angkut, jarak, kondisi jalan, dan kebutuhan unit truk.':side==='pemuatan'?'Evaluasi kapasitas pemuat dan jumlah unit truk terhadap pola pelayanan.':'Periksa siklus operasi dan kondisi lapangan; kesetaraan kapasitas tidak membuktikan bebas antrean.'};
    }
    function enrich(result,project={},settings){
        const {scenarios,selected,balance,comparable}=result,current=scenarios[selected],base=scenarios.dasar;
        const comparison=keys.map(key=>{
            const s=scenarios[key],duration=change(s.longestEquipmentDuration,base.longestEquipmentDuration),cost=change(s.totalCost,base.totalCost);
            const daysSaved=duration.absolute===null?NaN:-duration.absolute,extraCost=cost.absolute;
            return {key,duration,cost,units:change(s.totalUnits,base.totalUnits),tradeoff:comparable&&daysSaved>0&&extraCost>0?finite(extraCost/daysSaved):null};
        });
        const durations=current.equipment.map(e=>num(e.durationDays)),completeDurations=durations.every(v=>v>0),maxDuration=completeDurations?Math.max(...durations):null;
        const maxMatches=completeDurations&&Math.abs(maxDuration-num(current.longestEquipmentDuration))<=1e-8*Math.max(1,maxDuration);
        const bi=indicator(balance,settings);
        const roles={excavator:'Penggalian/pemuatan',dumptruck:'Pengangkutan',wheelloader:'Pemuatan atau pemindahan material',bulldozer:'Pendorongan tanah',motorgrader:'Perataan',compactor:'Pemadatan'};
        const items=Object.keys(equipmentNames).filter(t=>current.equipment.some(e=>type(e.type)===t)).map(t=>{
            const rows=current.equipment.filter(e=>type(e.type)===t),row=rows[0],baseRows=base.equipment.filter(e=>type(e.type)===t),b=baseRows[0],unique=rows.length===1;
            const basis=String(row.workVolumeBasis||'').toLowerCase(),unit=basis==='m2'?'m²/jam':['bcm','lcm','ccm'].includes(basis)?'m³/jam ('+basis.toUpperCase()+')':null;
            const ownComparable=unique&&baseRows.length===1&&scope({equipment:[row]})[0].slice(1).every((v,i)=>v===scope({equipment:[b]})[0][i+1])&&unit!==null;
            const unknown=()=>({absolute:null,percent:null,reason:'Lingkup/basis belum sebanding'});
            const d=ownComparable?change(row.durationDays,b.durationDays):unknown(),c=ownComparable?change(row.totalCost,b.totalCost):unknown();
            const driver=unique&&maxMatches&&Math.abs(num(row.durationDays)-maxDuration)<=1e-8*Math.max(1,maxDuration);
            const enough=rows.length===1&&unit&&num(row.totalProductivity)>0&&num(row.durationDays)>0;
            const flags=[];
            if(!enough)flags.push({tone:'gray',label:'Data belum cukup'});
            if(driver)flags.push({tone:'yellow',label:'Penentu durasi perencanaan'});
            if(d.percent!==null&&d.percent<0)flags.push({tone:'green',label:'Potensi pengurangan durasi'});
            else if(d.percent!==null&&d.percent>0)flags.push({tone:'yellow',label:'Perlu evaluasi kapasitas'});
            if(balance.valid&&bi.side!=='setara'&&(bi.side==='pengangkutan'?t==='dumptruck':t===balance.loader)&&bi.tone!=='green')flags.push({tone:bi.tone,label:'Potensi hambatan kapasitas'});
            if(!flags.length)flags.push({tone:'gray',label:d.percent===0?'Durasi tetap':'Data belum cukup'});
            const matches=Object.entries(project.results?.productivity||{}).find(([key])=>type(key)===t)?.[1];
            const inputs=Object.entries(project.results?.productivityInputs||{}).find(([key])=>type(key)===t)?.[1];
            const model=typeof matches?.model==='string'&&matches.model.trim()?matches.model.trim():typeof inputs?.model==='string'&&inputs.model.trim()?inputs.model.trim():null;
            const fields=inputs?.fields||{},prefix=t==='compactor'?'compactor':t==='motorgrader'?'grader':null;
            let insight=roles[t]+' dianalisis sesuai kapasitas total dan jumlah unit pada skenario aktif.';
            if(t==='bulldozer')insight+=' Pekerjaan dorong tidak dianggap sebagai pemuatan Dump Truck.';
            else if(t==='compactor')insight+=' Lintasan dan ketebalan mengikuti parameter kalkulator yang tersedia; hasil produktivitas bukan bukti kepadatan tanah yang disyaratkan.';
            else if(t==='motorgrader')insight+=' Basis luas atau volume dipertahankan; kapasitasnya tidak dibandingkan langsung dengan alat untuk fungsi lain.';
            else insight+=balance.valid&&(t===balance.loader||t==='dumptruck')?' Hubungan dengan truk hanya dinilai sebagai kapasitas potensial pada pasangan terpilih.':' Hubungan muat–angkut perlu dikonfirmasi sebelum menilai keseimbangan operasional.';
            return {type:t,name:equipmentNames[t],model,units:unique?num(row.units):null,perUnit:unique&&num(row.productivityPerUnit)>0?num(row.productivityPerUnit):null,total:unique&&num(row.totalProductivity)>0?num(row.totalProductivity):null,unit,duration:unique&&num(row.durationDays)>0?num(row.durationDays):null,cost:unique&&num(row.totalCost)>=0?num(row.totalCost):null,durationChange:d,costChange:c,driver,flags,insight,
                passes:prefix&&num(fields[prefix+'Passes'])>0?num(fields[prefix+'Passes']):null,thickness:prefix&&num(fields[prefix+'Thickness'])>0?num(fields[prefix+'Thickness']):null,
                series:keys.map(key=>{const matches=scenarios[key].equipment.filter(e=>type(e.type)===t);return {key,units:matches.length===1?finite(num(matches[0].units)):null};})};
        });
        const drivers=items.filter(e=>e.driver).map(e=>e.name);
        const recommendations=[{category:'Kapasitas armada',icon:'↔',title:bi.label,value:balance.valid?fmt(balance.ratio)+'%':'Data belum cukup',text:bi.explanation+' '+bi.advice,tone:bi.tone}];
        if(comparable){
            const minDays=Math.min(...keys.map(k=>num(scenarios[k].longestEquipmentDuration))),minCost=Math.min(...keys.map(k=>num(scenarios[k].totalCost)));
            recommendations.push({category:'Efisiensi waktu',icon:'◷',title:'Durasi skenario',value:fmt(minDays)+' hari',text:'Indikator durasi terpendek: '+keys.filter(k=>same(num(scenarios[k].longestEquipmentDuration),minDays)).map(k=>names[k]).join(', ')+'. Ini perbandingan hasil model, bukan bukti efisiensi aktual.',tone:'gray'});
            recommendations.push({category:'Pertimbangan biaya',icon:'Rp',title:'Biaya operasional terendah',value:'Rp'+fmt(minCost),text:keys.filter(k=>same(num(scenarios[k].totalCost),minCost)).map(k=>names[k]).join(', ')+'. Pertimbangkan target durasi; biaya ini bukan seluruh biaya proyek konstruksi.',tone:'gray'});
        }else recommendations.push({category:'Keterbatasan data',icon:'ⓘ',title:'Lingkup belum sebanding',value:'Tanpa peringkat',text:'Jenis, volume, atau basis pekerjaan antar skenario belum setara. Selisih ditampilkan sebagai data tersimpan, bukan bukti keunggulan ekonomi.',tone:'gray'});
        const trade=comparison.find(c=>c.key===selected&&c.tradeoff!==null);
        if(trade)recommendations.push({category:'Pertimbangan biaya',icon:'↗',title:'Biaya tambahan per hari berkurang',value:'Rp'+fmt(trade.tradeoff)+'/hari',text:'Tambahan biaya operasi dibagi pengurangan durasi terhadap Dasar. Tinjau manfaat pengurangan waktu sebelum memilih armada.',tone:'yellow'});
        if(drivers.length)recommendations.push({category:'Kinerja alat',icon:'◴',title:'Penentu durasi model',value:drivers.join(', '),text:'Durasi maksimum alat sesuai indikator skenario. Pendekatan ini mengasumsikan pekerjaan dapat paralel; urutan dan ketergantungan lapangan belum dianalisis.',tone:'yellow'});
        if(items.some(e=>e.flags.some(f=>f.label==='Data belum cukup')))recommendations.push({category:'Kelengkapan data',icon:'ⓘ',title:'Detail alat belum lengkap',value:'Periksa sumber',text:'Sebagian produktivitas, satuan, atau durasi alat belum tersedia. Tidak dilakukan pengisian angka perkiraan.',tone:'gray'});
        return {overview:{scenario:selected,duration:num(current.longestEquipmentDuration),cost:num(current.totalCost),units:num(current.totalUnits),types:items.length},comparison,equipment:items,durationDriver:{verified:maxMatches,maximum:maxDuration,names:drivers},balanceIndicator:bi,thresholds:thresholds(settings),recommendations};
    }
    function analyze(scenarios,selected,choice,targetDays,options={}){
        if(!names[selected]||!keys.every(k=>{
            const s=scenarios?.[k];return s&&num(s.totalCost)>=0&&num(s.longestEquipmentDuration)>0&&Number.isInteger(num(s.totalUnits))&&num(s.totalUnits)>0&&Array.isArray(s.equipment)&&s.equipment.length&&s.equipment.every(e=>e&&e.type&&Number.isInteger(num(e.units))&&num(e.units)>0);
        }))return null;
        const current=scenarios[selected],find=t=>current.equipment.filter(e=>type(e.type)===t);
        const candidates=['excavator','wheelloader'].filter(t=>find(t).length);
        const balance={valid:false,candidates,hasTruck:!!find('dumptruck').length,loader:null,reason:'Data belum cukup untuk analisis keseimbangan armada'};
        const loaderType=candidates.length===1?candidates[0]:candidates.includes(choice)?choice:null;
        if(!find('dumptruck').length)balance.detail='Dump Truck tidak tersedia. Pekerjaan dorong, perataan, dan pemadatan tidak diperlakukan sebagai pemuatan truk.';
        else if(!candidates.length)balance.detail='Tidak tersedia Excavator atau Wheel Loader sebagai calon alat pemuat.';
        else if(!loaderType)balance.detail='Dua jenis pemuat tersedia. Konfirmasikan alat yang melayani Dump Truck untuk analisis sesi ini; kapasitas keduanya tidak dijumlahkan.';
        else if(find(loaderType).length!==1||find('dumptruck').length!==1)balance.detail='Terdapat baris alat ganda; hubungan dan kapasitas armada perlu diperjelas.';
        else {
            const loader=find(loaderType)[0],truck=find('dumptruck')[0];
            const lb=String(loader.workVolumeBasis||'').toLowerCase(),tb=String(truck.workVolumeBasis||'').toLowerCase();
            const loading=num(loader.totalProductivity),hauling=num(truck.totalProductivity);
            const lv=num(loader.workVolume),tv=num(truck.workVolume);
            if(!['bcm','lcm','ccm'].includes(lb)||lb!==tb)balance.detail='Basis volume pemuat dan truk berbeda atau belum tersedia. Tidak dilakukan konversi atau perbandingan kapasitas secara otomatis.';
            else if(!(lv>0&&tv>0)||Math.abs(lv-tv)>1e-8*Math.max(lv,tv))balance.detail='Volume pekerjaan pasangan berbeda atau belum lengkap; kesetaraan lingkup material belum dapat dikonfirmasi.';
            else if(!(loading>0&&hauling>0)||!Number.isFinite(hauling/loading*100))balance.detail='Produktivitas total hasil skenario belum tersedia atau tidak valid.';
            else Object.assign(balance,{valid:true,loader:loaderType,loading,hauling,basis:lb.toUpperCase(),ratio:hauling/loading*100,
                detail:'Pasangan kapasitas potensial '+equipmentNames[loaderType]+'–Dump Truck. Pastikan kedua alat melayani material dan area kerja yang sama.'});
        }
        const scopes=keys.map(k=>scope(scenarios[k]));
        const comparable=scopes.every(s=>new Set(s.map(row=>row[0])).size===s.length&&s.every(([,v,b])=>Number.isFinite(v)&&v>0&&['bcm','lcm','ccm','m2'].includes(b))&&JSON.stringify(s)===JSON.stringify(scopes[0]));
        const insights=[];
        if(balance.valid){
            if(Math.abs(balance.ratio-100)<1e-8)insights.push('Kapasitas muat dan angkut setara pada data skenario. Kesetaraan kapasitas belum membuktikan utilisasi aktual atau bebas waktu tunggu.');
            else if(balance.ratio<100)insights.push('Kapasitas angkut '+fmt(balance.ratio)+'% dari kapasitas muat. Evaluasi kebutuhan armada angkut bersama jarak, siklus, dan kondisi jalan; rasio ini tidak menetapkan antrean aktual.');
            else insights.push('Kapasitas angkut '+fmt(balance.ratio)+'% dari kapasitas muat. Evaluasi jumlah unit dan biaya angkut terhadap kapasitas pemuatan; kelebihan kapasitas tidak langsung membuktikan alat menganggur.');
        }else insights.push(balance.detail);
        if(comparable){
            const costs=keys.map(k=>num(scenarios[k].totalCost)),days=keys.map(k=>num(scenarios[k].longestEquipmentDuration));
            const cheapest=keys.filter((k,i)=>costs[i]===Math.min(...costs));
            insights.push((cheapest.length===3?'Biaya operasional ketiga skenario sama.':'Biaya operasional tersimpan terendah: '+cheapest.map(k=>names[k]).join(', ')+'.')+' Keputusan tetap perlu mempertimbangkan target durasi dan kesetaraan kondisi operasi.');
            if(num(scenarios.cepat.totalCost)>num(scenarios.dasar.totalCost)&&num(scenarios.cepat.longestEquipmentDuration)<num(scenarios.dasar.longestEquipmentDuration))insights.push('Cepat memakai '+fmt(scenarios.cepat.totalUnits)+' unit: durasi lebih pendek daripada Dasar, dengan biaya operasional lebih tinggi. Tinjau manfaat penghematan waktu terhadap tambahan biaya.');
            else if(days.every(v=>v===days[0]))insights.push('Indikator durasi ketiga skenario sama; tidak ada pengurangan waktu yang membedakan hasil tersimpan.');
            else insights.push('Indikator durasi terpendek: '+keys.filter((k,i)=>days[i]===Math.min(...days)).map(k=>names[k]).join(', ')+'. Durasi alat terlama mengasumsikan pekerjaan paralel, bukan jadwal definitif.');
        }else insights.push('Lingkup atau basis pekerjaan antar skenario belum setara atau lengkap. Grafik menyajikan hasil tersimpan; peringkat ekonomi tidak disimpulkan.');
        const result={selected,scenarios,balance,insights,comparable,targetDays:num(targetDays)};
        return {...result,...enrich(result,options.project,options.thresholds)};
    }
    root.ExcabaseSmartInsightsModel={analyze,names,defaultThresholds,thresholds,change};
    if(typeof module!=='undefined'&&module.exports)module.exports=root.ExcabaseSmartInsightsModel;
})(typeof window!=='undefined'?window:globalThis);
