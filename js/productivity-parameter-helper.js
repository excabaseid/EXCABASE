/* Optional assistance: preview is local UI state; only Apply changes the main form. */
window.mountProductivityParameterHelper = function ({ section, type, canEdit, onApply }) {
    const methods = ProductivityReferenceData.methods[type];
    if (!methods?.length) return;
    const panel = document.createElement("details");
    panel.className = "parameter-helper";
    const summary = document.createElement("summary");
    summary.textContent = "Bantu Hitung Parameter (opsional)";
    panel.appendChild(summary);
    const content = document.createElement("div");
    content.className = "parameter-helper-content";
    panel.appendChild(content);
    const sourceLabels = { planning: "Estimasi Perencanaan", actual: "Data Aktual Lapangan" };
    const sourceLabel = document.createElement("label");
    sourceLabel.textContent = "Sumber data parameter";
    const dataSource = document.createElement("select");
    dataSource.dataset.helperDataSource = "";
    Object.entries(sourceLabels).forEach(([value, title]) => dataSource.add(new Option(title, value)));
    sourceLabel.appendChild(dataSource);
    content.appendChild(sourceLabel);
    const guidance = document.createElement("p");
    guidance.dataset.helperGuidance = "";
    content.appendChild(guidance);
    const label = document.createElement("label");
    label.textContent = "Parameter yang ingin dibantu";
    const select = document.createElement("select");
    select.dataset.helperMethod = "";
    label.appendChild(select);
    methods.forEach(method => select.add(new Option(method.title, method.id)));
    content.appendChild(label);
    const manualLabel = document.createElement("label");
    manualLabel.className = "parameter-helper-manual";
    const manual = document.createElement("input");
    manual.type = "checkbox";
    manual.dataset.helperManual = "";
    manualLabel.append(manual, document.createTextNode(" Isi nilai parameter langsung secara manual"));
    content.appendChild(manualLabel);
    const detailLabel = document.createElement("label");
    detailLabel.textContent = "Dasar nilai / keterangan pengamatan (opsional)";
    const details = document.createElement("textarea");
    details.dataset.helperSourceDetails = "";
    details.rows = 2;
    detailLabel.appendChild(details);
    content.appendChild(detailLabel);
    const fields = document.createElement("div");
    fields.className = "parameter-helper-fields";
    content.appendChild(fields);
    const speedPanel = document.createElement("details");
    speedPanel.dataset.speedGuide = "";
    content.appendChild(speedPanel);
    const reference = document.createElement("a");
    reference.target = "_blank";
    reference.rel = "noopener";
    content.appendChild(reference);
    const assumption = document.createElement("p");
    content.appendChild(assumption);
    const actions = document.createElement("div");
    actions.className = "calculator-buttons";
    const preview = document.createElement("button");
    preview.type = "button";
    preview.dataset.helperPreview = "";
    preview.textContent = "Hitung / Lihat Hasil";
    const apply = document.createElement("button");
    apply.type = "button";
    apply.dataset.helperApply = "";
    apply.textContent = "Gunakan Hasil";
    apply.disabled = true;
    actions.append(preview, apply);
    content.appendChild(actions);
    const status = document.createElement("p");
    status.dataset.helperStatus = "";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    content.appendChild(status);
    let candidate = null;
    const drafts = {};
    const speedSelections = {};
    let renderedKey = null;
    const current = () => methods.find(method => method.id === select.value);
    const latest = Object.values(section.parameterHelp || {}).filter(entry => sourceLabels[entry?.dataSource])
        .sort((a,b) => String(b.appliedAt).localeCompare(String(a.appliedAt)))[0];
    if (latest) {
        dataSource.value = latest.dataSource;
        details.value = latest.sourceDetails || "";
    }
    function activeMethod() {
        const method = current();
        return manual.checked ? {kind:"manual",unit:method.unit,fields:[{id:"value",label:"Nilai parameter",min:0,positive:true}]} : method;
    }
    const history = document.createElement("div");
    history.className = "parameter-helper-history";
    content.appendChild(history);
    function renderHistory() {
        history.replaceChildren();
        for (const [field, entry] of Object.entries(section.parameterHelp || {})) {
            if (!entry || typeof entry.value !== "number") continue;
            const item = document.createElement("p");
            const name = field === "truckLoadingTime" ? "Waktu muat Dump Truck" : section.querySelector('[data-field="' + field + '"]')?.closest(".form-group")?.querySelector("label")?.textContent.trim() || field;
            item.textContent = "Bantuan tersimpan — " + name + ": " + entry.value + " " + entry.unit +
                "; " + (sourceLabels[entry.dataSource] || "Sumber data belum dicatat (data lama)") +
                (entry.source ? "; " + entry.source.table + ", halaman PDF " + entry.source.page : "; input manual pengguna") +
                (entry.sourceDetails ? "; " + entry.sourceDetails : "") +
                (entry.contextChanged ? "; model berubah, tentukan ulang lebar efektif." :
                    entry.overriddenManually ? "; telah diubah manual." : "; diterapkan pada " + entry.appliedAt + ".");
            history.appendChild(item);
        }
    }
    section.addEventListener("input", event => {
        if (event.target.matches("[data-field]")) renderHistory();
    });
    function invalidate() {
        candidate = null;
        apply.disabled = true;
        status.textContent = "Input utama tetap manual. Lihat hasil bantuan sebelum menerapkannya.";
    }
    function renderSpeedGuide() {
        const method = current(), guide = method.speedGuide;
        speedPanel.replaceChildren();
        speedPanel.hidden = !guide || manual.checked || dataSource.value !== "planning";
        if (!guide) return;
        if (!Object.prototype.hasOwnProperty.call(speedSelections,method.id)) {
            const saved = section.parameterHelp?.[method.target];
            speedSelections[method.id] = saved?.dataSource === "planning" && !saved.contextChanged ? saved.components?.speeds || null : null;
        }
        const summary = document.createElement("summary");
        summary.textContent = "Panduan kecepatan referensi (opsional)";
        speedPanel.appendChild(summary);
        const body = document.createElement("div");
        body.className = "parameter-helper-fields";
        speedPanel.appendChild(body);
        const controls = {};
        for (const [field, condition, title, lo, hi] of [["loadedSpeed","loadedCondition","bermuatan",2,3],["returnSpeed","returnCondition","kosong",4,5]]) {
            const label = document.createElement("label");
            label.textContent = "Kondisi lintasan " + title;
            const conditionInput = document.createElement("select");
            conditionInput.dataset.speedGuideInput = condition;
            conditionInput.add(new Option("Pilih kondisi lintasan", ""));
            guide.rows.forEach(row => conditionInput.add(new Option(row[1],row[0])));
            label.appendChild(conditionInput);
            const limits = document.createElement("small");
            limits.dataset.speedGuideRange = field;
            limits.setAttribute("aria-live","polite");
            label.appendChild(limits);
            const speedLabel = document.createElement("label");
            speedLabel.textContent = "Kecepatan pilihan " + title + " (km/jam)";
            const input = document.createElement("input");
            input.type = "number"; input.step = "any"; input.min = "0";
            input.dataset.speedGuideInput = field;
            speedLabel.appendChild(input);
            const saved = speedSelections[method.id]?.inputs;
            if (saved) { conditionInput.value = saved[condition]; input.value = saved[field]; }
            function updateLimits() {
                const row = guide.rows.find(row=>row[0]===conditionInput.value);
                limits.textContent = !row ? "Pilih kondisi untuk melihat batas referensi." :
                    row[lo] === null ? "Maksimum referensi: " + row[hi] + " km/jam; tabel tidak memberikan minimum." :
                        "Rentang referensi: " + row[lo] + "–" + row[hi] + " km/jam.";
                input.min = row?.[lo] ?? 0;
                if (row) input.max = row[hi]; else input.removeAttribute("max");
            }
            conditionInput.addEventListener("change",updateLimits);
            updateLimits();
            controls[condition] = conditionInput; controls[field] = input;
            body.append(label,speedLabel);
        }
        const link = document.createElement("a");
        link.href = guide.source.pdf + "#page=" + guide.source.page;
        link.target = "_blank"; link.rel = "noopener";
        link.textContent = guide.source.document + "; " + guide.source.table + "; halaman PDF " + guide.source.page + "; km/jam.";
        const note = document.createElement("p"); note.textContent = guide.note;
        const use = document.createElement("button"); use.type = "button";
        use.dataset.speedGuideApply = ""; use.textContent = "Terapkan kedua kecepatan ke komponen siklus";
        const message = document.createElement("p"); message.setAttribute("role","status");
        use.addEventListener("click", () => {
            if (!canEdit() || dataSource.value !== "planning" || manual.checked) return;
            const values = Object.fromEntries(Object.entries(controls).map(([key,input])=>[key,input.value]));
            try {
                const result = ProductivityParameterMethods.evaluateSpeedGuide(guide,values);
                for (const field of ["loadedSpeed","returnSpeed"]) fields.querySelector('[data-helper-input="'+field+'"]').value = String(result[field]);
                speedSelections[method.id] = {dataSource:"planning",inputs:values,values:result,unit:guide.unit,
                    source:guide.source,assumptions:guide.note};
                invalidate();
                message.textContent = "Kedua kecepatan sudah mengisi komponen siklus. Tinjau komponen lain, tekan Hitung / Lihat Hasil, lalu Gunakan Hasil. Kalkulator utama belum berubah.";
            } catch (error) { message.textContent = error.message; }
        });
        body.append(link,note,use,message);
    }
    function render() {
        const method = current();
        if (renderedKey) drafts[renderedKey] = Object.fromEntries([...fields.querySelectorAll("[data-helper-input]")].map(input => [input.dataset.helperInput,input.value]));
        renderedKey = method.id + (manual.checked ? ":manual" : "");
        fields.replaceChildren();
        const renderedFields = manual.checked ? [{id:"value",label:"Nilai " + method.title,unit:method.unit,min:0}] : method.fields;
        renderedFields.forEach(field => {
            const wrapper = document.createElement("label");
            wrapper.textContent = field.label + (field.unit ? " (" + field.unit + ")" : "");
            const input = document.createElement(field.options ? "select" : "input");
            input.dataset.helperInput = field.id;
            if (field.options) {
                input.add(new Option("Pilih kondisi", ""));
                field.options.forEach(option => input.add(new Option(option[1], option[0])));
            } else {
                input.type = "number";
                input.min = field.min;
                input.step = "any";
            }
            if (field.id === "nominal" && (method.kind === "grader-width" || method.kind === "compactor-width")) {
                const nominal = section.querySelector("[data-width-nominal]")?.dataset.nominal;
                if (nominal && (!field.options || field.options.some(option => option[0] === nominal))) input.value = nominal;
            }
            if (drafts[renderedKey]?.[field.id] !== undefined) input.value = drafts[renderedKey][field.id];
            else if (section.parameterHelp?.[method.target]?.method === (manual.checked ? "manual" : method.id) &&
                section.parameterHelp[method.target].inputs?.[field.id] !== undefined && !section.parameterHelp[method.target].contextChanged) {
                input.value = section.parameterHelp[method.target].inputs[field.id];
            }
            else if (type === "dumptruck" && method.id === "cycle" && field.id === "loading") {
                const saved = section.parameterHelp?.truckLoadingTime;
                if (saved && !saved.contextChanged) input.value = String(saved.value);
            }
            wrapper.appendChild(input);
            if (field.options) {
                const description = document.createElement("small");
                description.className = "parameter-condition-description";
                description.id = type + "-" + method.id + "-" + field.id + "-description";
                description.dataset.helperDescription = field.id;
                description.setAttribute("aria-live", "polite");
                input.setAttribute("aria-describedby", description.id);
                const updateDescription = () => {
                    description.textContent = field.descriptions?.[input.value]
                        ? "Interpretasi praktis: " + field.descriptions[input.value]
                        : "Pilih " + field.label.toLowerCase() + " untuk melihat keterangannya.";
                };
                input.addEventListener("change", updateDescription);
                updateDescription();
                wrapper.appendChild(description);
            }
            fields.appendChild(wrapper);
        });
        reference.hidden = manual.checked;
        reference.href = method.source.pdf + "#page=" + method.source.page;
        reference.textContent = method.source.document + "; " + method.source.table +
            "; halaman PDF " + method.source.page + "; hasil " + (method.unit || "tanpa satuan") + ".";
        assumption.textContent = manual.checked ? "Nilai langsung dari pengguna, tanpa mengambil angka tabel atau mengubah rumus produktivitas. Pastikan satuan sesuai parameter tujuan." : "Metode / asumsi: " + method.note;
        updateGuidance();
        renderSpeedGuide();
        invalidate();
    }
    function updateGuidance() {
        guidance.textContent = dataSource.value === "planning"
            ? "Gunakan spesifikasi alat, tabel referensi, atau asumsi teknis yang dijelaskan. Catat dasar pemilihan nilai."
            : "Gunakan nilai pengamatan atau komponen siklus terukur. Untuk nilai parameter terukur langsung, centang input manual. Pilihan tabel tetap merupakan referensi, bukan pengukuran lapangan.";
    }
    dataSource.addEventListener("change", () => {
        if (dataSource.value !== "planning") speedSelections[current().id] = null;
        updateGuidance(); renderSpeedGuide(); invalidate();
    });
    details.addEventListener("input", invalidate);
    manual.addEventListener("change", render);
    select.addEventListener("change", render);
    section.querySelector("[data-model]")?.addEventListener("change", () => {
        Object.keys(drafts).forEach(key => delete drafts[key]);
        methods.filter(method=>method.speedGuide).forEach(method=>{speedSelections[method.id]=null;});
        renderedKey = null;
        if (section.parameterHelp?.truckLoadingTime) section.parameterHelp.truckLoadingTime.contextChanged = true;
        render();
        renderHistory();
    });
    fields.addEventListener("input", invalidate);
    fields.addEventListener("change", invalidate);
    function detachSpeedReference(event) {
        if (["loadedSpeed","returnSpeed"].includes(event.target.dataset.helperInput)) speedSelections[current().id] = null;
    }
    fields.addEventListener("input",detachSpeedReference);
    fields.addEventListener("change",detachSpeedReference);
    preview.addEventListener("click", () => {
        if (!canEdit()) return;
        const method = current();
        const values = Object.fromEntries([...fields.querySelectorAll("[data-helper-input]")]
            .map(input => [input.dataset.helperInput, input.value]));
        try {
            if (dataSource.value === "actual" && !manual.checked && ["range","fixed","grader-width","compactor-width"].includes(method.kind)) {
                throw new Error("Metode tabel/geometri ini menghasilkan nilai referensi. Pilih Estimasi Perencanaan atau centang input manual untuk nilai hasil pengamatan langsung.");
            }
            const nominal = section.querySelector("[data-width-nominal]")?.dataset.nominal;
            if (!manual.checked && method.kind === "grader-width" && nominal && Number(values.nominal) !== Number(nominal)) {
                throw new Error("Panjang blade pilihan harus sesuai katalog (" + nominal + " m). Jika panjang tidak tercantum di Tabel A.15, isi lebar efektif manual.");
            }
            const value = ProductivityParameterMethods.evaluate(activeMethod(), values);
            candidate = { value, values };
            apply.disabled = false;
            status.textContent = "Hasil bantuan: " + value.toLocaleString("id-ID", { maximumFractionDigits: 6 }) +
                " " + method.unit + ". Parameter utama belum berubah.";
        } catch (error) {
            candidate = null;
            apply.disabled = true;
            status.textContent = error.message;
        }
    });
    apply.addEventListener("click", () => {
        if (!candidate || !canEdit()) return;
        const method = current();
        const target = section.querySelector('[data-field="' + method.target + '"]');
        if (!method.targetHelper && (!target || target.disabled || target.readOnly)) {
            status.textContent = "Parameter tujuan dikunci. Kapasitas katalog tidak ditimpa.";
            return;
        }
        const metadata = { method: manual.checked ? "manual" : method.id, version: 2, inputs: candidate.values,
            value: candidate.value, unit: method.unit, source: manual.checked ? null : method.source,
            dataSource:dataSource.value, sourceDetails:details.value.trim(),
            assumptions: manual.checked ? assumption.textContent : method.note, appliedAt: new Date().toISOString() };
        const loading = section.parameterHelp?.truckLoadingTime;
        if (!manual.checked && method.id === "cycle" && loading && !loading.contextChanged && Number(candidate.values.loading) === loading.value) {
            metadata.components = {loading:JSON.parse(JSON.stringify(loading))};
        }
        const speeds = speedSelections[method.id];
        if (!manual.checked && dataSource.value === "planning" && speeds &&
            ["loadedSpeed","returnSpeed"].every(field=>Number(candidate.values[field]) === speeds.values[field])) {
            metadata.components = {...metadata.components,speeds:JSON.parse(JSON.stringify(speeds))};
        }
        if (method.kind === "grader-width" || method.kind === "compactor-width") {
            metadata.model = section.querySelector("[data-model]")?.value;
            metadata.customModelName = section.querySelector("[data-custom-model-name]")?.value || "";
        }
        if (!method.targetHelper) target.value = String(candidate.value);
        else drafts[method.targetHelper] = {...drafts[method.targetHelper],loading:String(candidate.value)};
        onApply(method.target, metadata);
        renderHistory();
        if (method.targetHelper) {
            select.value = method.targetHelper;
            manual.checked = false;
            render();
            status.textContent = "Waktu muat diterapkan ke bantuan siklus angkut. Lengkapi komponen lain, lihat hasil siklus, lalu gunakan hasilnya pada kalkulator utama.";
            return;
        }
        status.textContent = "Hasil diterapkan. Anda tetap dapat mengubah parameter utama secara manual.";
    });
    render();
    renderHistory();
    
    section.querySelector(".calculator-card").appendChild(panel);
    if (!canEdit()) panel.querySelectorAll("input,select,textarea,button").forEach(input => { input.disabled = true; });
};
