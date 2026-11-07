(function () {
    "use strict";
    if (new URLSearchParams(location.search).get("fromProject") === "1") return;
    const key = "excabase_standalone_estimate";
    const names = {excavator: "Excavator", dumptruck: "Dump Truck", wheelloader: "Wheel Loader", motorgrader: "Motor Grader", bulldozer: "Bulldozer", compactor: "Compactor"};
    const bases = ["bcm", "lcm", "ccm"];
    const empty = () => ({hours: "8", mode: "target", selected: [], equipment: Object.fromEntries(Object.keys(names).map(type => [type, {model: "", volume: "", basis: type === "compactor" ? "ccm" : "lcm", productivity: "", rate: "", target: "", units: ""}]))});
    let inputs = empty();
    let calculated = null;
    let storageWarning = "";
    try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (saved?.inputs) {
            inputs.hours = String(saved.inputs.hours ?? "8");
            inputs.mode = saved.inputs.mode === "units" ? "units" : "target";
            inputs.selected = Object.keys(names).filter(type => saved.inputs.selected?.includes(type));
            for (const type of Object.keys(names)) {
                for (const field of Object.keys(inputs.equipment[type])) {
                    inputs.equipment[type][field] = String(saved.inputs.equipment?.[type]?.[field] ?? inputs.equipment[type][field]);
                }
            }
            calculated = saved.calculated || null;
        }
    } catch { storageWarning = "Data Estimasi Mandiri tidak dapat dibaca. Data lama tidak dihapus; periksa input sebelum menghitung."; }
    const escape = value => String(value).replace(/[&<>"']/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char]));
    const num = value => Number(value).toLocaleString("id-ID", {maximumFractionDigits: 2});
    const money = value => "Rp" + Number(value).toLocaleString("id-ID", {maximumFractionDigits: 0});
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "../css/standalone-estimate.css"; document.head.appendChild(css);
    document.body.classList.add("standalone-estimate");
    document.title = "Estimasi Waktu & Biaya Alat Berat | EXCABASE";
    const root = document.querySelector(".main-content");
    const field = (type, name, label, extra = "") => `<label>${label}<input data-type="${type}" data-field="${name}" value="${escape(inputs.equipment[type][name])}" ${extra}></label>`;
    root.innerHTML = `
        <header class="page-header"><h1>Estimasi Waktu & Biaya Alat Berat</h1><p>Hitung kebutuhan armada, waktu kerja, dan biaya operasional tanpa membuat proyek.</p></header>
        <form id="standaloneEstimateForm" novalidate>
            <section class="estimate-panel"><h2>1. Data Pekerjaan</h2><div class="estimate-grid">
                <label>Jam Kerja per Hari<input id="estimateHours" type="number" min="0" max="24" step="any" value="${escape(inputs.hours)}"></label>
                <label>Mode Perhitungan<select id="estimateMode"><option value="target">Berdasarkan Target Durasi</option><option value="units">Berdasarkan Jumlah Unit</option></select></label>
            </div></section>
            <fieldset class="estimate-panel"><legend>2. Pilih Alat</legend><p>Pilih satu sampai enam jenis alat. Setiap alat dihitung secara independen.</p><div class="estimate-options">
                ${Object.entries(names).map(([type, name]) => `<label><input type="checkbox" data-equipment="${type}" ${inputs.selected.includes(type) ? "checked" : ""}>${name}</label>`).join("")}
            </div></fieldset>
            <section class="estimate-input-section"><h2>3. Input per Alat</h2><p id="estimateEmpty">Pilih alat untuk menampilkan formulir.</p>
                ${Object.entries(names).map(([type, name]) => `<article class="estimate-panel" data-card="${type}" hidden><h3>${name}</h3><div class="estimate-grid">
                    ${field(type, "model", "Nama / Model Alat (opsional)", 'type="text" maxlength="150"')}
                    ${field(type, "volume", "Volume Pekerjaan (m³)", 'type="number" min="0" step="any"')}
                    <label>Basis Volume<select data-type="${type}" data-field="basis">${bases.map(basis => `<option value="${basis}" ${inputs.equipment[type].basis === basis ? "selected" : ""}>${basis.toUpperCase()} — ${basis === "bcm" ? "Tanah Asli" : basis === "lcm" ? "Tanah Lepas" : "Tanah Padat"}</option>`).join("")}</select></label>
                    ${field(type, "productivity", "Produktivitas per Unit (m³/jam)", 'type="number" min="0" step="any"')}
                    ${field(type, "rate", "Biaya Operasional per Unit (Rp/jam)", 'type="number" min="0" step="any"')}
                    <div data-mode="target">${field(type, "target", "Target Durasi (hari)", 'type="number" min="0" step="any"')}</div>
                    <div data-mode="units">${field(type, "units", "Jumlah Unit (unit)", 'type="number" min="1" step="1"')}</div>
                </div><p class="estimate-note">Volume pekerjaan dan produktivitas wajib menggunakan basis yang sama. Pemilihan basis tidak mengonversi angka volume.</p><button type="button" class="estimate-import" data-import="${type}">Ambil Produktivitas Mandiri</button><p data-import-status="${type}" role="status"></p></article>`).join("")}
            </section>
            <div class="estimate-actions"><button type="submit">Hitung Estimasi</button><button type="button" id="resetStandaloneEstimate">Reset Mandiri</button></div>
        </form>
        <section class="estimate-panel" aria-labelledby="estimateResultsHeading"><h2 id="estimateResultsHeading">4. Hasil Estimasi</h2><p id="estimateStatus" role="status" aria-live="polite"></p><p id="estimateStorageStatus" role="status">${escape(storageWarning)}</p><div id="estimateResults"></div></section>`;
    const $ = selector => root.querySelector(selector);
    $("#estimateMode").value = inputs.mode;

    function save() {
        try { localStorage.setItem(key, JSON.stringify({inputs, calculated})); $("#estimateStorageStatus").textContent = ""; }
        catch { $("#estimateStorageStatus").textContent = "Penyimpanan gagal. Input dan hasil pada halaman ini belum tersimpan untuk refresh."; }
    }
    function layout() {
        root.querySelectorAll("[data-card]").forEach(card => {card.hidden = !inputs.selected.includes(card.dataset.card);});
        root.querySelectorAll("[data-mode]").forEach(block => {block.hidden = block.dataset.mode !== inputs.mode;});
        $("#estimateEmpty").hidden = inputs.selected.length > 0;
    }
    function renderResults() {
        const results = $("#estimateResults");
        results.replaceChildren();
        if (!calculated) { $("#estimateStatus").textContent = "Lengkapi input lalu klik Hitung Estimasi."; return; }
        if (JSON.stringify(calculated.inputs) !== JSON.stringify(inputs)) {
            $("#estimateStatus").textContent = "Input berubah dan belum dihitung. Hasil sebelumnya tetap tersimpan, tetapi bukan hasil input terbaru. Klik Hitung Estimasi.";
            return;
        }
        $("#estimateStatus").textContent = "Hasil sesuai input yang dihitung pada " + new Date(calculated.calculatedAt).toLocaleString("id-ID") + ".";
        results.innerHTML = calculated.equipment.map(item => `<article class="estimate-result" data-result-type="${item.type}">
            <header class="estimate-result-header"><div><h3>${names[item.type]}</h3>${item.model ? `<p class="estimate-result-model">${escape(item.model)}</p>` : ""}</div><div class="estimate-result-badges"><span>Basis ${item.basis.toUpperCase()}</span><span>${num(item.units)} unit</span></div></header>
            <table class="estimate-result-table" aria-label="Hasil estimasi ${names[item.type]}"><thead><tr><th scope="col">Parameter</th><th scope="col">Hasil</th></tr></thead><tbody>
                <tr><th scope="row">Volume pekerjaan</th><td>${num(item.volume)} m³ (${item.basis.toUpperCase()})</td></tr>
                <tr><th scope="row">Produktivitas per unit</th><td>${num(item.productivity)} m³/jam (${item.basis.toUpperCase()})</td></tr>
                <tr><th scope="row">Produktivitas harian per unit</th><td>${num(item.dailyProductivity)} m³/hari (${item.basis.toUpperCase()})</td></tr>
                ${item.theoreticalUnits === null ? "" : `<tr><th scope="row">Kebutuhan unit teoritis</th><td>${num(item.theoreticalUnits)} unit</td></tr>`}
                <tr class="estimate-result-key"><th scope="row">Jumlah unit digunakan</th><td>${num(item.units)} unit</td></tr>
                <tr><th scope="row">Durasi estimasi dalam jam</th><td>${num(item.durationHours)} jam</td></tr>
                <tr><th scope="row">Durasi dalam hari kerja</th><td>${num(item.durationDays)} hari kerja</td></tr>
                <tr class="estimate-result-cost"><th scope="row">Biaya operasional</th><td>${money(item.totalCost)}</td></tr>
            </tbody></table></article>`).join("") +
            `<div class="estimate-summary"><p>Total Armada<strong>${num(calculated.totalUnits)} unit</strong></p><p>Total Biaya Operasional<strong>${money(calculated.totalCost)}</strong></p></div><p class="estimate-note">Setiap alat dihitung independen dengan produktivitas konstan dan ${num(calculated.inputs.hours)} jam kerja per hari. Dalam mode Target Durasi, kebutuhan unit dibulatkan ke atas. Biaya berdasarkan jam operasi produktif, belum memasukkan mobilisasi, standby, dan biaya tetap lainnya. Produktivitas antaralat tidak dijumlahkan. Durasi total proyek memerlukan asumsi penjadwalan; tidak otomatis sama dengan durasi alat terlama.</p>`;
    }
    function changed(event) {
        const element = event.target;
        if (element.id === "estimateHours") inputs.hours = element.value;
        else if (element.id === "estimateMode") inputs.mode = element.value;
        else if (element.dataset.equipment) inputs.selected = [...root.querySelectorAll("[data-equipment]:checked")].map(input => input.dataset.equipment);
        else if (element.dataset.field) inputs.equipment[element.dataset.type][element.dataset.field] = element.value;
        else return;
        layout(); renderResults(); save();
    }
    $("#standaloneEstimateForm").addEventListener("input", changed);
    $("#standaloneEstimateForm").addEventListener("change", changed);
    $("#standaloneEstimateForm").addEventListener("submit", event => {
        event.preventDefault();
        const fail = (message, input) => {$("#estimateStatus").textContent = message; input?.focus();};
        const hours = Number(inputs.hours);
        if (!inputs.hours.trim() || !Number.isFinite(hours) || hours <= 0 || hours > 24) {fail("Jam kerja per hari harus lebih dari 0 dan maksimal 24.", $("#estimateHours")); return;}
        if (!inputs.selected.length) {fail("Pilih minimal satu jenis alat.", $("[data-equipment]")); return;}
        const equipment = [];
        for (const type of inputs.selected) {
            const source = inputs.equipment[type];
            const required = ["volume", "productivity", "rate", inputs.mode === "target" ? "target" : "units"];
            for (const field of required) {
                const value = Number(source[field]);
                if (!source[field].trim() || !Number.isFinite(value) || (field === "rate" ? value < 0 : value <= 0) || (field === "units" && !Number.isSafeInteger(value))) {
                    fail(names[type] + ": isi nilai yang valid dan positif (tarif boleh 0); jumlah unit wajib bilangan bulat.", $(`[data-type="${type}"][data-field="${field}"]`)); return;
                }
            }
            if (!bases.includes(source.basis)) {fail(names[type] + ": pilih basis BCM, LCM, atau CCM."); return;}
            const volume = Number(source.volume), productivity = Number(source.productivity), rate = Number(source.rate);
            const dailyProductivity = productivity * hours;
            const theoreticalUnits = inputs.mode === "target" ? volume / (dailyProductivity * Number(source.target)) : null;
            const units = inputs.mode === "target" ? Math.ceil(theoreticalUnits) : Number(source.units);
            const durationHours = volume / (productivity * units);
            const durationDays = durationHours / hours;
            const totalCost = durationHours * units * rate;
            if (!Number.isSafeInteger(units) || units < 1 || ![dailyProductivity, durationHours, durationDays].every(value => Number.isFinite(value) && value > 0) || !Number.isFinite(totalCost)) {
                fail(names[type] + ": hasil di luar rentang perhitungan. Periksa besaran input."); return;
            }
            equipment.push({type, model: source.model, basis: source.basis, volume, productivity, dailyProductivity, theoreticalUnits, units, durationHours, durationDays, totalCost});
        }
        const totalUnits = equipment.reduce((sum, item) => sum + item.units, 0);
        const totalCost = equipment.reduce((sum, item) => sum + item.totalCost, 0);
        if (!Number.isSafeInteger(totalUnits) || !Number.isFinite(totalCost)) {fail("Total di luar rentang perhitungan. Periksa besaran input."); return;}
        calculated = {inputs: JSON.parse(JSON.stringify(inputs)), equipment, totalUnits, totalCost, calculatedAt: new Date().toISOString()};
        renderResults(); save();
    });
    root.addEventListener("click", event => {
        const button = event.target.closest("[data-import]");
        if (!button) return;
        const type = button.dataset.import;
        const status = $(`[data-import-status="${type}"]`);
        let result;
        try {result = JSON.parse(localStorage.getItem("excabase_standalone_productivity_results") || "{}")[type];} catch {}
        if (!result || !Number.isFinite(Number(result.hourly)) || Number(result.hourly) <= 0 || !bases.includes(result.volumeBasis)) {
            status.textContent = "Hasil Produktivitas Mandiri dengan basis yang valid belum tersedia. Hitung di kalkulator Mandiri atau isi manual."; return;
        }
        if (result.volumeBasis !== inputs.equipment[type].basis) {
            status.textContent = "Basis hasil Mandiri adalah " + result.volumeBasis.toUpperCase() + ". Sesuaikan basis dan volume pekerjaan terlebih dahulu. Tidak ada konversi otomatis."; return;
        }
        if (!confirm("Ganti produktivitas " + names[type] + " dengan hasil Mandiri " + num(result.hourly) + " m³/jam (" + result.volumeBasis.toUpperCase() + ")? Input lain tetap dipertahankan.")) return;
        inputs.equipment[type].productivity = String(result.hourly);
        $(`[data-type="${type}"][data-field="productivity"]`).value = result.hourly;
        status.textContent = "Produktivitas Mandiri diambil. Klik Hitung Estimasi untuk memperbarui hasil.";
        renderResults(); save();
    });
    $("#resetStandaloneEstimate").addEventListener("click", () => {
        if (!confirm("Hapus seluruh input dan hasil Estimasi Mandiri? Data Produktivitas, Kombinasi, dan Proyek Aktif tetap tersimpan.")) return;
        try {localStorage.removeItem(key);} catch {$("#estimateStorageStatus").textContent = "Reset gagal. Data tersimpan belum dihapus."; return;}
        location.reload();
    });
    layout(); renderResults();
})();
