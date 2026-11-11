/* Presentation only: consumes saved results, never changes project data. */
(function (root) {
    'use strict';
    const names = {excavator:'Excavator',dumptruck:'Dump Truck',bulldozer:'Bulldozer',wheelloader:'Wheel Loader',motorgrader:'Motor Grader',compactor:'Compactor'};
    const scenarios = {dasar:'Dasar',hemat:'Hemat',cepat:'Cepat'};
    const numeric = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;
    const fmt = v => Number(v).toLocaleString('id-ID',{maximumFractionDigits:2});
    const money = v => 'Rp'+Number(v).toLocaleString('id-ID',{maximumFractionDigits:0});
    const functions = {excavator:'penggalian',dumptruck:'pengangkutan',bulldozer:'pendorongan tanah',wheelloader:'pemuatan atau pemindahan material',motorgrader:'perataan',compactor:'pemadatan'};
    function build({equipment=[],fleet={},longestDuration,totalCost,totalUnits}) {
        const analysis=[], conclusion=[];
        if (equipment.length) {
            const roles=[...new Set(equipment.map(e=>functions[e.type]).filter(Boolean))];
            analysis.push('Estimasi mencakup '+[...new Set(equipment.map(e=>names[e.type]||'alat lainnya'))].join(', ')+
                (numeric(totalUnits)?' sebanyak '+fmt(totalUnits)+' unit':'')+'. '+
                (roles.length?'Fungsi alat tersebut mencakup '+roles.join(', ')+'. ':'')+
                'Kesesuaian dengan kondisi lapangan tetap perlu dikonfirmasi melalui jenis material, geometri area kerja, dan urutan pelaksanaan.');
            const complete=equipment.filter(e=>numeric(e.workVolume)&&numeric(e.totalHourlyProductivity)&&Number(e.totalHourlyProductivity)>0&&/^(bcm|lcm|ccm)$/i.test(e.workVolumeBasis||''));
            const evidence=complete.slice(0,2).map(e=>(names[e.type]||'Alat')+' memiliki kapasitas total '+fmt(e.totalHourlyProductivity)+' m³/jam ('+e.workVolumeBasis.toUpperCase()+') untuk volume pekerjaan '+fmt(e.workVolume)+' '+e.workVolumeBasis.toUpperCase());
            analysis.push((evidence.length?evidence.join('; ')+'. ':'Data volume atau kapasitas per alat belum lengkap. ')+
                'Pada volume dan kondisi operasi yang tetap, kapasitas total armada berkaitan dengan kebutuhan waktu kerja; penambahan unit perlu mempertimbangkan ruang kerja dan waktu tunggu. Produktivitas pekerjaan atau basis BCM, LCM, dan CCM yang berbeda tidak dibandingkan langsung untuk menentukan bottleneck.');
        } else {
            analysis.push('Hasil Estimasi terbaru belum tersedia atau belum lengkap. Kesesuaian fungsi alat, kapasitas kerja, dan kebutuhan unit belum dapat dievaluasi dari data laporan ini.');
        }
        let schedule=numeric(longestDuration)?'Pendekatan durasi Estimasi sebesar '+fmt(longestDuration)+' hari menggunakan durasi alat terlama dan mengasumsikan pekerjaan berlangsung paralel. Angka ini bukan jadwal definitif; pekerjaan berurutan memerlukan analisis ketergantungan. ':'Durasi Estimasi belum lengkap sehingga pendekatan waktu pelaksanaan belum dapat ditafsirkan. ';
        schedule+=numeric(totalCost)?'Biaya operasional alat sebesar '+money(totalCost)+' belum mencakup seluruh biaya proyek konstruksi. ':'Biaya operasional belum lengkap dan belum dapat dinyatakan sebagai total yang pasti. ';
        const keys=Object.keys(scenarios).filter(k=>fleet.scenarios?.[k]);
        const complete=keys.length===3&&keys.every(k=>['totalUnits','totalCost','longestEquipmentDuration'].every(f=>numeric(fleet.scenarios[k][f])));
        // Compare only scenario results with identical work scope and volume bases.
        const scope=s=>Array.isArray(s.equipment)&&s.equipment.length?s.equipment.map(e=>{
            const basis=String(e.workVolumeBasis||'').toUpperCase();
            return numeric(e.workVolume)&&/^(BCM|LCM|CCM)$/.test(basis)&&e.type?JSON.stringify([e.type,Number(e.workVolume),basis]):null;
        }).sort():null;
        const scopes=keys.map(k=>scope(fleet.scenarios[k]));
        const comparable=complete&&scopes.every(s=>s&&s.every(Boolean)&&JSON.stringify(s)===JSON.stringify(scopes[0]));
        if (complete) {
            schedule+='Hasil tersimpan: '+keys.map(k=>scenarios[k]+' '+fmt(fleet.scenarios[k].totalUnits)+' unit, '+fmt(fleet.scenarios[k].longestEquipmentDuration)+' hari, '+money(fleet.scenarios[k].totalCost)).join('; ')+'. ';
            if(comparable) {
                const minCost=Math.min(...keys.map(k=>Number(fleet.scenarios[k].totalCost)));
                const minDays=Math.min(...keys.map(k=>Number(fleet.scenarios[k].longestEquipmentDuration)));
                const cheapest=keys.filter(k=>Number(fleet.scenarios[k].totalCost)===minCost).map(k=>scenarios[k]);
                const fastest=keys.filter(k=>Number(fleet.scenarios[k].longestEquipmentDuration)===minDays).map(k=>scenarios[k]);
                schedule+='Pada lingkup dan basis volume tersimpan yang sama, biaya terendah terdapat pada '+cheapest.join(', ')+', sedangkan durasi terpendek pada '+fastest.join(', ')+'. ';
                schedule+=cheapest.length===3&&fastest.length===3?'Biaya dan durasi ketiganya sama; tidak ada keunggulan waktu atau biaya yang membedakan.':'Pilihan armada perlu menimbang pengurangan waktu terhadap perubahan biaya, bukan menganggap penambahan unit selalu lebih ekonomis.';
            } else schedule+='Kesetaraan lingkup dan basis volume belum terverifikasi; peringkat ekonomi antar skenario belum dapat disimpulkan.';
        } else schedule+=keys.length?'Data tiga skenario belum lengkap; perbandingan biaya, unit, dan durasi belum dapat dilakukan secara utuh.':'Hasil Simulasi Armada belum tersedia; perbandingan skenario belum dapat dilakukan.';
        analysis.push(schedule);
        const selected=scenarios[fleet.selectedScenario]&&fleet.scenarios?.[fleet.selectedScenario];
        conclusion.push(equipment.length?'Perencanaan memberikan acuan awal kapasitas, durasi, dan biaya operasional alat sesuai pekerjaan masing-masing. '+
            (selected?'Pengguna memilih Skenario '+scenarios[fleet.selectedScenario]+'. '+
                (numeric(selected.longestEquipmentDuration)?'Indikator durasinya '+fmt(selected.longestEquipmentDuration)+' hari (alat terlama). ':'Durasi skenario belum lengkap. ')+
                (numeric(selected.totalCost)?'Biaya operasional alatnya '+money(selected.totalCost)+'.':'Biaya skenario belum lengkap.'):
                'Skenario akhir belum dipilih atau hasilnya belum tersedia; acuan laporan terbatas pada Estimasi.'):
            'Kesimpulan kuantitatif belum dapat dibuat sebelum hasil Estimasi terbaru tersedia.');
        conclusion.push((equipment.length>1?'Pemilihan armada perlu mempertimbangkan keterkaitan antaraktivitas dan waktu tunggu, bukan hanya jumlah unit. ':'Kebutuhan unit perlu ditinjau terhadap kapasitas kerja dan kondisi lapangan. ')+
            'Asumsi pekerjaan paralel, efisiensi kerja, serta biaya di luar operasi alat membatasi interpretasi hasil; laporan ini belum membuktikan optimalitas, kelayakan teknis, atau pemenuhan standar.');
        return {analysis,conclusion};
    }
    root.ExcabaseReportNarrative={build};
    if(typeof module!=='undefined'&&module.exports)module.exports={build};
})(typeof window!=='undefined'?window:globalThis);
