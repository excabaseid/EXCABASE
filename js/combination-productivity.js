/* Combination data is independent of individual calculators and active projects. */
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("combinationForm");
    if (!form) return;
    const selectionKey = "excabase_combination_productivity_selection";
    const inputKey = "excabase_combination_productivity_inputs";
    const resultKey = "excabase_combination_productivity_results";
    const checkboxes = [...form.querySelectorAll('[name="equipment"]')];
    const allowed = checkboxes.map(input => input.value);
    const status = document.getElementById("combinationStatus");
    const button = document.getElementById("applyCombination");

    function read(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value && typeof value === "object" &&
                Array.isArray(value) === Array.isArray(fallback) ? value : fallback;
        } catch (error) {
            console.warn("Data kombinasi tidak dapat dibaca:", error);
            return fallback;
        }
    }

    function render(selection) {
        // Replace the host as well as its children to discard previous delegated listeners.
        const previous = document.getElementById("combinationCalculators");
        const host = document.createElement("div");
        host.id = previous.id;
        previous.replaceWith(host);
        mountProductivityCalculators({
            calculatorList: host,
            selectedCalculators: selection,
            productivityStorageKey: inputKey,
            savedProductivityData: read(inputKey, {}),
            standalone: true,
            onInvalid(type) {
                const results = read(resultKey, {});
                if (!(type in results)) return;
                delete results[type];
                localStorage.setItem(resultKey, JSON.stringify(results));
            },
            onResult(type, result) {
                const results = read(resultKey, {});
                results[type] = result;
                localStorage.setItem(resultKey, JSON.stringify(results));
            },
            onReset(type) {
                const results = read(resultKey, {});
                delete results[type];
                localStorage.setItem(resultKey, JSON.stringify(results));
            }
        });
        button.textContent = "Perbarui Kombinasi";
        status.textContent = selection.length + " kalkulator ditampilkan. Ubah pilihan di atas dan klik Perbarui Kombinasi. Input alat yang tidak ditampilkan tetap tersimpan.";
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const selection = checkboxes.filter(input => input.checked).map(input => input.value);
        if (!selection.length) {
            status.textContent = "Pilih minimal satu jenis alat. Kalkulator yang sedang ditampilkan tetap dipertahankan.";
            return;
        }
        localStorage.setItem(selectionKey, JSON.stringify(selection));
        render(selection);
    });

    const saved = read(selectionKey, []);
    const selection = allowed.filter(type => saved.includes(type));
    checkboxes.forEach(input => { input.checked = selection.includes(input.value); });
    if (selection.length) render(selection);
});
