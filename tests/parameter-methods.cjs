const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { methods } = require('../js/productivity-reference-data.js');
const { evaluate } = require('../js/productivity-parameter-methods.js');
let count = 0;
for (const [type, list] of Object.entries(methods)) {
    assert.ok(list.length > 0, type);
    for (const method of list) {
        for (const field of method.fields.filter(field => field.options)) {
            for (const [key] of field.options) {
                assert.equal(typeof field.descriptions[key], 'string', type + '/' + method.id + '/' + key);
                assert.ok(field.descriptions[key].length > 30);
            }
            assert.equal(new Set(Object.values(field.descriptions)).size, field.options.length);
        }
        assert.ok(fs.existsSync(path.resolve(__dirname, '../pages', method.source.pdf)));
        assert.ok(method.source.page > 0 && method.source.table);
        if (method.rows) {
            for (const row of method.rows) {
                if (method.kind === 'range') {
                    assert.equal(evaluate(method, { condition: row[0], value: String(row[2]) }), row[2]);
                    assert.equal(evaluate(method, { condition: row[0], value: String(row[3]) }), row[3]);
                    assert.throws(() => evaluate(method, { condition: row[0], value: String(row[3] + 1) }));
                    assert.throws(() => evaluate(method, { condition: row[0], value: '' }));
                } else assert.equal(evaluate(method, { condition: row[0] }), row[2]);
                count++;
            }
            assert.throws(() => evaluate(method, { condition: 'unknown', value: '1' }));
        }
    }
}
const find = (type, id) => methods[type].find(method => method.id === id);
assert.equal(evaluate(find('excavator', 'fill'), { condition: 'mudah', value: '1.2' }), 1.2);
assert.equal(evaluate(find('wheelloader', 'loader-v'), { condition: '1-0' }), 33);
assert.equal(evaluate(find('wheelloader', 'loader-cross'), { condition: '1-0' }), 30);
const travel = { distance: '1000', loadedSpeed: '20', returnSpeed: '40' };
assert.ok(Math.abs(evaluate(find('dumptruck', 'cycle'), { ...travel, loading: '2', other: '1' }) - 7.5) < 1e-10);
assert.ok(Math.abs(evaluate(find('wheelloader', 'travel-cycle'), { ...travel, fixed: '.75' }) - 315) < 1e-10);
assert.ok(Math.abs(evaluate(find('bulldozer', 'cycle'), { distance: '30', loadedSpeed: '3', returnSpeed: '4', transmission: 'tc' }) - 66) < 1e-10);
for (const invalid of ['', '-1', '0', 'Infinity', 'NaN']) {
    assert.throws(() => evaluate(find('dumptruck', 'cycle'), { ...travel, loadedSpeed: invalid, loading: '2', other: '1' }));
}
assert.throws(() => evaluate(find('compactor', 'passes'), { condition: 'vibratory', value: '4.5' }));
assert.deepEqual(find('excavator', 'efficiency').rows.map(row => row.slice(1)), [
    ['Baik — 0,83', .83], ['Sedang — 0,75', .75], ['Agak kurang — 0,67', .67], ['Kurang — 0,58', .58]
]);
assert.equal(find('dumptruck', 'cycle').source.page, 22);
assert.ok(find('dumptruck', 'cycle').source.table.includes('23'));
assert.ok(methods.excavator.every(method => method.note.includes('Fv = 1')));
assert.ok(methods.bulldozer.every(method => method.note.includes('Fm = 1')));
// Independent expected columns transcribed from A.15, PDF 35 (60°, 45°).
for (const [nominal, at60, at45] of [[2.2,1.9,1.6],[2.5,2.2,1.8],[2.8,2.4,2],[3.05,2.6,2.2],
    [3.1,2.7,2.2],[3.4,2.9,2.4],[3.7,3.2,2.6],[4,3.5,2.8],[4.3,3.7,3],[4.9,4.2,3.5]]) {
    assert.equal(evaluate(find('motorgrader', 'effective-width'), {nominal:String(nominal), angle:'60'}), at60);
    assert.equal(evaluate(find('motorgrader', 'effective-width'), {nominal:String(nominal), angle:'45'}), at45);
}
assert.throws(() => evaluate(find('motorgrader', 'effective-width'), {nominal:'3.66', angle:'45'}));
assert.throws(() => evaluate(find('motorgrader', 'effective-width'), {nominal:'3.7', angle:'30'}));
for (const [roller, overlap] of [['road',.2],['tire',.15],['vbesar',.2],['vkecil',.1],['soil',.2],['macadam',.2],['tandem',.15]]) {
    assert.ok(Math.abs(evaluate(find('compactor', 'effective-width'), {roller, nominal:'1.9'}) - (1.9-overlap)) < 1e-10);
    assert.throws(() => evaluate(find('compactor', 'effective-width'), {roller, nominal:String(overlap)}));
}
assert.throws(() => evaluate(find('compactor', 'effective-width'), {roller:'', nominal:'1.9'}));
assert.throws(() => evaluate(find('compactor', 'effective-width'), {roller:'soil', nominal:''}));
console.log('PASS parameter methods: ' + count + ' reference rows, bounds, units, invalid input; no main-productivity formula changed');
console.log('PASS stage 1: A.13 labels, equation location, Fv/Fm assumptions, all A.15 widths, A.25 overlaps, unsupported/invalid widths');
assert.equal(evaluate(find('dumptruck','loading'),{loadVolume:'10',loaderProductivity:'120'}),5);
for(const key of ['loadVolume','loaderProductivity']) for(const value of ['', '0','-1','Infinity']) {
    assert.throws(()=>evaluate(find('dumptruck','loading'),{loadVolume:'10',loaderProductivity:'120',[key]:value}));
}
assert.equal(evaluate({kind:'manual',unit:'detik',fields:[{id:'value',label:'Waktu',min:0,positive:true}]},{value:'37'}),37);
assert.throws(()=>evaluate({kind:'manual',unit:'lintasan',fields:[{id:'value',label:'Lintasan',min:0,positive:true}]},{value:'2.5'}));
console.log('PASS stage 2: loading LCM/hour to minutes, invalid inputs, manual measured parameter');
const {evaluateSpeedGuide} = require('../js/productivity-parameter-methods.js');
const truckGuide=find('dumptruck','cycle').speedGuide;
const loaderGuide=find('wheelloader','travel-cycle').speedGuide;
assert.deepEqual(truckGuide.rows,[['datar','Datar',null,40,null,60],['menanjak','Menanjak',null,20,null,40],['menurun','Menurun',null,20,null,40]]);
assert.deepEqual(loaderGuide.rows,[['baik','Baik',10,23,12,24],['sedang','Sedang',10,18,11,19],['agak','Agak sulit',10,15,10,16],['sulit','Sulit',9,12,9,14]]);
for(const guide of [truckGuide,loaderGuide]) for(const row of guide.rows) {
    const values={loadedCondition:row[0],returnCondition:row[0],loadedSpeed:String(row[3]),returnSpeed:String(row[5])};
    assert.deepEqual(evaluateSpeedGuide(guide,values),{loadedSpeed:row[3],returnSpeed:row[5]});
    for(const [field,index] of [['loadedSpeed',3],['returnSpeed',5]]) {
        for(const value of ['', '0', '-1', 'Infinity',String(row[index]+.1)]) assert.throws(()=>evaluateSpeedGuide(guide,{...values,[field]:value}));
    }
    if(guide.kind==='range') {
        assert.deepEqual(evaluateSpeedGuide(guide,{...values,loadedSpeed:String(row[2]),returnSpeed:String(row[4])}),{loadedSpeed:row[2],returnSpeed:row[4]});
        assert.throws(()=>evaluateSpeedGuide(guide,{...values,loadedSpeed:String(row[2]-.1)}));
    }
    assert.throws(()=>evaluateSpeedGuide(guide,{...values,loadedCondition:''}));
}
assert.deepEqual(evaluateSpeedGuide(truckGuide,{loadedCondition:'menanjak',returnCondition:'datar',loadedSpeed:'15',returnSpeed:'50'}),{loadedSpeed:15,returnSpeed:50});
console.log('PASS A.9/A.23: exact categories, maxima/ranges, separate directions, invalid values');
