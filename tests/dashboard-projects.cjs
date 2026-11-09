// Real navigation in a temporary Chrome profile; never touches the user's browser data.
const fs = require('node:fs');
const harness = fs.readFileSync(require('node:path').join(__dirname, 'productivity.cjs'), 'utf8');
const test = async function () {
    async function dashboard() {
        await send('Page.navigate', { url: base + '/index.html' });
        for (let i=0;i<100;i++) {
            await delay(40);
            if (await evaluate('location.pathname==="/index.html" && document.readyState==="complete"')) return;
        }
        throw Error('Dashboard navigation timed out');
    }
    const names = () => evaluate('[...document.querySelectorAll(".dashboard-live-project h4")].map(el=>el.textContent)');
    const access = () => evaluate('localStorage.getItem("excabase_project_access")');
    const projects = [
        {id:'A',name:'Project A',status:'aktif',createdAt:'2020-01-01T00:00:00Z',results:{earthwork:{bcm:1000}}},
        {id:'B',name:'Project B',status:'selesai',createdAt:'2021-01-01T00:00:00Z',updatedAt:'2024-01-01T00:00:00Z',results:{keep:'completed result'}},
        {id:'C',name:'Project C',status:'aktif',createdAt:'2025-01-01T00:00:00Z',results:{}},
        {id:'D',name:'Project D',status:'aktif',results:{}}
    ];
    await dashboard();
    await evaluate('localStorage.clear();localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify(projects))+');localStorage.setItem("excabase_active_project",'+JSON.stringify(JSON.stringify(projects[0]))+')');
    await dashboard();
    assert.deepEqual(await names(),['Project C','Project B'],'fallback dates must outrank the active flag');
    assert.equal(await access(),null,'dashboard rendering created access metadata');
    assert.equal(await evaluate('document.getElementById("totalProjects").textContent'),'4');
    assert.equal(await evaluate('document.querySelector(".dashboard-view-all").getAttribute("href")'),'pages/proyek-aktif.html');
    async function openProject(name) {
        await open('proyek-aktif.html');
        assert.equal(await evaluate('document.querySelectorAll(".project-list-card").length'),4);
        await evaluate(`(()=>{const card=[...document.querySelectorAll('.project-list-card')].find(el=>el.querySelector('h3').textContent===${JSON.stringify(name)});card.querySelector('.project-open-button').click()})()`);
        for(let i=0;i<100;i++) {
            await delay(40);
            if (await evaluate('location.search.includes("project=") && document.readyState==="complete" && !sessionStorage.getItem("excabase_detail_reload")')) return;
        }
        throw Error('Project detail timed out');
    }
    await openProject('Project A');
    const firstA=JSON.parse(await access()).A;
    await openProject('Project B');
    const firstB=JSON.parse(await access()).B;
    await openProject('Project A');
    assert.ok(JSON.parse(await access()).A>firstB && firstB>firstA);
    await dashboard();
    assert.deepEqual(await names(),['Project A','Project B']);
    const beforeRefresh=await access();
    await dashboard();
    assert.deepEqual(await names(),['Project A','Project B']);
    assert.equal(await access(),beforeRefresh,'dashboard refresh changed access times');
    assert.equal(await evaluate('document.querySelectorAll(".dashboard-live-badge.completed").length'),1);
    assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("excabase_projects"))'),projects,'project results/status were modified');
    // Dashboard's original Lihat Proyek link also records access and retains its URL.
    assert.equal(await evaluate('document.querySelectorAll(".dashboard-live-project a")[1].getAttribute("href")'),'pages/analisis-laporan.html?fromProject=1');
    await evaluate('document.querySelectorAll(".dashboard-live-project a")[1].click()');
    await delay(250);
    await dashboard();
    assert.deepEqual(await names(),['Project B','Project A']);
    await open('proyek-aktif.html');
    assert.equal(await evaluate('document.querySelectorAll(".project-list-card").length'),4);
    assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("excabase_projects"))'),projects);
    // Single project and empty state; statistics always cover all stored projects.
    await evaluate('localStorage.setItem("excabase_projects",'+JSON.stringify(JSON.stringify([projects[1]]))+');localStorage.removeItem("excabase_active_project")');
    await dashboard();
    assert.deepEqual(await names(),['Project B']);
    await evaluate('localStorage.setItem("excabase_projects","[]");localStorage.removeItem("excabase_active_project")');
    await dashboard();
    assert.deepEqual(await names(),[]);
    assert.ok(await evaluate('!!document.querySelector(".dashboard-empty-project")'));
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS dashboard: max two cards; actual A/B/A navigation; last access ordering; stable refresh; update/create fallback; all projects retained; completed status unchanged; dashboard link, single project, empty state');
};
const body=test.toString();
eval(harness.slice(0,harness.indexOf('    const project ='))+body.slice(body.indexOf('{')+1,body.lastIndexOf('}'))+harness.slice(harness.indexOf('})().catch')));
