/* Independent push-earth activity. Scenario Q is already effective: never apply efficiency twice.
   Coordinates and phase shares are illustrative; this module contains no rendering or storage. */
(function (root) {
    'use strict';
    const api = root.ExcabaseFleetEngine;
    function validateBulldozer(c) {
        for (const key of ['volume', 'hourlyPerUnit', 'cycleSeconds']) {
            if (!Number.isFinite(c[key]) || c[key] <= 0) throw new Error('Bulldozer: ' + key + ' harus positif.');
        }
        if (!Number.isInteger(c.count) || c.count < 1 || c.count > 2000) throw new Error('Jumlah Bulldozer harus bilangan bulat 1–2.000.');
        if (!['lcm', 'bcm', 'ccm'].includes(c.basis)) throw new Error('Basis volume Bulldozer belum valid.');
        const shares = ['approachShare', 'pushShare', 'returnShare'].map(key => c[key]);
        if (shares.some(v => !Number.isFinite(v) || v <= 0) || shares.reduce((a,b) => a+b,0) >= 100) throw new Error('Pembagian maju, dorong, dan mundur Bulldozer harus positif dengan total di bawah 100%; sisanya untuk jeda.');
        if (!Number.isFinite(c.hourlyPerUnit * c.cycleSeconds / 3600) || c.hourlyPerUnit * c.cycleSeconds / 3600 <= 0) throw new Error('Volume per siklus Bulldozer tidak valid.');
        return { ...c };
    }
    class BulldozerEngine {
        constructor(config) { this.config = Object.freeze(validateBulldozer(config)); this.reset(); }
        reset() {
            this.time = 0; this.assigned = 0; this.pushed = 0; this.finished = false; this.log = [];
            this.events = new api.EventQueue();
            this.units = Array.from({length:this.config.count},(_,id) => ({id,state:'standby',load:0,start:0,end:0,cycles:0}));
            this.units.forEach(unit => this.startCycle(unit));
        }
        phase(unit, state, endFraction) {
            unit.state=state; unit.start=this.time; unit.end=unit.cycleStart+this.config.cycleSeconds*endFraction;
            if(!Number.isFinite(unit.end)||unit.end<=this.time)throw new Error('Durasi fase Bulldozer terlalu kecil atau waktu terlalu besar. Periksa asumsi siklus.');
            this.events.push(unit.end,state,unit.id);
        }
        startCycle(unit) {
            const c=this.config, remaining=Math.max(0,c.volume-this.assigned);
            if (remaining===0) { unit.state='standby'; unit.load=0; return; }
            unit.load=Math.min(remaining,c.hourlyPerUnit*c.cycleSeconds/3600);
            this.assigned=Math.min(c.volume,this.assigned+unit.load);
            unit.cycleStart=this.time;
            this.phase(unit,'approaching',c.approachShare/100);
        }
        process(event) {
            const u=this.units[event.id],c=this.config;
            if(event.type==='approaching') this.phase(u,'pushing',(c.approachShare+c.pushShare)/100);
            else if(event.type==='pushing') {
                this.pushed=Math.min(c.volume,this.pushed+u.load);
                this.log.push({time:this.time,message:'B'+(u.id+1)+' selesai mendorong '+u.load.toFixed(2)+' m³ '+c.basis.toUpperCase()+'.'});
                if(this.log.length>30)this.log.shift();
                u.load=0;
                this.phase(u,'returning',(c.approachShare+c.pushShare+c.returnShare)/100);
            } else if(event.type==='returning') this.phase(u,'waiting',1);
            else { u.cycles++; this.startCycle(u); }
            this.finished=this.assigned>=c.volume && this.units.every(unit=>unit.state==='standby');
            if(this.finished) this.pushed=c.volume;
        }
        advance(seconds) {
            if(!Number.isFinite(seconds)||seconds<0)throw new Error('Langkah waktu Bulldozer harus nol atau positif.');
            if(this.finished||seconds===0)return this.snapshot();
            const target=this.time+seconds;
            if(!Number.isFinite(target))throw new Error('Waktu Bulldozer terlalu besar.');
            while(this.events.peek()&&this.events.peek().time<=target&&!this.finished){const event=this.events.pop();this.time=event.time;this.process(event);}
            if(!this.finished)this.time=target;
            return this.snapshot();
        }
        snapshot() {
            const counts={approaching:0,pushing:0,returning:0,waiting:0,standby:0};
            this.units.forEach(u=>counts[u.state]++);
            return {time:this.time,total:this.config.volume,basis:this.config.basis,pushed:this.pushed,
                inProgress:Math.max(0,this.assigned-this.pushed),remaining:Math.max(0,this.config.volume-this.pushed),
                progress:Math.min(100,this.pushed/this.config.volume*100),finished:this.finished,counts};
        }
    }
    Object.assign(api,{BulldozerEngine,validateBulldozer});
})(typeof window!=='undefined'?window:globalThis);
