/* Presentation only. Move existing output nodes; never calculate, persist or submit. */
(function () {
    'use strict';
    function element(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function volume(root) {
        if (root.querySelector(':scope > .results-kpi-grid')) return;
        const groups = [];
        for (const node of [...root.children]) {
            if (node.tagName === 'H3') groups.push({ heading: node, nodes: [] });
            else groups.at(-1)?.nodes.push(node);
        }
        if (groups.length < 3) return;
        const values = groups.slice(0, 3).map(group => group.nodes.find(node => node.tagName === 'P' && node.children.length === 1 && node.firstElementChild.tagName === 'STRONG'));
        if (values.some(node => !node)) return;
        const grid = element('div', 'results-kpi-grid results-kpi-grid--volume');
        const detail = element('section', 'results-info-panel results-formulas');
        detail.append(element('h3', '', 'Detail Perhitungan'));
        const technical = element('section', 'results-info-panel results-technical');
        const descriptions = ['Volume tanah dalam kondisi asli sebelum digali.', 'Volume tanah lepas setelah penggalian.', 'Volume tanah setelah pemadatan.'];
        groups.forEach((group, i) => {
            if (i < 3) {
                const card = element('article', 'results-kpi results-kpi--' + ['bcm', 'lcm', 'ccm'][i]);
                card.append(group.heading);
                if (i === 0) {
                    const description = group.nodes.find(node => node !== values[i]);
                    if (description) card.append(description);
                } else card.append(element('p', 'results-kpi-description', descriptions[i]));
                values[i].classList.add('results-kpi-value');
                card.append(values[i]); grid.append(card);
                group.nodes.filter(node => !card.contains(node)).forEach(node => detail.append(node));
            } else technical.append(group.heading, ...group.nodes);
        });
        root.replaceChildren(grid);
        if (detail.children.length > 1) root.append(detail);
        if (technical.children.length) root.append(technical);
        values.forEach(value => formatValue(value.firstElementChild));
    }
    function recommendation(root) {
        if (root.querySelector(':scope > .results-equipment-grid')) return;
        const heading = root.querySelector(':scope > h3');
        if (!heading) return;
        const equipment = heading.textContent.split(/,|\s+(?:dan|atau)\s+/i).map(name => name.trim().replace(/^dan\s+/i, '')).filter(Boolean);
        const functions = [
            ['excavator', 'EX', 'Penggalian dan pemuatan material.'],
            ['dump truck', 'DT', 'Pengangkutan material dari area kerja.'],
            ['wheel loader', 'WL', 'Pemuatan dan pemindahan material.'],
            ['motor grader', 'MG', 'Perataan dan pembentukan permukaan.'],
            ['bulldozer', 'BD', 'Pendorongan dan penyebaran material.'],
            ['compactor', 'CP', 'Pemadatan tanah dan lapisan pekerjaan.']
        ];
        const paragraphs = [...root.querySelectorAll(':scope > p')];
        const grid = element('div', 'results-equipment-grid');
        equipment.forEach(name => {
            const match = functions.find(item => name.toLowerCase().includes(item[0]));
            const card = element('article', 'results-equipment-card');
            const icon = element('span', 'results-equipment-icon', match?.[1] || 'AL');
            icon.setAttribute('aria-hidden', 'true');
            card.append(icon, element('h4', '', name), element('p', '', match?.[2] || 'Alat sesuai opsi pekerjaan yang direkomendasikan.'));
            grid.append(card);
        });
        heading.classList.add('results-recommendation-summary');
        root.replaceChildren(heading, grid);
        paragraphs.forEach(paragraph => {
            const target = paragraph.querySelector('strong')?.textContent.includes('Target produktivitas');
            const panel = element('section', target ? 'results-kpi results-recommendation-target' : 'results-info-panel');
            panel.append(paragraph); root.append(panel);
        });
    }
    function formatValue(value) {
            if (value.querySelector('.results-unit')) return;
            const parts = value.textContent.match(/^([\d.,]+)(\s+)(.+)$/);
            if (!parts) return;
            value.replaceChildren(element('span', 'results-number', parts[1]), document.createTextNode(parts[2]), element('small', 'results-unit', parts[3]));
    }
    function productivity(root) {
        root.querySelectorAll('[data-result="hourly"], [data-result="daily"]').forEach(formatValue);
    }
    function watch(root, decorate) {
        if (!root) return;
        const observer = new MutationObserver(() => {
            observer.disconnect();
            decorate(root);
            observer.observe(root, { childList: true, subtree: true, characterData: true });
        });
        decorate(root);
        observer.observe(root, { childList: true, subtree: true, characterData: true });
    }
    function init() {
        if (!document.body.hasAttribute('data-results-ui')) return;
        watch(document.getElementById('earthworkCalculationDetails'), volume);
        watch(document.getElementById('recommendationResult'), recommendation);
        document.querySelectorAll('[data-standalone-calculator], #combinationCalculators, #projectProductivityCalculators').forEach(root => watch(root, productivity));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
