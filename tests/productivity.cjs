// Run with Node 22+ and Chrome installed. No external packages required.
const { spawn } = require('node:child_process');
const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'excabase-test-'));
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
        res.end(fs.readFileSync(file));
    } catch { res.writeHead(404).end(); }
});
let browser, socket;
const delay = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const base = 'http://127.0.0.1:' + server.address().port;
    browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(portFile) && i < 100; i++) await delay(100);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => socket.addEventListener('open', r, { once: true }));
    let id = 0;
    const pending = new Map(), errors = [];
    socket.addEventListener('message', e => {
        const data = JSON.parse(e.data);
        if (data.method === 'Runtime.exceptionThrown') {
            errors.push(data.params.exceptionDetails);
            console.error('Browser exception:', JSON.stringify(data.params.exceptionDetails));
        }
        if (data.id) { const cb = pending.get(data.id); pending.delete(data.id); data.error ? cb.reject(data.error) : cb.resolve(data.result); }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params }));
    });
    await send('Runtime.enable');
    await send('Page.enable');
    async function evaluate(expression) {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
    }
    async function open(file) {
        await send('Page.navigate', { url: base + '/pages/' + file });
        for (let i = 0; i < 100; i++) {
            await delay(40);
            if (await evaluate('location.pathname.endsWith(' + JSON.stringify(file.split('?')[0]) + ') && document.readyState === "complete"')) return;
        }
        throw new Error('Page load timed out: ' + file);
    }
    const project = { id: 123, name: 'Regression', results: { recommendation: { equipment: 'Excavator, Dump Truck, Wheel Loader, Motor Grader, Bulldozer, Compactor' } } };
    await open('produktivitas.html');
    assert.equal(await evaluate('document.querySelectorAll("#productivityEquipmentGrid .equipment-card").length'), 7);
    await evaluate('localStorage.clear(); localStorage.setItem("excabase_active_project", ' + JSON.stringify(JSON.stringify(project)) + '); localStorage.setItem("excabase_projects", ' + JSON.stringify(JSON.stringify([project])) + ')');
    const before = await evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])');
    const cases = {
        excavator: { bucket: 2, fillFactor: .8, cycleTime: 30, efficiency: .75, workingHours: 8 },
        dumptruck: { truckCapacity: 10, truckCycleTime: 20, truckEfficiency: .8, truckWorkingHours: 8 },
        wheelloader: { loaderBucket: 2, loaderFillFactor: .8, loaderCycleTime: 30, loaderEfficiency: .75, loaderWorkingHours: 8 },
        motorgrader: { graderWidth: 3, graderSpeed: 4, graderEfficiency: .75, graderPasses: 4, graderThickness: .2, graderWorkingHours: 8 },
        bulldozer: { dozerCapacity: 2, dozerFillFactor: .8, dozerCycleTime: 30, dozerEfficiency: .75, dozerWorkingHours: 8 },
        compactor: { compactorWidth: 2, compactorSpeed: 4, compactorEfficiency: .75, compactorPasses: 4, compactorThickness: .2, compactorWorkingHours: 8 }
    };
    const expected = { excavator: 144, dumptruck: 24, wheelloader: 144, motorgrader: 450, bulldozer: 144, compactor: 300 };
    const populate = (type, fields) => `(() => {
        const section = document.querySelector('[data-calculator="${type}"]');
        const model = section.querySelector('[data-model]'); model.value = 'custom'; model.dispatchEvent(new Event('change', {bubbles:true}));
        const name = section.querySelector('[data-custom-model-name]'); name.value = 'Test custom'; name.dispatchEvent(new Event('input', {bubbles:true}));
        for (const [key,value] of Object.entries(${JSON.stringify(fields)})) { const input = section.querySelector('[data-field="'+key+'"]'); input.value = value; input.dispatchEvent(new Event('input', {bubbles:true})); }
        section.querySelector('[data-action="calculate"]').click();
    })()`;
    const helperCases = {
        excavator: ['fill', {condition:'mudah',value:'1.15'}, 'fillFactor', 1.15],
        dumptruck: ['cycle', {distance:'1000',loadedSpeed:'20',returnSpeed:'40',loading:'2',other:'1'}, 'truckCycleTime', 7.5],
        wheelloader: ['loader-v', {condition:'1-0'}, 'loaderCycleTime', 33],
        motorgrader: ['speed', {condition:'jalan',value:'4'}, 'graderSpeed', 4],
        bulldozer: ['cycle', {distance:'30',loadedSpeed:'3',returnSpeed:'4',transmission:'tc'}, 'dozerCycleTime', 66],
        compactor: ['passes', {condition:'vibratory',value:'8'}, 'compactorPasses', 8]
    };
    async function testHelper(type, inputKey) {
        const descriptionCheck = await evaluate(`(() => {
            const section=document.querySelector('[data-calculator=${type}]');
            const mainBefore=JSON.stringify([...section.querySelectorAll('[data-field]')].map(input=>input.value));
            const storageBefore=JSON.stringify({...localStorage});
            const selector=section.querySelector('[data-helper-method]');
            let count=0;
            const dozerTexts={mudah:'Material mudah didorong dan terkumpul di depan blade dengan kehilangan relatif kecil.',sedang:'Material cukup mudah didorong, tetapi sebagian dapat tercecer.',agak:'Material lebih sulit terkumpul di depan blade sehingga volume dorongan berkurang.',sulit:'Material sulit didorong atau banyak tercecer sehingga pengisian blade kurang optimal.'};
            for(const method of ProductivityReferenceData.methods[${JSON.stringify(type)}]) {
                selector.value=method.id;selector.dispatchEvent(new Event('change',{bubbles:true}));
                for(const field of method.fields.filter(field=>field.options)) {
                    const input=section.querySelector('[data-helper-input="'+field.id+'"]');
                    const description=section.querySelector('[data-helper-description="'+field.id+'"]');
                    if(!description || input.nextElementSibling!==description || input.getAttribute('aria-describedby')!==description.id) throw new Error('Description placement/accessibility missing');
                    for(const [key] of [...field.options].reverse()) {
                        input.value=key;input.dispatchEvent(new Event('change',{bubbles:true}));
                        const expected='Interpretasi praktis: '+field.descriptions[key];
                        if(description.textContent!==expected || !field.descriptions[key]) throw new Error('Wrong condition description: '+method.id+'/'+key);
                        if(${JSON.stringify(type)}==='bulldozer' && method.id==='fill' && description.textContent!=='Interpretasi praktis: '+dozerTexts[key]) throw new Error('User-provided blade description changed');
                        count++;
                    }
                    input.value='';input.dispatchEvent(new Event('change',{bubbles:true}));
                    if(!description.textContent.startsWith('Pilih ')) throw new Error('Stale condition description');
                }
            }
            if(mainBefore!==JSON.stringify([...section.querySelectorAll('[data-field]')].map(input=>input.value)) || storageBefore!==JSON.stringify({...localStorage})) throw new Error('Condition change mutated main input/storage');
            return count;
        })()`);
        assert.ok(descriptionCheck > 0);
        console.log('PASS condition descriptions: ' + type + ', ' + descriptionCheck + ' choices, ' + inputKey);
        const [method, values, target, expectedValue] = helperCases[type];
        await evaluate(populate(type, cases[type]));
        const mainBefore = await evaluate(`JSON.stringify([...document.querySelector('[data-calculator=${type}]').querySelectorAll('[data-field]')].map(i=>i.value))`);
        const storageBefore = await evaluate('JSON.stringify({...localStorage})');
        await evaluate(`(() => {
            const section=document.querySelector('[data-calculator=${type}]');
            section.querySelector('.parameter-helper').open=true;
            const select=section.querySelector('[data-helper-method]'); select.value=${JSON.stringify(method)};select.dispatchEvent(new Event('change',{bubbles:true}));
            for(const [key,value] of Object.entries(${JSON.stringify(values)})) {const input=section.querySelector('[data-helper-input="'+key+'"]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
            section.querySelector('[data-helper-preview]').click();
        })()`);
        assert.equal(await evaluate(`JSON.stringify([...document.querySelector('[data-calculator=${type}]').querySelectorAll('[data-field]')].map(i=>i.value))`), mainBefore);
        assert.equal(await evaluate('JSON.stringify({...localStorage})'), storageBefore, type + ': preview wrote storage');
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-apply]').disabled`), false);
        await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-apply]').click()`);
        assert.ok(Math.abs(await evaluate(`Number(document.querySelector('[data-calculator=${type}] [data-field=${target}]').value)`) - expectedValue) < 1e-10);
        const stored = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(inputKey)}))[${JSON.stringify(type)}].parameterHelp[${JSON.stringify(target)}]`);
        assert.equal(stored.method, method); assert.ok(stored.source.page && stored.source.table && stored.appliedAt);
        await evaluate(`(() => {const input=document.querySelector('[data-calculator=${type}] [data-field=${target}]');input.value=${JSON.stringify(String(cases[type][target]))};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
        assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(inputKey)}))[${JSON.stringify(type)}].parameterHelp[${JSON.stringify(target)}].overriddenManually`), expectedValue !== cases[type][target] ? true : undefined);
    }
    async function testEffectiveWidth(type, inputKey, page) {
        if (!['motorgrader', 'compactor'].includes(type)) return;
        const field = type === 'motorgrader' ? 'graderWidth' : 'compactorWidth';
        await evaluate(populate(type, cases[type]));
        await evaluate(`(() => {const model=document.querySelector('[data-calculator=${type}] [data-model]');model.value='0';model.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-field=${field}]').value`), '', 'nominal width leaked into effective width');
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-field=${field}]').readOnly`), false);
        async function preview(values) {
            await evaluate(`(() => {
                const section=document.querySelector('[data-calculator=${type}]');
                const method=section.querySelector('[data-helper-method]');method.value='effective-width';method.dispatchEvent(new Event('change',{bubbles:true}));
                for(const [key,value] of Object.entries(${JSON.stringify(values)})){const input=section.querySelector('[data-helper-input="'+key+'"]');input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));}
                section.querySelector('[data-helper-preview]').click();
            })()`);
        }
        const choices = type === 'motorgrader' ? [
            [{nominal:'3.7',angle:'45'},2.6], [{nominal:'3.7',angle:'60'},3.2]
        ] : [[{nominal:'2.134',roller:'vbesar'},1.934],[{nominal:'2.134',roller:'vkecil'},2.034],
            [{nominal:'2.134',roller:'tire'},1.984]];
        for (const [values, expectedWidth] of choices) {
            const beforeWidth=await evaluate(`document.querySelector('[data-calculator=${type}] [data-field=${field}]').value`);
            const beforeStorage=await evaluate('JSON.stringify({...localStorage})');
            await preview(values);
            assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-field=${field}]').value`), beforeWidth);
            assert.equal(await evaluate('JSON.stringify({...localStorage})'),beforeStorage,'width preview changed storage');
            assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-apply]').disabled`),false);
            await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-apply]').click()`);
            assert.ok(Math.abs(await evaluate(`Number(document.querySelector('[data-calculator=${type}] [data-field=${field}]').value)`) - expectedWidth)<1e-10);
            const saved=await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(inputKey)}))[${JSON.stringify(type)}]`);
            assert.equal(saved.effectiveWidthVersion,1);
            assert.deepEqual(saved.parameterHelp[field].inputs,values);
            assert.equal(saved.parameterHelp[field].model,'0');
            assert.equal(saved.parameterHelp[field].source.page,type==='motorgrader'?35:47);
            const result=await evaluate(inputKey==='excabase_standalone_productivity_inputs'
                ? `JSON.parse(localStorage.getItem('excabase_standalone_productivity_results')).${type}`
                : `JSON.parse(localStorage.getItem('excabase_active_project')).results.productivity.${type}`);
            assert.equal(result.volumeBasis,type==='motorgrader'?'lcm':'ccm');
            assert.ok(Math.abs(result.hourly-expectedWidth*150)<1e-8);
            await open(page);
            assert.ok(Math.abs(await evaluate(`Number(document.querySelector('[data-calculator=${type}] [data-field=${field}]').value)`) - expectedWidth)<1e-10,'effective width lost on reload');
        }
        if(type==='motorgrader') {
            await preview({nominal:'4',angle:'45'});
            assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-apply]').disabled`),true,'mismatched blade accepted');
        } else {
            await preview({nominal:'2.134',roller:''});
            assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-apply]').disabled`),true,'unknown roller accepted');
        }
        await preview(choices[0][0]);
        await evaluate(`(() => {const model=document.querySelector('[data-calculator=${type}] [data-model]');model.value='2';model.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-field=${field}]').value`),'');
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-apply]').disabled`),true,'stale width preview survived model change');
        if(type==='motorgrader') {
            await preview({nominal:'3.7',angle:'45'});
            assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-apply]').disabled`),true,'unsupported 3.66 m blade interpolated');
        }
        await evaluate(`(() => {const input=document.querySelector('[data-calculator=${type}] [data-field=${field}]');input.value='1.8';input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await open(page);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-field=${field}]').value`),'1.8','manual effective width lost');
        // Legacy nominal widths must not silently become confirmed effective widths.
        await evaluate(`(() => {const key=${JSON.stringify(inputKey)};const data=JSON.parse(localStorage.getItem(key));delete data.${type}.effectiveWidthVersion;data.${type}.fields.${field}='9';localStorage.setItem(key,JSON.stringify(data));})()`);
        const oldHelp=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem(${JSON.stringify(inputKey)})).${type}.parameterHelp)`);
        await open(page);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-field=${field}]').value`),'');
        assert.equal(await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem(${JSON.stringify(inputKey)})).${type}.parameterHelp)`),oldHelp,'legacy metadata removed');
        console.log('PASS effective width: '+type+', '+inputKey+'; table/overlap, preview, metadata, basis, reload, model change, manual, legacy');
    }
    for (const [type, fields] of Object.entries(cases)) {
        await open('produktivitas-' + type + '.html');
        assert.equal(await evaluate('document.querySelector(".sidebar .menu a.active").getAttribute("href")'), 'produktivitas.html');
        assert.equal(await evaluate('[...document.querySelectorAll("a,button")].some(el=>el.textContent.includes("Kembali ke"))'), false);
        assert.equal(await evaluate('document.querySelector(".sidebar").textContent.includes("TAHAPAN PROYEK")'), false);
        assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'), 1);
        assert.ok(await evaluate('document.querySelector("[data-model]").options.length > 1'));
        assert.equal(await evaluate(`document.querySelector('[data-model]').options.length`), await evaluate(`equipmentData.find(item=>item.id===${JSON.stringify(type)}).models.length+1`));
        await evaluate(`(() => {const model=document.querySelector('[data-model]');for(const option of [...model.options].filter(o=>o.value!=='custom')){model.value=option.value;model.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
        if (type === 'dumptruck') {
            await evaluate(`document.querySelector('[data-model]').value='0';document.querySelector('[data-model]').dispatchEvent(new Event('change',{bubbles:true}))`);
            assert.equal(await evaluate(`document.querySelector('[data-field=truckCapacity]').value`), '24');
            assert.equal(await evaluate(`document.querySelector('[data-field=truckCapacity]').readOnly`), true);
            await evaluate(`document.querySelector('[data-model]').value='1';document.querySelector('[data-model]').dispatchEvent(new Event('change',{bubbles:true}))`);
            assert.equal(await evaluate(`document.querySelector('[data-field=truckCapacity]').readOnly`), false);
            assert.equal(await evaluate(`document.querySelector('[data-field=truckCapacity]').value`), '');
        }
        await testHelper(type, 'excabase_standalone_productivity_inputs');
        await testEffectiveWidth(type, 'excabase_standalone_productivity_inputs', 'produktivitas-'+type+'.html');
        await evaluate('const select = document.querySelector("[data-model]"); select.value="1"; select.dispatchEvent(new Event("change", {bubbles:true}))');
        const catalogCapacity = await evaluate('document.querySelector("[data-field]").value');
        await open('produktivitas-' + type + '.html');
        assert.equal(await evaluate('document.querySelector("[data-model]").value'), '1');
        assert.equal(await evaluate('document.querySelector("[data-field]").value'), catalogCapacity);
        await evaluate(populate(type, fields));
        let result = await evaluate('JSON.parse(localStorage.getItem("excabase_standalone_productivity_results"))[' + JSON.stringify(type) + ']');
        assert.equal(result.hourly, expected[type]); assert.equal(result.daily, expected[type] * 8);
        const fieldsToReject = Object.keys(fields).filter(field => /efficiency|workingHours|passes|fillFactor/i.test(field));
        for (const field of fieldsToReject) {
            const invalid = /efficiency/i.test(field) ? '1.01' : /workingHours/i.test(field) ? '25' : /passes/i.test(field) ? '4.5' : type === 'excavator' ? '1.21' : '1.11';
            await evaluate(`(() => {const input=document.querySelector('[data-field=${field}]');input.value=${JSON.stringify(invalid)};input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-action=calculate]').click();})()`);
            assert.equal(await evaluate(`document.querySelector('[data-result=hourly]').textContent`), '-');
            assert.equal(await evaluate(`JSON.parse(localStorage.getItem('excabase_standalone_productivity_results'))[${JSON.stringify(type)}]`), undefined);
            await evaluate(populate(type, fields));
        }
        // Two negative factors must never produce an accepted positive result.
        await evaluate(`(() => {const inputs=[...document.querySelectorAll('[data-field]')];inputs[0].value=-2;inputs[1].value=-2;document.querySelector('[data-action=calculate]').click();})()`);
        assert.equal(await evaluate(`document.querySelector('[data-result=hourly]').textContent`), '-');
        await evaluate(populate(type, fields));
        await open('produktivitas-' + type + '.html');
        assert.equal(await evaluate('document.querySelector("[data-model]").value'), 'custom');
        assert.equal(await evaluate('document.querySelector("[data-custom-model-name]").value'), 'Test custom');
        assert.equal(await evaluate('document.querySelector("[data-field]").value'), String(Object.values(fields)[0]));
        await evaluate('document.querySelector("[data-field]").value = 0; document.querySelector("[data-action=calculate]").click()');
        assert.equal(await evaluate('document.querySelector("[data-result=hourly]").textContent'), '-');
        await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Reset").click()');
        await delay(150);
        assert.equal(await evaluate('document.querySelector("[data-model]").value'), '0');
        assert.ok(await evaluate('!JSON.parse(localStorage.getItem("excabase_standalone_productivity_inputs"))[' + JSON.stringify(type) + ']'));
        assert.equal(await evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])'), before);
        console.log('PASS standalone ' + type + ': formula, custom model, restore, invalid input, reset, project isolation');
    }
    await evaluate('localStorage.clear()');
    await open('produktivitas-excavator.html');
    await evaluate(populate('excavator', cases.excavator));
    assert.equal(await evaluate('localStorage.getItem("excabase_active_project")'), null);
    const individualBefore = await evaluate('JSON.stringify([localStorage.getItem("excabase_standalone_productivity_inputs"),localStorage.getItem("excabase_standalone_productivity_results")])');
    await open('produktivitas-kombinasi.html');
    assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'), 0);
    await evaluate('document.querySelector("#applyCombination").click()');
    assert.ok(await evaluate('document.querySelector("#combinationStatus").textContent.includes("minimal satu")'));
    await evaluate('document.querySelectorAll("[name=equipment]").forEach(c=>c.checked=true);document.querySelector("#applyCombination").click()');
    assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'), 6);
    for (const [type, fields] of Object.entries(cases)) {
        await testHelper(type, 'excabase_combination_productivity_inputs');
        await evaluate(populate(type, fields));
        const result = await evaluate('JSON.parse(localStorage.getItem("excabase_combination_productivity_results"))[' + JSON.stringify(type) + ']');
        assert.equal(result.hourly, expected[type]);
        assert.equal(result.daily, expected[type] * 8);
    }
    // Keep an edit even before the user recalculates, removes, and re-adds an equipment type.
    await evaluate('const input=document.querySelector("[data-calculator=excavator] [data-field=bucket]");input.value=3;input.dispatchEvent(new Event("input",{bubbles:true}))');
    await evaluate('document.querySelector("[name=equipment][value=excavator]").checked=false;document.querySelector("#applyCombination").click()');
    assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'), 5);
    await evaluate('document.querySelector("[name=equipment][value=excavator]").checked=true;document.querySelector("#applyCombination").click()');
    assert.equal(await evaluate('document.querySelector("[data-calculator=excavator] [data-field=bucket]").value'), '3');
    const combinationInputs = await evaluate('JSON.parse(localStorage.getItem("excabase_combination_productivity_inputs"))');
    await open('produktivitas-kombinasi.html');
    assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'), 6);
    assert.equal(await evaluate('document.querySelector("[data-calculator=excavator] [data-field=bucket]").value'), '3');
    await evaluate('const section=document.querySelector("[data-calculator=excavator]");[...section.querySelectorAll("button")].find(b=>b.textContent==="Reset").click()');
    await delay(200);
    const afterReset = await evaluate('JSON.parse(localStorage.getItem("excabase_combination_productivity_inputs"))');
    assert.equal(afterReset.excavator, undefined);
    for (const type of Object.keys(cases).filter(type=>type!=='excavator')) assert.deepEqual(afterReset[type], combinationInputs[type]);
    assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'), 6);
    assert.equal(await evaluate('JSON.stringify([localStorage.getItem("excabase_standalone_productivity_inputs"),localStorage.getItem("excabase_standalone_productivity_results")])'), individualBefore);
    assert.equal(await evaluate('localStorage.getItem("excabase_active_project")'), null);
    // Repeated remounts must not accumulate delegated calculation handlers.
    await evaluate(`window.resultWrites=0;const nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='excabase_combination_productivity_results')window.resultWrites++;return nativeSet.call(this,key,value)};document.querySelector('[data-calculator=dumptruck] [data-action=calculate]').click()`);
    assert.equal(await evaluate('window.resultWrites'), 1);
    console.log('PASS combination: formulas, selection edits, restore, isolated reset/storage, single handlers');
    await evaluate('localStorage.setItem("excabase_active_project", ' + JSON.stringify(JSON.stringify(project)) + '); localStorage.setItem("excabase_projects", ' + JSON.stringify(JSON.stringify([project])) + ')');
    const combinationBeforeProject = await evaluate('JSON.stringify([localStorage.getItem("excabase_combination_productivity_selection"),localStorage.getItem("excabase_combination_productivity_inputs"),localStorage.getItem("excabase_combination_productivity_results")])');
    await open('produktivitas.html?fromProject=1');
    assert.equal(await evaluate('document.querySelector(".sidebar").textContent.includes("TAHAPAN PROYEK")'), true);
    assert.equal(await evaluate('getComputedStyle(document.querySelector("#productivityEquipmentGrid")).display'), 'none');
    assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'), 6);
    for (const [type, fields] of Object.entries(cases)) {
        await testHelper(type, 'excabase_productivity_123');
        await testEffectiveWidth(type, 'excabase_productivity_123', 'produktivitas.html?fromProject=1');
        await evaluate(populate(type, fields));
        const result = await evaluate('JSON.parse(localStorage.getItem("excabase_active_project")).results.productivity[' + JSON.stringify(type) + ']');
        assert.equal(result.hourly, expected[type]); assert.equal(result.daily, expected[type] * 8);
    }
    await open('produktivitas.html?fromProject=1');
    assert.equal(await evaluate('document.querySelector("[data-model]").value'), 'custom');
    await evaluate('const p = JSON.parse(localStorage.getItem("excabase_active_project")); p.results.selectedEquipment=["Excavator"]; p.status="selesai"; localStorage.setItem("excabase_active_project",JSON.stringify(p))');
    const lockedBeforeLoad = await evaluate('JSON.stringify({...localStorage})');
    await open('produktivitas.html?fromProject=1');
    assert.equal(await evaluate('JSON.stringify({...localStorage})'), lockedBeforeLoad, 'completed project changed during mount');
    assert.equal(await evaluate('document.querySelector("[data-helper-preview]").disabled'), true);
    await evaluate(`document.querySelector('[data-field]').value=999;document.querySelector('[data-field]').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-action=calculate]').disabled=false;document.querySelector('[data-action=calculate]').click()`);
    assert.equal(await evaluate('JSON.stringify({...localStorage})'), lockedBeforeLoad, 'completed project changed via programmatic input');
    assert.equal(await evaluate('document.querySelectorAll("[data-calculator]").length'), 1);
    assert.equal(await evaluate('document.querySelector("[data-model]").disabled'), true);
    assert.equal(await evaluate('JSON.stringify([localStorage.getItem("excabase_combination_productivity_selection"),localStorage.getItem("excabase_combination_productivity_inputs"),localStorage.getItem("excabase_combination_productivity_results")])'), combinationBeforeProject);
    const completedProjectBefore = await evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])');
    await open('produktivitas-kombinasi.html');
    assert.equal(await evaluate('document.querySelector("[data-model]").disabled'), false);
    await evaluate(populate('dumptruck', cases.dumptruck));
    assert.equal(await evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])'), completedProjectBefore);
    await open('produktivitas-excavator.html');
    await evaluate(populate('excavator', cases.excavator));
    await open('produktivitas-dumptruck.html');
    await evaluate(populate('dumptruck', cases.dumptruck));
    const retainedTruck = await evaluate('JSON.parse(localStorage.getItem("excabase_standalone_productivity_inputs")).dumptruck');
    await open('produktivitas-excavator.html');
    await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Reset").click()');
    await delay(200);
    assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("excabase_standalone_productivity_inputs")).dumptruck'), retainedTruck);
    assert.equal(await evaluate('JSON.stringify([localStorage.getItem("excabase_active_project"),localStorage.getItem("excabase_projects")])'), completedProjectBefore);
    assert.equal(errors.length, 0, JSON.stringify(errors));
    console.log('PASS no-project mode; project formulas, persistence, selected subset, completed lock; no browser exceptions');
    for (const file of [...Object.keys(cases).map(type=>'produktivitas-'+type+'.html'), 'produktivitas-kombinasi.html']) {
        await open(file);
        assert.equal(await evaluate('document.querySelector(".sidebar .menu a.active").getAttribute("href")'), 'produktivitas.html');
        assert.equal(await evaluate('[...document.querySelectorAll("a,button")].some(el=>el.textContent.includes("Kembali ke"))'), false);
        const sameMenu = await evaluate(`(async()=>{const html=await(await fetch('/index.html')).text();const dashboard=new DOMParser().parseFromString(html,'text/html');const links=dom=>[...dom.querySelectorAll('.sidebar .menu a')].map(a=>[a.textContent.replaceAll(' ', '').trim(),a.getAttribute('href').replace(/^pages\\//,'').replace(/^\.\.\\//,'')]);return JSON.stringify(links(dashboard))===JSON.stringify(links(document))})()`);
        assert.equal(sameMenu, true, file + ': sidebar differs from dashboard');
        for (const width of [1440, 768, 390, 360]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
            await evaluate(`document.querySelectorAll('.parameter-helper').forEach(panel => {
                panel.open = true;
                panel.querySelectorAll('select[data-helper-input]').forEach(input => {
                    input.selectedIndex = 1;
                    input.dispatchEvent(new Event('change', {bubbles:true}));
                });
            });`);
            assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), file + ': horizontal overflow at ' + width);
            if (width <= 600) assert.equal(await evaluate('getComputedStyle(document.querySelector(".sidebar")).overflowY'), 'auto');
        }
    }
    await send('Emulation.clearDeviceMetricsOverride');
    console.log('PASS seven sidebars and responsive widths');
    async function testSource(type, key, page) {
        await open(page);
        await evaluate(populate(type,cases[type]));
        const before=await evaluate('JSON.stringify({...localStorage})');
        await evaluate(`(() => {const s=document.querySelector('[data-calculator=${type}] [data-helper-data-source]');s.value='actual';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        assert.equal(await evaluate('JSON.stringify({...localStorage})'),before,'source choice mutated saved calculations');
        await evaluate(`(() => {const s=document.querySelector('[data-calculator=${type}]');const m=s.querySelector('[data-helper-method]');m.value=${JSON.stringify(helperCases[type][0])};m.dispatchEvent(new Event('change',{bubbles:true}));const manual=s.querySelector('[data-helper-manual]');manual.checked=true;manual.dispatchEvent(new Event('change',{bubbles:true}));s.querySelector('[data-helper-input=value]').value=${JSON.stringify(String(cases[type][helperCases[type][2]]))};s.querySelector('[data-helper-source-details]').value='Pengamatan uji lapangan';s.querySelector('[data-helper-preview]').click();})()`);
        assert.equal(await evaluate('JSON.stringify({...localStorage})'),before,'manual preview wrote storage');
        await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-apply]').click()`);
        const entry=await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).${type}.parameterHelp.${helperCases[type][2]}`);
        assert.equal(entry.dataSource,'actual');assert.equal(entry.method,'manual');assert.equal(entry.source,null);assert.equal(entry.sourceDetails,'Pengamatan uji lapangan');
        await open(page);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-data-source]').value`),'actual');
    }
    async function testLoading(key,page) {
        await open(page);
        await evaluate(populate('dumptruck',cases.dumptruck));
        await evaluate(`(() => {const s=document.querySelector('[data-calculator=dumptruck]');const source=s.querySelector('[data-helper-data-source]');source.value='planning';source.dispatchEvent(new Event('change',{bubbles:true}));const m=s.querySelector('[data-helper-method]');m.value='loading';m.dispatchEvent(new Event('change',{bubbles:true}));s.querySelector('[data-helper-input=loadVolume]').value='10';s.querySelector('[data-helper-input=loaderProductivity]').value='120';s.querySelector('[data-helper-preview]').click();})()`);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=dumptruck] [data-field=truckCycleTime]').value`),'20');
        await evaluate(`document.querySelector('[data-calculator=dumptruck] [data-helper-apply]').click()`);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=dumptruck] [data-field=truckCycleTime]').value`),'20','loading replaced total cycle');
        assert.equal(await evaluate(`document.querySelector('[data-calculator=dumptruck] [data-helper-input=loading]').value`),'5');
        await evaluate(`(() => {const s=document.querySelector('[data-calculator=dumptruck]');for(const [k,v] of Object.entries({distance:'1000',loadedSpeed:'20',returnSpeed:'40',other:'1'}))s.querySelector('[data-helper-input='+k+']').value=v;s.querySelector('[data-helper-preview]').click();s.querySelector('[data-helper-apply]').click();})()`);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=dumptruck] [data-field=truckCycleTime]').value`),'10.5');
        const entry=await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).dumptruck.parameterHelp.truckCycleTime`);
        assert.equal(entry.dataSource,'planning');assert.equal(entry.components.loading.value,5);assert.equal(entry.components.loading.inputs.loaderProductivity,'120');
        await open(page);
        await evaluate(`(() => {const s=document.querySelector('[data-calculator=dumptruck]');const m=s.querySelector('[data-helper-method]');m.value='cycle';m.dispatchEvent(new Event('change',{bubbles:true}));s.querySelector('[data-helper-input=loading]').value='6';s.querySelector('[data-helper-preview]').click();s.querySelector('[data-helper-apply]').click();})()`);
        assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).dumptruck.parameterHelp.truckCycleTime.components`),undefined,'manual loading retained false provenance');
    }
    for(const type of Object.keys(cases)) await testSource(type,'excabase_standalone_productivity_inputs','produktivitas-'+type+'.html');
    await testLoading('excabase_standalone_productivity_inputs','produktivitas-dumptruck.html');
    await evaluate('localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(project))+');localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([project]))+')');
    for(const type of Object.keys(cases)) await testSource(type,'excabase_productivity_123','produktivitas.html?fromProject=1');
    await testLoading('excabase_productivity_123','produktivitas.html?fromProject=1');
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS stage 2: six source selectors, manual actual values, reload, loading-to-cycle transfer and provenance in standalone/project');
    async function testSpeedGuide(type,key,page) {
        const method=type==='dumptruck'?'cycle':'travel-cycle';
        const target=type==='dumptruck'?'truckCycleTime':'loaderCycleTime';
        await open(page);await evaluate(populate(type,cases[type]));
        await evaluate(`(() => {const s=document.querySelector('[data-calculator=${type}]');s.querySelector('.parameter-helper').open=true;const src=s.querySelector('[data-helper-data-source]');src.value='planning';src.dispatchEvent(new Event('change'));const m=s.querySelector('[data-helper-method]');m.value='${method}';m.dispatchEvent(new Event('change'));})()`);
        const rows=type==='dumptruck'?[['datar',40,60],['menanjak',20,40],['menurun',20,40]]:[['baik',10,12],['sedang',10,11],['agak',10,10],['sulit',9,9]];
        for(const [condition,loaded,empty] of rows) {
            const before=await evaluate('JSON.stringify({...localStorage})');
            const mainBefore=await evaluate(`document.querySelector('[data-calculator=${type}] [data-field=${target}]').value`);
            await evaluate(`(() => {const s=document.querySelector('[data-calculator=${type}]');s.querySelector('[data-speed-guide]').open=true;for(const f of ['loadedCondition','returnCondition']){const i=s.querySelector('[data-speed-guide-input='+f+']');i.value='${condition}';i.dispatchEvent(new Event('change'));}})()`);
            if(condition===rows[0][0]) assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-speed-guide-input=loadedSpeed]').value`),'','guide invented default speed');
            assert.equal(await evaluate('JSON.stringify({...localStorage})'),before);
            await evaluate(`(() => {const s=document.querySelector('[data-calculator=${type}]');s.querySelector('[data-speed-guide-input=loadedSpeed]').value='${loaded}';s.querySelector('[data-speed-guide-input=returnSpeed]').value='${empty}';s.querySelector('[data-speed-guide-apply]').click();})()`);
            assert.deepEqual(await evaluate(`['loadedSpeed','returnSpeed'].map(f=>Number(document.querySelector('[data-calculator=${type}] [data-helper-input='+f+']').value))`),[loaded,empty]);
            assert.equal(await evaluate('JSON.stringify({...localStorage})'),before,'speed application saved before cycle review');
            assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-field=${target}]').value`),mainBefore);
            await evaluate(`(() => {const s=document.querySelector('[data-calculator=${type}]');for(const [k,v] of Object.entries(${JSON.stringify(type==='dumptruck'?{distance:'1000',loading:'2',other:'1'}:{distance:'1000',fixed:'.75'})}))s.querySelector('[data-helper-input='+k+']').value=v;s.querySelector('[data-helper-preview]').click();s.querySelector('[data-helper-apply]').click();})()`);
            const expectedCycle=(60*(1/loaded+1/empty)+(type==='dumptruck'?3:.75))*(type==='dumptruck'?1:60);
            assert.ok(Math.abs(await evaluate(`Number(document.querySelector('[data-calculator=${type}] [data-field=${target}]').value)`)-expectedCycle)<1e-8);
            const metadata=await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).${type}.parameterHelp.${target}`);
            assert.equal(metadata.components.speeds.source.page,type==='dumptruck'?25:42);
            assert.equal(metadata.components.speeds.inputs.loadedCondition,condition);
            await open(page);
            await evaluate(`(() => {const s=document.querySelector('[data-calculator=${type}]');const m=s.querySelector('[data-helper-method]');m.value='${method}';m.dispatchEvent(new Event('change'));})()`);
            assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-input=loadedSpeed]').value`),String(loaded));
            assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-speed-guide-input=loadedCondition]').value`),condition);
        }
        for(const width of [390,360]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
            await evaluate(`document.querySelector('[data-calculator=${type}] .parameter-helper').open=true;document.querySelector('[data-calculator=${type}] [data-speed-guide]').open=true`);
            assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'speed guide overflow');
        }
        await send('Emulation.clearDeviceMetricsOverride');
        await evaluate(`(() => {const s=document.querySelector('[data-calculator=${type}]');const src=s.querySelector('[data-helper-data-source]');src.value='actual';src.dispatchEvent(new Event('change'));const input=s.querySelector('[data-helper-input=loadedSpeed]');input.value='7';input.dispatchEvent(new Event('input',{bubbles:true}));s.querySelector('[data-helper-input=returnSpeed]').value='8';s.querySelector('[data-helper-preview]').click();s.querySelector('[data-helper-apply]').click();})()`);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-speed-guide]').hidden`),true);
        const manualMetadata=await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).${type}.parameterHelp.${target}`);
        assert.equal(manualMetadata.dataSource,'actual');assert.equal(manualMetadata.components?.speeds,undefined);
        await open(page);
        await evaluate(`(() => {const s=document.querySelector('[data-calculator=${type}]');const m=s.querySelector('[data-helper-method]');m.value='${method}';m.dispatchEvent(new Event('change'));})()`);
        assert.equal(await evaluate(`document.querySelector('[data-calculator=${type}] [data-helper-input=loadedSpeed]').value`),'7');
        console.log('PASS speed guide '+type+' '+key+': conditions, pair application, cycle, provenance/reload, actual manual, mobile');
    }
    for(const type of ['dumptruck','wheelloader']) await testSpeedGuide(type,'excabase_standalone_productivity_inputs','produktivitas-'+type+'.html');
    for(const type of ['dumptruck','wheelloader']) await testSpeedGuide(type,'excabase_productivity_123','produktivitas.html?fromProject=1');
    assert.equal(errors.length,0,JSON.stringify(errors));

})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
    socket?.close(); browser?.kill(); server.close();
    // Profile lives in the operating-system temp directory; leave cleanup to the OS.
});
