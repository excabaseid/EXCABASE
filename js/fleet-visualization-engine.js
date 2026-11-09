/* Deterministic dig / haul model. All volumes are LCM; all times are working seconds.
   This module has no DOM, storage, timer, or rendering dependencies. */
(function (root) {
    'use strict';
    const EPS = 1e-8;
    function positive(value, label, max = Infinity) {
        if (!Number.isFinite(value) || value <= 0 || value > max) throw new Error(label + ' harus positif' + (max < Infinity ? ' dan ≤ ' + max : '') + '.');
    }
    function validate(config) {
        for (const key of ['volumeLCM', 'bucketCapacity', 'fillFactor', 'excavatorCycleSeconds', 'truckCapacity', 'loadedTravelSeconds', 'unloadSeconds', 'returnTravelSeconds', 'workingHours']) positive(config[key], key);
        positive(config.fillFactor, 'Bucket fill factor', 1.2);
        positive(config.excavatorEfficiency, 'Efisiensi Excavator', 1);
        positive(config.truckEfficiency, 'Efisiensi Dump Truck', 1);
        positive(config.workingHours, 'Jam kerja', 24);
        for (const key of ['excavatorCount', 'truckCount']) {
            positive(config[key], key, 2000);
            if (!Number.isInteger(config[key])) throw new Error('Jumlah unit harus bilangan bulat.');
        }
        // Each actor is retained, never silently truncated to a decorative sample.
        if (config.excavatorCount + config.truckCount > 2000) throw new Error('Versi pertama mendukung maksimal 2.000 unit gabungan. Kurangi konfigurasi skenario untuk visualisasi.');
        positive(config.excavatorCycleSeconds / config.excavatorEfficiency, 'Siklus efektif');
        for (const key of ['loadedTravelSeconds', 'unloadSeconds', 'returnTravelSeconds']) positive(config[key] / config.truckEfficiency, 'Durasi efektif');
        return { ...config };
    }
    class EventQueue {
        constructor() { this.items = []; this.order = 0; }
        push(time, type, id) {
            const event = { time, type, id, order: this.order++ }, a = this.items;
            a.push(event); let i = a.length - 1;
            while (i > 0) { const p = (i - 1) >> 1; if (!this.less(event, a[p])) break; a[i] = a[p]; i = p; }
            a[i] = event;
        }
        less(a, b) { return a.time < b.time || (a.time === b.time && a.order < b.order); }
        pop() {
            const a = this.items, first = a[0], last = a.pop();
            if (a.length) {
                let i = 0;
                while (2 * i + 1 < a.length) {
                    let child = 2 * i + 1;
                    if (child + 1 < a.length && this.less(a[child + 1], a[child])) child++;
                    if (!this.less(a[child], last)) break;
                    a[i] = a[child]; i = child;
                }
                a[i] = last;
            }
            return first;
        }
        peek() { return this.items[0]; }
    }
    class Engine {
        constructor(config) { this.config = Object.freeze(validate(config)); this.reset(); }
        reset() {
            const c = this.config;
            this.time = 0; this.extracted = 0; this.delivered = 0; this.finished = false;
            this.events = new EventQueue(); this.log = []; this.queue = [];
            this.excavators = Array.from({ length: c.excavatorCount }, (_, id) => ({ id, truckId: null, cycleStart: 0, cycleEnd: 0, scoops: 0 }));
            this.trucks = Array.from({ length: c.truckCount }, (_, id) => ({ id, state: 'queued', load: 0, excavatorId: null, start: 0, end: 0, trips: 0 }));
            this.trucks.forEach(t => this.queue.push(t.id));
            this.assign();
        }
        note(message) {
            this.log.push({ time: this.time, message });
            if (this.log.length > 30) this.log.shift();
        }
        assign() {
            if (this.config.volumeLCM - this.extracted <= EPS) {
                for (const id of this.queue) this.trucks[id].state = 'standby';
                this.queue = []; return;
            }
            for (const ex of this.excavators) {
                if (ex.truckId !== null || !this.queue.length) continue;
                const t = this.trucks[this.queue.shift()];
                ex.truckId = t.id; t.excavatorId = ex.id; t.state = 'loading';
                t.start = this.time; t.end = 0;
                this.nextScoop(ex);
            }
        }
        nextScoop(ex) {
            ex.cycleStart = this.time;
            ex.cycleEnd = this.time + this.config.excavatorCycleSeconds / this.config.excavatorEfficiency;
            this.events.push(ex.cycleEnd, 'scoop', ex.id);
        }
        travel(t, state, rawSeconds, eventType) {
            t.state = state; t.start = this.time;
            t.end = this.time + rawSeconds / this.config.truckEfficiency;
            this.events.push(t.end, eventType, t.id);
        }
        dispatch(ex) {
            const t = this.trucks[ex.truckId];
            ex.truckId = null; ex.cycleStart = ex.cycleEnd = this.time;
            if (t.load > EPS) {
                this.travel(t, 'hauling', this.config.loadedTravelSeconds, 'arrive');
                this.note('T' + (t.id + 1) + ' berangkat: ' + t.load.toFixed(2) + ' m³ LCM.');
            } else { t.state = 'standby'; t.excavatorId = null; }
            this.assign();
        }
        process(event) {
            const c = this.config;
            if (event.type === 'scoop') {
                const ex = this.excavators[event.id];
                if (ex.truckId === null) return;
                const t = this.trucks[ex.truckId];
                const amount = Math.max(0, Math.min(c.bucketCapacity * c.fillFactor, c.truckCapacity - t.load, c.volumeLCM - this.extracted));
                this.extracted = Math.min(c.volumeLCM, this.extracted + amount); t.load += amount; ex.scoops++;
                if (t.load >= c.truckCapacity - EPS || this.extracted >= c.volumeLCM - EPS) this.dispatch(ex);
                else this.nextScoop(ex);
            } else {
                const t = this.trucks[event.id];
                if (event.type === 'arrive') this.travel(t, 'unloading', c.unloadSeconds, 'unload');
                if (event.type === 'unload') {
                    this.delivered = Math.min(c.volumeLCM, this.delivered + t.load);
                    this.note('T' + (t.id + 1) + ' membongkar ' + t.load.toFixed(2) + ' m³ LCM.');
                    t.load = 0; t.trips++;
                    this.travel(t, 'returning', c.returnTravelSeconds, 'return');
                }
                if (event.type === 'return') {
                    t.excavatorId = null; t.state = 'queued'; t.start = t.end = this.time;
                    this.queue.push(t.id); this.assign();
                }
            }
            // The final return is included; 100% delivered may precede fleet completion.
            this.finished = this.delivered >= c.volumeLCM - EPS && this.trucks.every(t => t.state === 'standby' || t.state === 'queued');
        }
        advance(seconds) {
            if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Langkah waktu harus nol atau positif.');
            if (this.finished || seconds === 0) return this.snapshot();
            const target = this.time + seconds;
            if (!Number.isFinite(target)) throw new Error('Waktu simulasi terlalu besar.');
            while (this.events.peek() && this.events.peek().time <= target && !this.finished) {
                const event = this.events.pop(); this.time = event.time; this.process(event);
            }
            if (!this.finished) this.time = target;
            return this.snapshot();
        }
        snapshot() {
            const counts = { loading: 0, hauling: 0, unloading: 0, returning: 0, queued: 0, standby: 0 };
            this.trucks.forEach(t => counts[t.state]++);
            return { time: this.time, total: this.config.volumeLCM, extracted: this.extracted, delivered: this.delivered,
                inTransit: Math.max(0, this.extracted - this.delivered), remaining: Math.max(0, this.config.volumeLCM - this.delivered),
                progress: Math.min(100, this.delivered / this.config.volumeLCM * 100), finished: this.finished, counts };
        }
    }
    root.ExcabaseFleetEngine = { Engine, validate, EventQueue };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.ExcabaseFleetEngine;
})(typeof window !== 'undefined' ? window : globalThis);
