(function () {
    'use strict';
    const hero = document.getElementById('dashboardHero');
    if (!hero || hero.dataset.carouselReady === 'true') return;
    hero.dataset.carouselReady = 'true';
    const slides = [...hero.querySelectorAll('.hero-carousel-slide')];
    const dots = [...hero.querySelectorAll('[data-hero-dot]')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0, timer = null, hovered = false, keyboardFocused = false, pointer = null;
    let suppressClickUntil = 0, wheelDelta = 0, lastWheel = 0, wheelLatched = false, wheelCooldown = 0;
    function stop() { clearTimeout(timer); timer = null; }
    function schedule() {
        stop();
        if (!hovered && !keyboardFocused && !pointer && !motion.matches && !document.hidden) {
            timer = setTimeout(() => show(current + 1), 6000);
        }
    }
    function show(index) {
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => {
            const active = i === current;
            slide.classList.toggle('is-active', active);
            slide.inert = !active;
            slide.setAttribute('aria-hidden', String(!active));
            slide.querySelectorAll('a').forEach(link => { link.tabIndex = active ? 0 : -1; });
            dots[i].setAttribute('aria-current', String(active));
        });
        schedule();
    }
    hero.querySelector('[data-hero-prev]').addEventListener('click', () => show(current - 1));
    hero.querySelector('[data-hero-next]').addEventListener('click', () => show(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    function syncFocus() {
        keyboardFocused = hero.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
        schedule();
    }
    hero.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse') { hovered = true; stop(); }
    });
    hero.addEventListener('pointerleave', event => {
        if (event.pointerType === 'mouse') { hovered = false; syncFocus(); }
    });
    hero.addEventListener('focusin', syncFocus);
    hero.addEventListener('focusout', () => queueMicrotask(syncFocus));
    hero.addEventListener('keydown', syncFocus);

    // Native vertical scroll and pinch zoom remain available through touch-action.
    hero.addEventListener('pointerdown', event => {
        if (!['touch', 'pen'].includes(event.pointerType) || !event.isPrimary ||
            event.target.closest('a, button, input, select, textarea')) return;
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        stop();
        try { hero.setPointerCapture(event.pointerId); } catch { /* Synthetic events may have no native pointer. */ }
    });
    hero.addEventListener('pointermove', event => {
        if (!pointer || event.pointerId !== pointer.id) return;
        const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
            pointer = null;
            schedule();
        }
    });
    hero.addEventListener('pointerup', event => {
        if (!pointer || event.pointerId !== pointer.id) return;
        const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
        pointer = null;
        if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
            suppressClickUntil = performance.now() + 400;
            show(current + (dx < 0 ? 1 : -1));
        } else schedule();
    });
    function cancelPointer(event) {
        if (pointer && event.pointerId === pointer.id) { pointer = null; schedule(); }
    }
    hero.addEventListener('pointercancel', cancelPointer);
    hero.addEventListener('lostpointercapture', cancelPointer);
    hero.addEventListener('click', event => {
        if (event.detail !== 0 && performance.now() < suppressClickUntil) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, true);

    // Wheel delta describes content movement. A positive horizontal delta advances.
    // Latch the entire momentum burst, in addition to a short cooldown.
    hero.addEventListener('wheel', event => {
        if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) < 1 ||
            Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.3) return;
        if (event.cancelable) event.preventDefault();
        const now = performance.now();
        if (now - lastWheel > 200) {
            wheelDelta = 0;
            wheelLatched = now < wheelCooldown;
        }
        lastWheel = now;
        if (wheelLatched) return;
        const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? hero.clientWidth : 1;
        wheelDelta += event.deltaX * scale;
        if (Math.abs(wheelDelta) >= 60) {
            wheelLatched = true;
            wheelCooldown = now + 600;
            show(current + (wheelDelta > 0 ? 1 : -1));
            wheelDelta = 0;
        }
    }, { passive: false });
    motion.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', schedule);
    show(0);
})();
