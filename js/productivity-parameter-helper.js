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
    const label = document.createElement("label");
    label.textContent = "Parameter yang ingin dibantu";
    const select = document.createElement("select");
    select.dataset.helperMethod = "";
    label.appendChild(select);
    methods.forEach(method => select.add(new Option(method.title, method.id)));
    content.appendChild(label);
    const fields = document.createElement("div");
    fields.className = "parameter-helper-fields";
    content.appendChild(fields);
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
    const current = () => methods.find(method => method.id === select.value);
    const history = document.createElement("div");
    history.className = "parameter-helper-history";
    content.appendChild(history);
    function renderHistory() {
        history.replaceChildren();
        for (const [field, entry] of Object.entries(section.parameterHelp || {})) {
            if (!entry?.source) continue;
            const item = document.createElement("p");
            const name = section.querySelector('[data-field="' + field + '"]')?.closest(".form-group")?.querySelector("label")?.textContent.trim() || field;
            item.textContent = "Bantuan tersimpan — " + name + ": " + entry.value + " " + entry.unit +
                "; " + entry.source.table + ", halaman PDF " + entry.source.page +
                (entry.overriddenManually ? "; telah diubah manual." : "; diterapkan pada " + entry.appliedAt + ".");
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
    function render() {
        const method = current();
        fields.replaceChildren();
        method.fields.forEach(field => {
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
        reference.href = method.source.pdf + "#page=" + method.source.page;
        reference.textContent = method.source.document + "; " + method.source.table +
            "; halaman PDF " + method.source.page + "; hasil " + (method.unit || "tanpa satuan") + ".";
        assumption.textContent = "Metode / asumsi: " + method.note;
        invalidate();
    }
    select.addEventListener("change", render);
    fields.addEventListener("input", invalidate);
    fields.addEventListener("change", invalidate);
    preview.addEventListener("click", () => {
        if (!canEdit()) return;
        const method = current();
        const values = Object.fromEntries([...fields.querySelectorAll("[data-helper-input]")]
            .map(input => [input.dataset.helperInput, input.value]));
        try {
            const value = ProductivityParameterMethods.evaluate(method, values);
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
        if (!target || target.disabled || target.readOnly) {
            status.textContent = "Parameter tujuan dikunci. Kapasitas katalog tidak ditimpa.";
            return;
        }
        const metadata = { method: method.id, version: 1, inputs: candidate.values,
            value: candidate.value, unit: method.unit, source: method.source,
            assumptions: method.note, appliedAt: new Date().toISOString() };
        target.value = String(candidate.value);
        onApply(method.target, metadata);
        renderHistory();
        
        status.textContent = "Hasil diterapkan. Anda tetap dapat mengubah parameter utama secara manual.";
    });
    render();
    renderHistory();
    
    section.querySelector(".calculator-card").appendChild(panel);
    if (!canEdit()) panel.querySelectorAll("input,select,button").forEach(input => { input.disabled = true; });
};
