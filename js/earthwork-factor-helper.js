/* Shared factor assistance. Main formulas and project result format remain in main.js. */
document.addEventListener("DOMContentLoaded", function () {
    const $ = id => document.getElementById(id);
    const mainMaterial = $("earthworkMaterial");
    if (!mainMaterial) return;
    const fromProject = new URLSearchParams(location.search).get("fromProject") === "1";
    function readProject() {
        try { return JSON.parse(localStorage.getItem("excabase_active_project")); }
        catch { return null; }
    }
    const initialProject = fromProject ? readProject() : null;
    const projectId = initialProject?.id;
    const storageKey = fromProject ? "excabase_project_earthwork_factors_" + projectId : "excabase_standalone_earthwork";
    function canEdit() {
        if (!fromProject) return true;
        try {
            const active = readProject();
            const projects = JSON.parse(localStorage.getItem("excabase_projects") || "[]");
            const stored = projects.find(project => String(project.id) === String(projectId));
            return projectId != null && active && String(active.id) === String(projectId) &&
                String(active.status || "").toLowerCase() !== "selesai" &&
                String(stored?.status || "").toLowerCase() !== "selesai";
        } catch { return false; }
    }
    const signature = project => JSON.stringify({ soilType: project?.soilType,
        soilVolumeBCM: project?.soilVolumeBCM, earthwork: project?.results?.earthwork || null });
    const projectInputIds = ["earthworkSwell", "earthworkShrinkage", "earthworkParameterSource", "earthworkSourceNote"];
    // Guard before the existing calculate/reset handlers, including programmatic clicks.
    if (fromProject) ["calculateEarthworkBtn", "resetEarthworkBtn"].forEach(id => {
        $(id).addEventListener("click", event => {
            if (!canEdit()) { event.preventDefault(); event.stopImmediatePropagation(); }
        }, true);
    });
    const source = {
        document: "Lampiran II SE DJBK 47/SE/Dk/2026 — Acuan dalam Penyusunan AHSP",
        table: "Tabel A.1 — Faktor Pemampatan (Buckling Factor) (Fk)",
        page: 1,
        pdf: "../references/Lampiran-II-SE-DJBK-No-47-Tahun-2026-Acuan-dalam-Penyusunan-AHSP.pdf#page=1"
    };
    const materials = {
        pasir: { name: "Pasir", loose: 1.110, compacted: .950,
            description: "Interpretasi praktis: material pasir. Jangan menyamakan semua tanah berpasir dengan pasir pada baris tabel ini." },
        "tanah-liat-berpasir": { name: "Tanah liat berpasir", loose: 1.250, compacted: .900,
            description: "Interpretasi praktis: campuran tanah liat dan pasir. Pilih bila identifikasi material sesuai; bukan pengganti otomatis untuk semua tanah berpasir." },
        "tanah-liat": { name: "Tanah liat", loose: 1.430, compacted: .900,
            description: "Interpretasi praktis: material yang diidentifikasi sebagai tanah liat. Nama umum tanah biasa atau tanah keras belum cukup untuk memilih baris ini." }
    };
    const factors = material => ({ swell: Math.round((material.loose - 1) * 100000000) / 1000000,
        shrinkage: Math.round((1 - material.compacted) * 100000000) / 1000000 });
    const ids = ["earthworkBCM", "earthworkMaterial", "earthworkSwell", "earthworkShrinkage", "earthworkParameterSource", "earthworkSourceNote"];
    const inputs = () => Object.fromEntries(ids.map(id => [id, $(id).value]));
    let factorReference = null;
    let result = null;
    let saved = null;
    let legacyMaterial = null;
    let unresolvedLegacy = false;
    try { if (!fromProject || canEdit()) saved = JSON.parse(localStorage.getItem(storageKey)); }
    catch (error) { console.warn("Data volume Mandiri tidak dapat dibaca:", error); }
    let draftChanged = false;
    const usableDraft = !fromProject || saved?.baseSignature === signature(initialProject);
    if (usableDraft && saved?.version === 1 && saved.inputs && typeof saved.inputs === "object") {
        if (fromProject) {
            draftChanged = projectInputIds.some(id => typeof saved.inputs[id] === "string" && $(id).value !== saved.inputs[id]);
            projectInputIds.forEach(id => { if (typeof saved.inputs[id] === "string") $(id).value = saved.inputs[id]; });
            factorReference = saved.factorReference || null;
        } else {
        legacyMaterial = saved.legacyMaterial || null;
        const oldCategory = saved.inputs.earthworkMaterial;
        unresolvedLegacy = !!oldCategory && ![...mainMaterial.options].some(option => option.value === oldCategory);
        if (unresolvedLegacy && !legacyMaterial) {
            legacyMaterial = { value: oldCategory, inputs: saved.inputs,
                factorReference: saved.factorReference || null, result: saved.result || null };
        }
        ids.forEach(id => { if (typeof saved.inputs[id] === "string") $(id).value = saved.inputs[id]; });
        factorReference = saved.factorReference || null;
        if (factorReference) {
            const { material, ...metadata } = factorReference;
            factorReference = { ...metadata, referenceMaterial: metadata.referenceMaterial || material };
        }
        result = saved.result || null;
        }
    }

    const panel = document.createElement("details");
    panel.id = "earthworkFactorHelper";
    panel.innerHTML = `
        <summary>Bantu Pilih Faktor (opsional)</summary>
        <div class="earthwork-factor-content">
            <section class="earthwork-help-block earthwork-help-selection">
                <h3>Pemilihan Material</h3>
            <p>Pilih material referensi yang sesuai dengan kondisi tanah sebenarnya. Pilihan ini hanya digunakan untuk menentukan Swell dan Shrinkage, tanpa mengubah jenis material pekerjaan.</p>
            <label for="earthworkReferenceMaterial">Material pada Tabel A.1</label>
            <select id="earthworkReferenceMaterial" aria-describedby="earthworkReferenceDescription">
                <option value="">Pilih material referensi</option>
            </select>
            <small id="earthworkReferenceDescription"></small>
            </section>
            <section class="earthwork-help-block">
                <h3>Hasil Referensi</h3>
                <div id="earthworkFactorPreview" aria-live="polite"></div>
            <p>Estimasi berdasarkan referensi, bukan hasil pengujian. Persentase dihitung dari rasio volume baris A (kondisi awal Asli), bukan persentase yang tercetak langsung dalam tabel.</p>
            </section>
            <section class="earthwork-help-block earthwork-help-conversion">
                <h3>Rumus Konversi</h3>
                <p class="earthwork-help-formula">Swell (%) = (rasio Asli→Lepas − 1) × 100.</p>
                <p class="earthwork-help-formula">Shrinkage (%) = (1 − rasio Asli→Padat) × 100.</p>
            </section>
            <section class="earthwork-help-block">
                <h3>Catatan Teknis</h3>
            <p>Hanya tiga material ini didukung. Tujuh material lain ditunda; shrinkage negatif tidak diubah menjadi nol atau positif.</p>
            </section>
            <section class="earthwork-help-block earthwork-help-source">
                <h3>Sumber Referensi</h3>
                <a id="earthworkFactorReferenceLink" target="_blank" rel="noopener"></a>
            </section>
            <div class="calculator-buttons"><button type="button" id="applyEarthworkFactors" disabled>Gunakan Hasil</button></div>
            <p id="earthworkFactorHelpStatus" role="status" aria-live="polite"></p>
        </div>`;
    document.querySelector(".earthwork-input-panel").appendChild(panel);
    const choice = $("earthworkReferenceMaterial");
    Object.entries(materials).forEach(([key, material]) => choice.add(new Option(material.name, key)));
    const link = $("earthworkFactorReferenceLink");
    link.href = source.pdf;
    link.textContent = source.document + "; " + source.table + "; halaman PDF 1.";

    function eligible() {
        return canEdit() && !!materials[choice.value] &&
            ["", "referensi-teknis", "asumsi-estimasi"].includes($("earthworkParameterSource").value);
    }
    function update() {
        const material = materials[choice.value];
        $("earthworkReferenceDescription").textContent = material?.description || "Pilih material untuk melihat karakteristik dan estimasi faktornya.";
        $("applyEarthworkFactors").disabled = !eligible();
        if (!material) {
            $("earthworkFactorPreview").textContent = "Belum ada pratinjau. Input manual tetap dapat digunakan.";
            $("earthworkFactorHelpStatus").textContent = "Memilih referensi tidak mengubah input utama.";
            return;
        }
        const value = factors(material);
        $("earthworkFactorPreview").textContent = material.name + ": Swell " + value.swell + "%; Shrinkage " + value.shrinkage +
            "%. Rasio Asli→Lepas " + material.loose.toFixed(3) + "; Asli→Padat " + material.compacted.toFixed(3) + ".";
        $("earthworkFactorHelpStatus").textContent = !eligible()
                ? "Sumber pengujian/data lapangan atau sumber lain dipertahankan. Jika ingin beralih ke estimasi, pilih Sumber Parameter “Referensi teknis” atau “Asumsi estimasi awal” secara manual terlebih dahulu."
                : "Tekan Gunakan Hasil untuk mengisi kedua faktor dan sumbernya. Kategori material utama tidak berubah.";
    }
    function persist() {
        if (!canEdit()) return;
        if (fromProject) {
            try {
                localStorage.setItem(storageKey, JSON.stringify({ version: 1,
                    baseSignature: signature(readProject()),
                    inputs: Object.fromEntries(projectInputIds.map(id => [id, $(id).value])), factorReference }));
            } catch { $("earthworkFactorHelpStatus").textContent = "Bantuan belum tersimpan secara lokal. Hasil proyek tetap disimpan melalui Hitung Volume."; }
            return;
        }
        try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, inputs: inputs(), factorReference, result,
            ...(legacyMaterial ? { legacyMaterial } : {}) })); }
        catch (error) { $("earthworkFactorHelpStatus").textContent = "Penyimpanan lokal gagal. Input masih dapat digunakan pada halaman ini."; }
    }
    function clearResult() {
        result = null;
        $("earthworkCalculationDetails").textContent = "";
        $("earthworkCalculationStatus").textContent = "Input berubah. Klik Hitung Volume untuk memperbarui hasil.";
    }
    function referenceMatches() {
        const material = materials[factorReference?.referenceMaterial];
        if (!material) return false;
        const value = factors(material);
        return Number($("earthworkSwell").value) === value.swell && Number($("earthworkShrinkage").value) === value.shrinkage &&
            $("earthworkParameterSource").value === "referensi-teknis";
    }
    if (!referenceMatches()) factorReference = null;
    if (factorReference) choice.value = factorReference.referenceMaterial;
    else if (unresolvedLegacy && materials[legacyMaterial?.value]) choice.value = legacyMaterial.value;
    choice.addEventListener("change", update);
    $("applyEarthworkFactors").addEventListener("click", function () {
        if (!eligible()) { update(); return; }
        const material = materials[choice.value];
        const value = factors(material);
        $("earthworkSwell").value = value.swell;
        $("earthworkShrinkage").value = value.shrinkage;
        $("earthworkParameterSource").value = "referensi-teknis";
        $("earthworkSourceNote").value = "Estimasi referensi: " + material.name + "; " + source.document +
            "; Tabel A.1, halaman PDF 1, baris A (Asli). Rasio Asli→Lepas " + material.loose.toFixed(3) +
            ", Asli→Padat " + material.compacted.toFixed(3) + ". Persentase diturunkan dari rasio, bukan hasil pengujian.";
        factorReference = { referenceMaterial: choice.value, ...value, ratios: { original: 1, loose: material.loose, compacted: material.compacted },
            source, basis: "BCM", estimated: true, appliedAt: new Date().toISOString() };
        clearResult();
        persist();
        $("earthworkFactorHelpStatus").textContent = "Estimasi referensi diterapkan. Klik Hitung Volume; input manual tetap dapat disunting.";
    });
    ids.forEach(id => {
        const edited = () => {
            if (!canEdit()) return;
            if (!["earthworkBCM", "earthworkMaterial"].includes(id) && factorReference) {
                if (["earthworkSwell", "earthworkShrinkage"].includes(id) && $("earthworkParameterSource").value === "referensi-teknis") {
                    $("earthworkParameterSource").value = "asumsi-estimasi";
                    $("earthworkSourceNote").value = "Disunting manual setelah estimasi Tabel A.1; bukan lagi pasangan faktor referensi yang diterapkan.";
                }
                factorReference = null;
            }
            clearResult();
            persist();
            update();
        };
        $(id).addEventListener("input", edited);
        $(id).addEventListener("change", edited);
    });
    $("calculateEarthworkBtn").addEventListener("click", function () {
        if (!canEdit()) return;
        if (factorReference && !referenceMatches()) factorReference = null;
        const values = [...$("earthworkCalculationDetails").querySelectorAll("strong")].slice(0, 3).map(element => parseFloat(element.textContent));
        result = $("earthworkCalculationStatus").textContent === "Perhitungan berhasil." && values.length === 3 && values.every(Number.isFinite)
            ? { bcm: values[0], lcm: values[1], ccm: values[2], calculatedAt: new Date().toISOString() } : null;
        persist();
    });
    $("resetEarthworkBtn").addEventListener("click", function () {
        if (!canEdit()) return;
        factorReference = null;
        result = null;
        legacyMaterial = null;
        choice.value = "";
        panel.open = false;
        try { localStorage.removeItem(storageKey); }
        catch { $("earthworkFactorHelpStatus").textContent = "Penyimpanan lokal tidak dapat dibersihkan."; return; }
        update();
    });
    update();
    if (fromProject && draftChanged) clearResult();
    if (fromProject && !canEdit()) {
        panel.querySelectorAll("input, select, button").forEach(input => { input.disabled = true; });
        $("earthworkFactorHelpStatus").textContent = "Bantuan hanya dapat digunakan pada proyek aktif yang boleh diedit.";
    }
    // Do not overwrite an unsupported legacy category with an empty selection on load.
    if (!fromProject && result && !unresolvedLegacy) $("calculateEarthworkBtn").click();
});
