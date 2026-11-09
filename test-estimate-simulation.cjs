const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const storage = fs.readFileSync('js/project-storage.js', 'utf8');
const fleet = fs.readFileSync('js/fleet-simulation.js', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
for (const file of ['js/main.js', 'js/project-storage.js', 'js/fleet-simulation.js']) new vm.Script(fs.readFileSync(file, 'utf8'));
const types = ['excavator', 'dumptruck', 'bulldozer', 'wheelloader', 'motorgrader', 'compactor'];
let project = {id: 1, status: 'aktif', targetDays: 10, workHoursPerDay: 6, results: {productivity: {}}};
const equipmentEstimates = types.map((type, i) => {
    const hourlyProductivity = i === 1 ? 8.4 : 100 + i;
    const volumeBasis = type === 'compactor' ? 'ccm' : 'lcm';
    project.results.productivity[type] = {hourly: hourlyProductivity, volumeBasis};
    return {type, units: i === 1 ? 349 : 3, hourlyProductivity, volumeBasis, workVolumeBasis: volumeBasis, workVolume: 10000, costPerHour: 200000};
});
// Jalankan blok perhitungan Estimasi asli, tanpa menyalin rumus ke implementasi uji.
const calculation = main.slice(main.indexOf('const equipmentCalculations = equipmentEstimates.map'), main.indexOf('if (isEstimateProjectMode) {', main.indexOf('const equipmentCalculations = equipmentEstimates.map')));
project.results.estimate = {equipment: vm.runInNewContext(calculation + '\nequipmentCalculations;', {equipmentEstimates, hoursPerDay: 6})};
function open(p) {
    let active = JSON.parse(JSON.stringify(p));
    const data = {excabase_active_project: JSON.stringify(active), excabase_projects: JSON.stringify([active])};
    const nodes = {};
    function node(id) {
        return nodes[id] ||= {textContent: '', value: id === 'fleetSelectedScenario' ? 'dasar' : '', innerHTML: '', listeners: {}, addEventListener(e, cb) {this.listeners[e] = cb;}, querySelectorAll() {
            return [...this.innerHTML.matchAll(/data-scenario="([^"]+)"\s+data-type="([^"]+)"[\s\S]*?value="([^"]+)"/g)].map(m => ({dataset: {scenario:m[1], type:m[2]}, value:m[3]}));
        }};
    }
    const events = {};
    const context = vm.createContext({console, alert: m => {throw Error(m);}, document: {getElementById:node, addEventListener(e, cb) {events[e] = cb;}}, window:{addEventListener() {}}, localStorage: {getItem:k=>data[k] || null, setItem:(k,v)=>{data[k]=v;}}});
    vm.runInContext(storage, context);
    vm.runInContext(fleet, context);
    events.DOMContentLoaded();
    return {nodes, context, data, click(id) {node(id).listeners.click();}, current() {return JSON.parse(data.excabase_active_project);}};
}
let app = open(project);
app.click('calculateFleetScenarioBtn'); app.click('saveFleetScenarioBtn');
let saved = app.current();
for (const item of saved.results.estimate.equipment) {
    const result = saved.results.fleet.scenarios.dasar.equipment.find(x=>x.type===item.type);
    assert.strictEqual(result.units, item.units);
    assert(Math.abs(result.productivityPerUnit-item.hourlyProductivity)<1e-10);
    assert(Math.abs(result.durationDays-item.durationDays)<1e-10);
    assert(Math.abs(result.totalCost-item.totalOperatingCost)<1e-6);
    for (const scenario of ['hemat','cepat']) {
        const alternative = saved.results.fleet.scenarios[scenario].equipment.find(x=>x.type===item.type);
        assert.strictEqual(alternative.units, scenario==='hemat' ? item.units-1 : item.units+1);
        assert(Math.abs(alternative.totalCost-item.totalOperatingCost)<1e-6);
    }
}
app = open(saved); // refresh memulihkan hasil dan konfigurasi
assert(app.nodes.fleetSaveStatus.textContent.includes('berhasil dimuat'));
saved.results.fleet.configurations.hemat.dumptruck = 123;
saved.results.fleet.configurations.cepat.dumptruck = 456;
saved.results.fleet.configurations.dasar.dumptruck = 999;
app = open(saved);
app.click('saveFleetScenarioBtn');
assert.strictEqual(app.current().results.fleet.scenarios.hemat.equipment[1].units,123);
assert.strictEqual(app.current().results.fleet.scenarios.cepat.equipment[1].units,456);
assert.strictEqual(app.current().results.fleet.scenarios.dasar.equipment[1].units,349);
saved.results.productivity.dumptruck.hourly = 42;
app = open(saved);
assert(app.nodes.calculateFleetScenarioBtn.disabled);
assert(app.nodes.fleetDataStatus.textContent.includes('Produktivitas telah berubah'));
// Estimasi baru dikonfirmasi dengan jumlah unit pilihan baru.
equipmentEstimates[1].hourlyProductivity = 42;
equipmentEstimates[1].units = 17;
saved.results.estimate.equipment = vm.runInNewContext(calculation+'\nequipmentCalculations;', {equipmentEstimates, hoursPerDay: 6});
app = open(saved);
assert(app.nodes.fleetDataStatus.textContent.includes('Hitung ulang'));
app.click('calculateFleetScenarioBtn'); app.click('saveFleetScenarioBtn');
saved = app.current();
assert.strictEqual(saved.results.fleet.scenarios.dasar.equipment[1].units,17);
assert.strictEqual(saved.results.fleet.scenarios.dasar.equipment[1].productivityPerUnit,42);
app = open(saved);
assert(app.nodes.fleetSaveStatus.textContent.includes('berhasil dimuat'));
const changed = app.current(); changed.results.productivity.excavator.hourly++;
app.data.excabase_active_project = JSON.stringify(changed);
app.click('saveFleetScenarioBtn');
assert(app.nodes.fleetSaveStatus.textContent.includes('Muat ulang'));
assert.strictEqual(app.current().results.productivity.excavator.hourly, changed.results.productivity.excavator.hourly);
saved.status='selesai';
app = open(saved);
const before = app.data.excabase_active_project;
app.click('saveFleetScenarioBtn');
assert.strictEqual(app.data.excabase_active_project,before);
console.log('PASS: syntax; six equipment; estimate/simulation productivity, units, hours, costs, bases; Dasar/Hemat/Cepat; refresh; stale estimate/configuration; concurrent update; completed project.');
