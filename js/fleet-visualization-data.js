/* Read-only adapter. Project/estimate/scenario records remain owned by EXCABASE. */
(function (root) {
    'use strict';
    const SESSION_KEY = 'excabase_fleet_visualization_v1';
    const names = { dasar: 'Dasar', hemat: 'Hemat', cepat: 'Cepat' };
    const number = value => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : null;
    function fingerprint(project) {
        return JSON.stringify([project.id, project.status, project.targetDays, project.workHoursPerDay,
            project.results?.estimate, project.results?.productivity, project.results?.productivityInputs, project.results?.earthwork, project.results?.fleet]);
    }
    function envelope(project, scenarios, selected) {
        return JSON.parse(JSON.stringify({ version: 1, projectId: String(project.id), selected,
            fingerprint: fingerprint(project), scenarios }));
    }
    function verify(source, project) {
        if (!project || !source || source.version !== 1 || String(project.id) !== source.projectId) throw new Error('Proyek visualisasi tidak cocok. Buka kembali melalui tahap Simulasi Armada.');
        if (fingerprint(project) !== source.fingerprint) throw new Error('Data proyek telah berubah. Kembali ke Simulasi, hitung ulang, lalu buka visualisasi terbaru.');
        if (String(project.status).toLowerCase() !== 'selesai' && !root.isExcabaseEstimateCurrent(project)) throw new Error('Estimasi tidak lagi sesuai produktivitas. Perbarui Estimasi dan Simulasi terlebih dahulu.');
        return true;
    }
    function toLCM(item, project) {
        const volume = number(item.workVolume), basis = String(item.workVolumeBasis || '').toLowerCase();
        if (!(volume > 0)) throw new Error('Volume pekerjaan skenario belum valid.');
        if (basis === 'lcm') return volume;
        const earth = project.results?.earthwork;
        const denominator = number(earth?.[basis]), loose = number(earth?.lcm);
        if (!['bcm', 'ccm'].includes(basis) || !(denominator > 0) || !(loose > 0)) throw new Error('Konversi volume ke LCM tidak tersedia. Lengkapi hasil Pekerjaan Tanah.');
        return volume * loose / denominator;
    }
    function context(source, project, key, legacyInputs = {}) {
        verify(source, project);
        const result = source.scenarios?.[key];
        if (!names[key] || !Array.isArray(result?.equipment)) throw new Error('Hasil skenario ini belum siap. Hitung Semua Skenario terlebih dahulu.');
        const find = type => result.equipment.find(item => item.type === type);
        const ex = find('excavator'), truck = find('dumptruck');
        if (!ex || !truck) throw new Error('Versi pertama memvisualisasikan pasangan Excavator dan Dump Truck. Skenario ini perlu memuat kedua jenis alat tersebut.');
        for (const item of [ex, truck]) if (!Number.isInteger(number(item.units)) || number(item.units) < 1) throw new Error('Jumlah alat pada skenario tidak valid.');
        if (Number(ex.units) + Number(truck.units) > 2000) throw new Error('Versi pertama mendukung maksimal 2.000 unit gabungan; tidak ada unit yang disembunyikan atau dikurangi otomatis.');
        const volume = toLCM(ex, project), truckVolume = toLCM(truck, project);
        if (Math.abs(volume - truckVolume) > 1e-6 * Math.max(volume, truckVolume)) throw new Error('Volume kerja Excavator dan Dump Truck berbeda setelah konversi LCM. Selaraskan volume pada Estimasi sebelum memvisualisasikan satu aliran material.');
        const input = type => project.results?.productivityInputs?.[type] || legacyInputs[type] || {};
        const exInput = input('excavator'), trInput = input('dumptruck');
        const ef = exInput.fields || {}, tf = trInput.fields || {};
        const params = {};
        const field = (keyName, value, origin) => { params[keyName] = { value: number(value), origin: number(value) === null ? 'Belum tersedia — isi untuk visualisasi' : origin }; };
        const exOrigin = project.results?.productivityInputs?.excavator ? 'Input Produktivitas proyek' : 'Input Produktivitas tersimpan per ID proyek';
        const trOrigin = project.results?.productivityInputs?.dumptruck ? 'Input Produktivitas proyek' : 'Input Produktivitas tersimpan per ID proyek';
        field('bucketCapacity', ef.bucket, exOrigin); field('fillFactor', ef.fillFactor, exOrigin);
        field('excavatorCycleSeconds', ef.cycleTime, exOrigin); field('excavatorEfficiency', ef.efficiency, exOrigin);
        field('truckCapacity', tf.truckCapacity, trOrigin); field('truckEfficiency', tf.truckEfficiency, trOrigin);
        field('totalCycleMinutes', tf.truckCycleTime, trOrigin + ' (siklus TOTAL)');
        field('workingHours', project.workHoursPerDay, 'Rencana jam kerja proyek');
        const help = trInput.parameterHelp?.truckCycleTime;
        const helpValid = help && !help.overriddenManually && !help.contextChanged && number(help.value) === number(tf.truckCycleTime) && help.method === 'cycle';
        const parts = helpValid ? help.inputs || {} : {};
        const bucketLoad = number(ef.bucket) * number(ef.fillFactor);
        const derivedLoading = bucketLoad > 0 && number(tf.truckCapacity) > 0 && number(ef.cycleTime) > 0
            ? Math.ceil(number(tf.truckCapacity) / bucketLoad) * number(ef.cycleTime) / 60 : null;
        field('referenceLoadingMinutes', number(parts.loading) ?? derivedLoading,
            number(parts.loading) !== null ? 'Komponen waktu muat Bantu Hitung siklus' : 'Turunan bucket × fill factor dan siklus, tanpa efisiensi; dapat dikoreksi');
        field('referenceQueueMinutes', 0, 'Asumsi awal: total siklus belum mengandung antrean. Koreksi bila ada');
        field('unloadMinutes', null, 'Input tambahan: bongkar dan manuver tanpa antrean');
        const distance = number(parts.distance), loaded = number(parts.loadedSpeed), empty = number(parts.returnSpeed);
        const outward = distance > 0 && loaded > 0 ? distance / 1000 / loaded * 60 : null;
        const inward = distance > 0 && empty > 0 ? distance / 1000 / empty * 60 : null;
        field('loadedTravelMinutes', outward, 'Jarak dan kecepatan bermuatan dari Bantu Hitung');
        field('returnTravelMinutes', inward, 'Jarak dan kecepatan kosong dari Bantu Hitung');
        field('outboundShare', outward > 0 && inward > 0 ? outward / (outward + inward) * 100 : 50,
            outward > 0 && inward > 0 ? 'Rasio waktu perjalanan Bantu Hitung' : 'Asumsi pembagian perjalanan 50:50; dapat diubah');
        return { key, name: names[key], projectName: project.name || 'Proyek', projectId: String(project.id), volumeLCM: volume,
            excavatorCount: Number(ex.units), truckCount: Number(truck.units), params,
            otherEquipment: result.equipment.filter(item => !['excavator', 'dumptruck'].includes(item.type)),
            estimateDays: result.longestEquipmentDuration, originalBasis: ex.workVolumeBasis };
    }
    function config(ctx, values, timingMode) {
        const c = { volumeLCM: ctx.volumeLCM, excavatorCount: ctx.excavatorCount, truckCount: ctx.truckCount };
        for (const key of ['bucketCapacity', 'fillFactor', 'excavatorCycleSeconds', 'excavatorEfficiency', 'truckCapacity', 'truckEfficiency', 'workingHours']) c[key] = number(values[key]);
        const unload = number(values.unloadMinutes);
        if (!(unload > 0)) throw new Error('Isi waktu bongkar/manuver yang positif, tanpa waktu antrean.');
        c.unloadSeconds = unload * 60;
        if (timingMode === 'total') {
            const total = number(values.totalCycleMinutes), loading = number(values.referenceLoadingMinutes), queue = number(values.referenceQueueMinutes), share = number(values.outboundShare);
            if (!(total > 0) || !(loading > 0) || queue === null || queue < 0 || !(share > 0 && share < 100)) throw new Error('Periksa siklus total, muat acuan, antrean acuan, dan pembagian perjalanan (0–100%, eksklusif).');
            const travel = total - loading - queue - unload;
            if (!(travel > 0)) throw new Error('Siklus total harus lebih besar dari muat acuan + antrean acuan + bongkar. Pilih rincian perjalanan bila definisi siklus berbeda.');
            c.loadedTravelSeconds = travel * share / 100 * 60;
            c.returnTravelSeconds = travel * (1 - share / 100) * 60;
        } else if (timingMode === 'segments') {
            c.loadedTravelSeconds = number(values.loadedTravelMinutes) * 60;
            c.returnTravelSeconds = number(values.returnTravelMinutes) * 60;
        } else throw new Error('Pilih definisi waktu perjalanan.');
        return root.ExcabaseFleetEngine.validate(c);
    }
    root.ExcabaseFleetData = { SESSION_KEY, names, fingerprint, envelope, verify, context, config };
})(typeof window !== 'undefined' ? window : globalThis);
