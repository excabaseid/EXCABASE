/* Shared responsive navigation. Only the desktop UI preference is persisted. */
(function () {
    'use strict';
    function init() {
        const body = document.body;
        if (body.dataset.sidebarShellReady) return;
        const sidebar = document.querySelector('.sidebar');
        const content = document.querySelector('.container > .main, .container > .main-content, body > .main, body > .main-content');
        if (!sidebar || !content) return;
        body.dataset.sidebarShellReady = 'true';
        body.classList.add('sidebar-shell', 'sidebar-shell-initializing');
        content.classList.add('sidebar-shell-content');
        if (content.parentElement !== body) content.parentElement.classList.add('sidebar-shell-frame');
        sidebar.id = sidebar.id || 'excabaseSidebar';
        sidebar.setAttribute('aria-label', 'Navigasi EXCABASE');
        const preferenceKey = 'excabase_sidebar_desktop';
        const extraHeader = body.querySelector(':scope > .navbar');
        const mobile = window.matchMedia('(max-width: 1024px)');
        let desktopOpen = true, drawerOpen = false;
        try { desktopOpen = localStorage.getItem(preferenceKey) !== 'closed'; } catch { /* Keep the default when storage is unavailable. */ }
        const toolbar = document.createElement('div');
        toolbar.className = 'sidebar-shell-toolbar';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'sidebar-shell-toggle';
        toggle.dataset.sidebarControl = '';
        toggle.setAttribute('aria-controls', sidebar.id);
        toggle.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
        const title = content.querySelector('h1');
        const header = title?.closest('header, .page-header, .page-heading') || title?.parentElement;
        toolbar.append(toggle);
        if (header) {
            header.classList.add('sidebar-shell-header');
        }
        const mobileNavigation = extraHeader || document.createElement('nav');
        mobileNavigation.classList.add('sidebar-shell-mobile-navigation');
        mobileNavigation.setAttribute('aria-label', 'Kontrol navigasi aplikasi');
        const brand = sidebar.querySelector('.logo')?.cloneNode(true);
        if (brand && !extraHeader) {
            brand.removeAttribute('id');
            brand.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
            mobileNavigation.append(brand);
        }
        if (!extraHeader) content.prepend(mobileNavigation);
        const close = document.createElement('button');
        close.type = 'button'; close.className = 'sidebar-shell-close'; close.dataset.sidebarControl = '';
        close.setAttribute('aria-label', 'Tutup menu navigasi'); close.textContent = '×';
        sidebar.prepend(close);
        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-shell-backdrop'; backdrop.hidden = true; backdrop.setAttribute('aria-hidden', 'true');
        body.append(backdrop);
        const isOpen = () => mobile.matches ? drawerOpen : desktopOpen;
        // Keep the original menu, links and symbols; expose labels independently in mini mode.
        sidebar.querySelectorAll('.menu a').forEach(link => {
            const parts = link.textContent.trim().match(/^(\S+)\s+(.+)$/u);
            if (!parts) return;
            const icon = document.createElement('span'), label = document.createElement('span');
            icon.className = 'sidebar-menu-icon'; icon.textContent = parts[1]; icon.setAttribute('aria-hidden', 'true');
            label.className = 'sidebar-menu-label'; label.textContent = parts[2];
            link.replaceChildren(icon, label);
            link.setAttribute('aria-label', parts[2]);
        });
        const tooltip = document.createElement('div');
        tooltip.className = 'sidebar-shell-tooltip'; tooltip.id = 'sidebarMenuTooltip';
        tooltip.setAttribute('role', 'tooltip'); tooltip.hidden = true; body.append(tooltip);
        function hideTooltip() {
            tooltip.hidden = true;
            sidebar.querySelectorAll('[aria-describedby="sidebarMenuTooltip"]').forEach(link => link.removeAttribute('aria-describedby'));
        }
        function showTooltip(event) {
            const link = event.target.closest('.menu a');
            if (!link || mobile.matches || desktopOpen) return;
            hideTooltip();
            tooltip.textContent = link.getAttribute('aria-label'); tooltip.hidden = false;
            link.setAttribute('aria-describedby', tooltip.id);
            const rect = link.getBoundingClientRect();
            tooltip.style.left = (rect.right + 10) + 'px';
            tooltip.style.top = Math.max(8, Math.min(rect.top, innerHeight - tooltip.offsetHeight - 8)) + 'px';
        }
        sidebar.addEventListener('mouseover', showTooltip);
        sidebar.addEventListener('focusin', showTooltip);
        sidebar.addEventListener('mouseout', event => {
            const link = event.target.closest('.menu a');
            if (link && !link.contains(event.relatedTarget) && document.activeElement !== link) hideTooltip();
        });
        sidebar.addEventListener('focusout', hideTooltip);
        sidebar.addEventListener('scroll', () => {
            hideTooltip();
            if (sidebar.contains(document.activeElement)) showTooltip({ target: document.activeElement });
        });
        window.addEventListener('resize', hideTooltip);
        function render() {
            const drawer = mobile.matches, open = isOpen();
            // One toggle: desktop sidebar or the compact mobile navigation, never the page title.
            const toggleHost = drawer ? mobileNavigation : sidebar;
            if (toolbar.parentElement !== toggleHost) {
                toggleHost.prepend(toolbar);
            }
            hideTooltip();
            body.dataset.sidebarMode = drawer ? 'drawer' : 'desktop';
            body.dataset.sidebarOpen = String(open);
            const icon = drawer ? 'menu' : open ? 'panel-left-close' : 'panel-left-open';
            if (toggle.dataset.sidebarIcon !== icon) {
                toggle.dataset.sidebarIcon = icon;
                toggle.innerHTML = drawer
                    ? '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>'
                    : '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M12 12h6' + (open ? 'm-3-3-3 3 3 3' : 'm-3-3 3 3-3 3') + '"/></svg>';
            }
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', drawer ? (open ? 'Tutup menu navigasi' : 'Buka menu navigasi') : (open ? 'Perkecil sidebar' : 'Perluas sidebar'));
            sidebar.inert = drawer && !open;
            sidebar.setAttribute('aria-hidden', String(drawer && !open));
            sidebar.setAttribute('role', drawer ? 'dialog' : 'complementary');
            if (drawer && open) sidebar.setAttribute('aria-modal', 'true');
            else sidebar.removeAttribute('aria-modal');
            backdrop.hidden = !(drawer && open);
            content.inert = drawer && open;
            if (extraHeader) extraHeader.inert = drawer && open;
            document.documentElement.classList.toggle('sidebar-scroll-locked', drawer && open);
            body.classList.toggle('sidebar-drawer-open', drawer && open);
        }
        function setOpen(open, returnFocus = true) {
            if (mobile.matches) drawerOpen = open;
            else {
                desktopOpen = open;
                try { localStorage.setItem(preferenceKey, open ? 'open' : 'closed'); } catch { /* Navigation still works. */ }
            }
            render();
            if (mobile.matches && open) close.focus();
            else if (!open && returnFocus) toggle.focus();
        }
        toggle.addEventListener('click', () => setOpen(!isOpen()));
        close.addEventListener('click', () => setOpen(false));
        backdrop.addEventListener('click', () => setOpen(false));
        sidebar.addEventListener('click', event => {
            if (mobile.matches && event.target.closest('a[href]')) setOpen(false, false);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') hideTooltip();
            if (!mobile.matches || !drawerOpen) return;
            if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
            if (event.key !== 'Tab') return;
            const items = [...sidebar.querySelectorAll('a[href], button:not(:disabled)')].filter(node => node.getClientRects().length);
            const first = items[0], last = items.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        });
        mobile.addEventListener('change', () => {
            const hadFocus = sidebar.contains(document.activeElement);
            drawerOpen = false; render();
            if (hadFocus && !isOpen()) toggle.focus();
        });
        window.addEventListener('pageshow', () => { if (mobile.matches) drawerOpen = false; render(); });
        window.addEventListener('pagehide', () => {
            document.documentElement.classList.remove('sidebar-scroll-locked');
            content.inert = false;
        });
        render();
        requestAnimationFrame(() => requestAnimationFrame(() => body.classList.remove('sidebar-shell-initializing')));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();


