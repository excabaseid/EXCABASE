/* Read-only additional activities; all model inputs remain local to visualization. */
(function(root){
    'use strict';
    const D=root.ExcabaseFleetData;
    const num=v=>v!==''&&v!=null&&Number.isFinite(Number(v))?Number(v):null;
    const find=(rows,type)=>{const matches=rows.filter(row=>D.normalizeType(row?.type)===type);if(matches.length>1)throw new Error('Baris '+type+' ganda pada snapshot. Hitung Semua Skenario.');return matches[0];};
    const input=(project,legacy,type)=>{
        const from=records=>Object.entries(records||{}).find(([key])=>D.normalizeType(key)===type)?.[1];
        return (from(project.results?.productivityInputs)||from(legacy)||{}).fields||{};
    };
    const field=(ctx,key,value,origin)=>{ctx.params[key]={value:num(value),origin:num(value)===null?'Input tambahan wajib/asumsi: '+origin:origin};};
    function read(result,project,legacy){
        const models={},counts={},reasons=[];
        for(const type of ['wheelloader','motorgrader','compactor']){
            const item=find(result.equipment,type);if(!item)continue;
            const count=num(item.units),q=num(item.productivityPerUnit??item.hourlyProductivity),volume=num(item.workVolume);
            counts[type]=Number.isInteger(count)&&count>0?count:0;
            if(!Number.isInteger(count)||count<1||!(q>0)||!(volume>0)){reasons.push(D.equipmentTypes[type].name+' belum dapat dioperasikan: units, produktivitas per unit, atau target belum valid. Hitung Semua Skenario.');continue;}
            try{
                const fields=input(project,legacy,type);
                if(type==='wheelloader'){
                    const volumeLCM=D.toLCM(item,project),cycle=num(fields.loaderCycleTime),eff=num(fields.loaderEfficiency);
                    if(!Number.isFinite(volumeLCM)||!Number.isFinite(q*volumeLCM/volume))throw new Error('Konversi volume/Q tidak valid atau terlalu besar.');
                    models.wheelLoader={count,volumeLCM,hourlyPerUnit:q*volumeLCM/volume,cycleSeconds:cycle>0&&eff>0&&eff<=1?cycle/eff:null};
                }else{
                    let basis=String(item.workVolumeBasis||'').trim().toLowerCase().replace('m²','m2'),target=volume,hourly=q;
                    if(!['m2','bcm','lcm','ccm'].includes(basis))throw new Error('Basis target tidak dikenal. Gunakan m2 atau basis volume yang jelas.');
                    let conversion=null;
                    if(type==='compactor'&&!['m2','ccm'].includes(basis)){
                        const earth=project.results?.earthwork,from=num(earth?.[basis]),ccm=num(earth?.ccm);
                        if(!(from>0&&ccm>0))throw new Error('Konversi ke CCM belum tersedia pada hasil Pekerjaan Tanah. Tidak mengasumsikan volume lepas sama dengan volume padat.');
                        target=volume*ccm/from;hourly=q*ccm/from;conversion='Volume dan Q dikonversi '+basis.toUpperCase()+' → CCM memakai rasio hasil Pekerjaan Tanah.';basis='ccm';
                    }
                    if(!Number.isFinite(target)||!Number.isFinite(hourly))throw new Error('Konversi volume/Q tidak valid atau terlalu besar.');
                    const key=type==='motorgrader'?'grader':'compactor';
                    models[key]={count,target,hourlyPerUnit:hourly,basis,conversion,thickness:num(fields[key+'Thickness']),width:num(fields[key+'Width']),passes:num(fields[key+'Passes']),speed:num(fields[key+'Speed']),efficiency:num(fields[key+'Efficiency'])};
                }
            }catch(error){reasons.push(D.equipmentTypes[type].name+': '+error.message);}
        }
        return {models,counts,reasons,available:Object.keys(models).length>0};
    }
    function prefersLoader(extra,ex,truck,project,options){
        const loader=extra.models?.wheelLoader;if(!loader||!truck||options.loadingSource==='excavator')return false;
        if(options.loadingSource==='wheelloader'||!ex)return true;
        try{
            const target=D.toLCM(truck,project),same=(a,b)=>Math.abs(a-b)<=1e-6*Math.max(a,b);
            if(!same(loader.volumeLCM,target))return false;
            try{return !same(D.toLCM(ex,project),target);}catch{return true;}
        }catch{return false;}
    }
    function finalize(ctx,extra,result,project,options){
        ctx.loaderCount=extra.counts?.wheelloader||0;ctx.wheelLoader=extra.models?.wheelLoader||null;
        ctx.graderCount=extra.counts?.motorgrader||0;ctx.grader=extra.models?.grader||null;
        ctx.compactorCount=extra.counts?.compactor||0;ctx.compactor=extra.models?.compactor||null;
        ctx.loadingSource=ctx.haulingEnabled?'excavator':ctx.truckCount&&ctx.wheelLoader?'wheelloader':'none';
        if(options.loadingSource==='wheelloader'&&ctx.truckCount&&ctx.wheelLoader)ctx.loadingSource='wheelloader';
        ctx.loadingChoices=[ctx.excavatorCount&&ctx.truckCount?'excavator':null,ctx.wheelLoader&&ctx.truckCount?'wheelloader':null].filter(Boolean);
        if(ctx.loadingSource==='wheelloader'){
            const truck=find(result.equipment,'dumptruck'),target=D.toLCM(truck,project);
            if(Math.abs(target-ctx.wheelLoader.volumeLCM)>1e-6*Math.max(target,ctx.wheelLoader.volumeLCM))throw new Error('Volume Wheel Loader dan Dump Truck berbeda setelah konversi LCM. Selaraskan hasil Estimasi, lalu Hitung Semua Skenario.');
            ctx.haulingEnabled=true;ctx.volumeLCM=target;
            ctx.limitations=ctx.limitations.filter(text=>!text.startsWith('Dump Truck siaga:')&&!text.startsWith('Excavator siaga:'));
            if(ctx.excavatorCount)ctx.limitations.push('Excavator siaga: armada truk dilayani Wheel Loader yang dipilih.');
            const payload=ctx.wheelLoader.hourlyPerUnit*ctx.wheelLoader.cycleSeconds/3600;
            field(ctx,'referenceLoadingMinutes',payload>0?Math.ceil(ctx.params.truckCapacity.value/payload)*ctx.wheelLoader.cycleSeconds/60:null,'Turunan siklus efektif Wheel Loader dan kapasitas truk; koreksi bila definisi siklus TOTAL berbeda');
        }
        ctx.loaderActive=!!ctx.wheelLoader&&(ctx.loadingSource==='wheelloader'||!ctx.truckCount);
        if(ctx.wheelLoader&&!ctx.loaderActive)ctx.limitations.push('Wheel Loader siaga: armada truk memakai Excavator. Pilih Wheel Loader sebagai sumber pemuat untuk menjalankan loading; target yang sama tidak dihitung sebagai pekerjaan tambahan.');
        ctx.limitations.push(...(extra.reasons||[]));
        ctx.limitations=ctx.limitations.map(text=>text.startsWith('Dump Truck siaga:')?'Dump Truck siaga: belum ada pemuat Excavator/Wheel Loader yang valid. Dorong, grading, dan pemadatan tidak memuat truk.':text);
        if(ctx.loaderActive)field(ctx,'loaderCycleSeconds',ctx.wheelLoader.cycleSeconds,'Siklus efektif Wheel Loader = input siklus ÷ efisiensi jika tersedia; jika kosong isi asumsi siklus lengkap. Q tetap dari skenario');
        for(const key of ['grader','compactor'])if(ctx[key]){
            const m=ctx[key];
            for(const [suffix,value,origin]of [['Thickness',m.thickness,'Tebal lapisan (m), wajib untuk mengubah volume menjadi luas; tidak digunakan untuk sumber m²'],['Width',m.width,'Lebar efektif setelah overlap dari input produktivitas; jika kosong tentukan asumsi'],['Passes',m.passes,'Lintasan per petak dari input produktivitas; jika kosong wajib diisi'],['Length',20,'Asumsi panjang petak 20 m; dapat diubah, bukan hasil survei']])field(ctx,key+suffix,value,origin);
        }
        const total=ctx.excavatorCount+ctx.truckCount+ctx.bulldozerCount+ctx.loaderCount+ctx.graderCount+ctx.compactorCount;
        if(total>2000)throw new Error('Visualisasi mendukung maksimal 2.000 unit; jumlah skenario tidak dipotong.');
        return ctx;
    }
    function configure(ctx,values,c){
        if(ctx.loaderActive){
            c.wheelLoader={...ctx.wheelLoader,cycleSeconds:num(values.loaderCycleSeconds),truckCount:ctx.loadingSource==='wheelloader'?ctx.truckCount:0};
            if(ctx.loadingSource==='wheelloader'){
                c.haulingSource='wheelloader';
                for(const key of ['truckCapacity','truckEfficiency','loadedTravelSeconds','unloadSeconds','returnTravelSeconds'])c.wheelLoader[key]=c[key];
            }
        }
        for(const key of ['grader','compactor'])if(ctx[key]){
            const m=ctx[key],t=num(values[key+'Thickness']),areaSource=m.basis==='m2';
            if(!areaSource&&!(t>0))throw new Error(key+': tebal lapisan wajib untuk konversi m³ ke m².');
            c[key]={count:m.count,area:areaSource?m.target:m.target/t,hourlyArea:areaSource?m.hourlyPerUnit:m.hourlyPerUnit/t,width:num(values[key+'Width']),length:num(values[key+'Length']),passes:num(values[key+'Passes']),volume:areaSource?null:m.target,thickness:areaSource?null:t,basis:m.basis};
        }
    }
    root.ExcabaseFleetOperations={read,finalize,configure,prefersLoader,num,input,find,field};
})(window);
