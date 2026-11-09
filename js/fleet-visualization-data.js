/* Read-only adapter. Project/estimate/scenario records remain owned by EXCABASE. */
(function (root) {
    'use strict';
    const SESSION_KEY = 'excabase_fleet_visualization_v1';
    const names = { dasar: 'Dasar', hemat: 'Hemat', cepat: 'Cepat' };
    // Capabilities belong to the visualization adapter, never to project formulas.
    const equipmentTypes = Object.freeze({
        excavator: Object.freeze({ name: 'Excavator', operational: true }),
        dumptruck: Object.freeze({ name: 'Dump Truck', operational: true }),
        bulldozer: Object.freeze({ name: 'Bulldozer', operational: true }),
        wheelloader: Object.freeze({ name: 'Wheel Loader', operational: false }),
        motorgrader: Object.freeze({ name: 'Motor Grader', operational: false }),
        compactor: Object.freeze({ name: 'Compactor', operational: false })
    });
    const normalizeType = type => String(type ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    function partitionEquipment(equipment) {
        const supported = [], unsupported = [];
        if (!Array.isArray(equipment)) throw new Error('Struktur equipment pada snapshot harus berupa array. Kembali ke Simulasi Armada, klik Hitung Semua Skenario, lalu buka ulang Visualisasikan Armada.');
        for (const item of equipment) {
            const type = normalizeType(item?.type), capability = equipmentTypes[type];
            const entry = { ...item, type, name: capability?.name || String(item?.type || 'Jenis alat tidak dikenal') };
            (capability?.operational ? supported : unsupported).push(entry);
        }
        return { supported, unsupported };
    }
    const number = value => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : null;
    function diagnostics(source, project, key) {
        const shape = value => Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
        const scalar = value => ['string','number','boolean'].includes(typeof value) ? value : null;
        const describe = equipment => ({ shape: shape(equipment),
            keys: equipment && !Array.isArray(equipment) && typeof equipment === 'object' ? Object.keys(equipment) : [],
            rows: Array.isArray(equipment) ? equipment.map((item,index) => ({ index,
                fields: item && typeof item === 'object' ? Object.keys(item) : [],
                type: scalar(item?.type), normalizedType: normalizeType(item?.type),
                operational: equipmentTypes[normalizeType(item?.type)]?.operational === true,
                units: scalar(item?.units), workVolume: scalar(item?.workVolume), workVolumeBasis: scalar(item?.workVolumeBasis)
            })) : [] });
        return { diagnosticVersion: 1, snapshotVersion: scalar(source?.version), selectedScenario: scalar(source?.selected), requestedScenario: scalar(key),
            projectMatches: !!source && !!project && source.projectId === String(project.id),
            fingerprintMatches: !!project && source?.fingerprint === fingerprint(project),
            estimateCurrent: !!project && !!root.isExcabaseEstimateCurrent(project),
            scenarioKeys: Object.keys(source?.scenarios || {}),
            estimate: describe(project?.results?.estimate?.equipment),
            snapshot: Object.fromEntries(Object.keys(names).map(name => [name,describe(source?.scenarios?.[name]?.equipment)])),
            saved: Object.fromEntries(Object.keys(names).map(name => [name,describe(project?.results?.fleet?.scenarios?.[name]?.equipment)])) };
    }
    function fingerprint(project) {
        return JSON.stringify([project.id, project.status, project.targetDays, project.workHoursPerDay,
            project.results?.estimate, project.results?.productivity, project.results?.productivityInputs, project.results?.earthwork, project.results?.fleet]);
    }
    function envelope(project, scenarios, selected) {
        return JSON.parse(JSON.stringify({ version: 1, projectId: String(project.id), selected,
            handoffId: root.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
            fingerprint: fingerprint(project), scenarios }));
    }
    function verifyHandoff(source, expectedId) {
        if (expectedId && source?.handoffId !== expectedId) throw new Error('Snapshot pada tab ini berbeda dari tautan visualisasi (snapshot lama atau tertimpa). Kembali ke Simulasi Armada, klik Hitung Semua Skenario, lalu buka ulang Visualisasikan Armada.');
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
    function bulldozerContext(item, project, legacyInputs) {
        if(!item)return {model:null,reason:null};
        const count=number(item.units),volume=number(item.workVolume),basis=String(item.workVolumeBasis||'').trim().toLowerCase();
        const hourlyPerUnit=number(item.productivityPerUnit ?? item.hourlyProductivity);
        if(!Number.isInteger(count)||count<1||!(volume>0)||!['lcm','bcm','ccm'].includes(basis)||!(hourlyPerUnit>0)) {
            return {model:null,reason:'Bulldozer belum dapat dioperasikan: periksa units, workVolume, workVolumeBasis, dan productivityPerUnit pada hasil skenario. Hitung Semua Skenario lalu buka ulang visualisasi.'};
        }
        const find=records=>Object.entries(records||{}).find(([type])=>normalizeType(type)==='bulldozer')?.[1];
        const fields=(find(project.results?.productivityInputs)||find(legacyInputs)||{}).fields||{};
        const rawCycle=number(fields.dozerCycleTime),efficiency=number(fields.dozerEfficiency);
        const cycleSeconds=rawCycle>0&&efficiency>0&&efficiency<=1?rawCycle/efficiency:null;
        return {model:{count,volume,basis,hourlyPerUnit,cycleSeconds},reason:null};
    }
    function context(source, project, key, legacyInputs = {}) {
        verify(source, project);
        const result = source.scenarios?.[key];
        if (!names[key] || !result) throw new Error('Hasil skenario ini belum siap. Hitung Semua Skenario terlebih dahulu.');
        const { supported, unsupported } = partitionEquipment(result.equipment);
        const find = type => {
            const matches = supported.filter(item => item.type === type);
            if (matches.length > 1) throw new Error('Snapshot memuat lebih dari satu baris ' + equipmentTypes[type].name + '. Buka ulang hasil skenario yang valid.');
            return matches[0];
        };
        const ex = find('excavator'), truck = find('dumptruck'), dozer = find('bulldozer');
        const bulldozer = bulldozerContext(dozer,project,legacyInputs), haulingEnabled = !!ex && !!truck;
        if (!haulingEnabled && !bulldozer.model) {
            const missing = [!ex && 'excavator', !truck && 'dumptruck'].filter(Boolean);
            const expected = partitionEquipment(project.results?.estimate?.equipment || []).supported;
            const lost = missing.filter(type => expected.some(item => item.type === type));
            const received = result.equipment.map(item => String(item?.type ?? '(type tidak ada)')).join(', ') || '(kosong)';
            throw new Error('Skenario ' + names[key] + ' belum memuat kedua jenis alat operasional. Tidak terbaca: ' + missing.map(type => equipmentTypes[type].name).join(', ') +
                '. Jenis pada snapshot: ' + received + '. ' + (lost.length ? 'Alat tersebut ada di Estimasi tetapi tidak terbaca pada snapshot. ' : '') +
                'Kembali ke Simulasi Armada, klik Hitung Semua Skenario, lalu buka ulang Visualisasikan Armada. Lihat Diagnostik integrasi jika masalah berulang. ' + (bulldozer.reason||'Alternatif: pekerjaan dorong mandiri membutuhkan Bulldozer dengan data produktivitas yang valid.'));
        }
        for (const item of [ex, truck].filter(Boolean)) if (!Number.isInteger(number(item.units)) || number(item.units) < 1) throw new Error('Jumlah ' + item.name + ' pada skenario ' + names[key] + ' tidak valid (properti units harus bilangan bulat positif). Hitung Semua Skenario lalu buka ulang visualisasi.');
        const bulldozerCount=Number.isInteger(number(dozer?.units))&&number(dozer?.units)>0?Number(dozer.units):0;
        if (Number(ex?.units||0) + Number(truck?.units||0) + bulldozerCount > 2000) throw new Error('Visualisasi mendukung maksimal 2.000 unit gabungan; tidak ada unit yang disembunyikan atau dikurangi otomatis.');
        const volume = haulingEnabled ? toLCM(ex, project) : 0, truckVolume = haulingEnabled ? toLCM(truck, project) : 0;
        if (haulingEnabled && Math.abs(volume - truckVolume) > 1e-6 * Math.max(volume, truckVolume)) throw new Error('Volume kerja Excavator dan Dump Truck berbeda setelah konversi LCM. Selaraskan volume pada Estimasi sebelum memvisualisasikan satu aliran material.');
        const input = type => {
            const from = records => Object.entries(records || {}).find(([key]) => normalizeType(key) === type)?.[1];
            return from(project.results?.productivityInputs) || from(legacyInputs) || {};
        };
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
        if(bulldozer.model){
            field('dozerCycleSeconds',bulldozer.model.cycleSeconds,bulldozer.model.cycleSeconds!==null?'Turunan siklus proyek ÷ efisiensi; Q efektif tetap dari hasil skenario':'Asumsi tambahan: isi siklus efektif lengkap, bukan data hasil perhitungan');
            if(bulldozer.model.cycleSeconds===null)params.dozerCycleSeconds.origin='Asumsi tambahan wajib: isi siklus efektif lengkap; data siklus/efisiensi proyek belum tersedia';
            field('dozerApproachShare',10,'Asumsi animasi: 10% siklus untuk maju mendekati material; dapat diubah');
            field('dozerPushShare',50,'Asumsi animasi: 50% siklus untuk mendorong; dapat diubah');
            field('dozerReturnShare',30,'Asumsi animasi: 30% siklus untuk mundur; sisanya jeda; dapat diubah');
        }
        return { key, name: names[key], projectName: project.name || 'Proyek', projectId: String(project.id), volumeLCM: volume,
            excavatorCount: Number(ex?.units||0), truckCount: Number(truck?.units||0), bulldozerCount, haulingEnabled, bulldozer:bulldozer.model, params,
            limitations:[bulldozer.reason,!haulingEnabled&&truck?'Dump Truck siaga: tidak ada pasangan pemuat Excavator–Dump Truck yang lengkap. Bulldozer hanya mendorong tanah dan tidak memuat truk.':null,!haulingEnabled&&ex?'Excavator siaga: pasangan Dump Truck tidak tersedia.':null].filter(Boolean),
            supportedEquipment: supported, otherEquipment: unsupported,
            estimateDays: result.longestEquipmentDuration, originalBasis: ex?.workVolumeBasis };
    }
    function config(ctx, values, timingMode) {
        const c = { volumeLCM: ctx.volumeLCM, excavatorCount: ctx.excavatorCount, truckCount: ctx.truckCount };
        if(ctx.bulldozer){
            c.bulldozer={...ctx.bulldozer,cycleSeconds:number(values.dozerCycleSeconds),approachShare:number(values.dozerApproachShare),pushShare:number(values.dozerPushShare),returnShare:number(values.dozerReturnShare)};
        }
        if(ctx.haulingEnabled===false){
            c.haulingEnabled=false;c.workingHours=number(values.workingHours);
            return root.ExcabaseFleetEngine.validateFleet(c);
        }
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
        return c.bulldozer?root.ExcabaseFleetEngine.validateFleet(c):root.ExcabaseFleetEngine.validate(c);
    }
    root.ExcabaseFleetData = { SESSION_KEY, names, equipmentTypes, normalizeType, partitionEquipment, diagnostics, fingerprint, envelope, verifyHandoff, verify, context, config };
})(typeof window !== 'undefined' ? window : globalThis);
