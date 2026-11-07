/* Standalone calculators never read or write active-project data. */
document.addEventListener("DOMContentLoaded", function () {
    const container = document.querySelector("[data-standalone-calculator]");
    if (!container) return;

    const type = container.dataset.standaloneCalculator;
    const inputKey = "excabase_standalone_productivity_inputs";
    const resultKey = "excabase_standalone_productivity_results";

    function read(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "{}");
            return value && typeof value === "object" && !Array.isArray(value) ? value : {};
        } catch (error) {
            console.warn("Data kalkulator mandiri tidak dapat dibaca:", error);
            return {};
        }
    }

    mountProductivityCalculators({
        calculatorList: container,
        selectedCalculators: [type],
        productivityStorageKey: inputKey,
        savedProductivityData: read(inputKey),
        standalone: true,
        onInvalid(equipmentType) {
            const results = read(resultKey);
            if (!(equipmentType in results)) return;
            delete results[equipmentType];
            localStorage.setItem(resultKey, JSON.stringify(results));
        },
        onResult(equipmentType, result) {
            const results = read(resultKey);
            results[equipmentType] = result;
            localStorage.setItem(resultKey, JSON.stringify(results));
        },
        onReset(equipmentType) {
            const results = read(resultKey);
            delete results[equipmentType];
            localStorage.setItem(resultKey, JSON.stringify(results));
        }
    });
});
