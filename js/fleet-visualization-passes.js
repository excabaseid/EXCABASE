/* Shared lane scheduler. Area is credited only after every required pass over a patch.
   Q already includes passes/efficiency; neither is applied a second time to finished-area rate. */
(function(root){
    'use strict';
    const api=root.ExcabaseFleetEngine;
    function validatePassActivity(c){
        for(const key of ['area','hourlyArea','width','length'])if(!Number.isFinite(c[key])||c[key]<=0)throw new Error('Pekerjaan lintasan: '+key+' harus positif.');
        if(!Number.isInteger(c.count)||c.count<1||c.count>2000)throw new Error('Jumlah alat lintasan harus 1–2.000 unit.');
        if(!Number.isInteger(c.passes)||c.passes<1||c.passes>1000)throw new Error('Jumlah lintasan harus bilangan bulat 1–1.000.');
        if(c.volume!=null&&(!(c.thickness>0)||!Number.isFinite(c.volume)||c.volume<=0||!['bcm','lcm','ccm'].includes(c.basis)))throw new Error('Volume/lapisan pekerjaan lintasan tidak valid.');
        if(c.volume==null&&c.basis!=='m2')throw new Error('Pekerjaan berbasis luas wajib memakai m2.');
        if(!Number.isFinite(c.area*c.passes)||!Number.isFinite(c.width*c.length))throw new Error('Luas/lintasan terlalu besar.');
        if(c.volume!=null&&Math.abs(c.area*c.thickness-c.volume)>1e-8*Math.max(1,c.volume))throw new Error('Luas × tebal harus sama dengan volume aktivitas.');
        return {...c};
    }
    class PassActivityEngine{
        constructor(config){this.config=Object.freeze(validatePassActivity(config));this.reset();}
        reset(){
            this.time=0;this.assigned=0;this.completedArea=0;this.passArea=0;this.completedPasses=0;this.finished=false;this.log=[];this.events=new api.EventQueue();
            this.units=Array.from({length:this.config.count},(_,id)=>({id,state:'standby',area:0,patchPasses:0,passes:0,start:0,end:0}));
            this.units.forEach(u=>this.nextPatch(u));
        }
        phase(u,state,fraction){
            u.state=state;u.start=this.time;u.end=u.passStart+u.passSeconds*fraction;
            if(!Number.isFinite(u.end)||u.end<=this.time)throw new Error('Durasi lintasan terlalu kecil atau tidak valid.');
            this.events.push(u.end,state,u.id);
        }
        nextPatch(u){
            const c=this.config,remaining=Math.max(0,c.area-this.assigned);
            if(!remaining){u.state='standby';return;}
            const patch=c.width*c.length;
            u.area=remaining<=patch+1e-10*Math.max(1,c.area)?remaining:patch;u.patchPasses=0;
            if(!(u.area>0)||this.assigned+u.area===this.assigned)throw new Error('Luas lajur terlalu kecil untuk target.');
            this.assigned=Math.min(c.area,this.assigned+u.area);u.passSeconds=u.area/c.hourlyArea*3600/c.passes;this.startPass(u);
        }
        startPass(u){u.passStart=this.time;this.phase(u,'entering',.1);}
        process(event){
            const u=this.units[event.id],c=this.config;
            if(event.type==='entering')this.phase(u,'working',.9);
            else if(event.type==='working'){
                u.patchPasses++;u.passes++;this.completedPasses++;this.passArea=Math.min(c.area*c.passes,this.passArea+u.area);
                if(u.patchPasses===c.passes)this.completedArea=Math.min(c.area,this.completedArea+u.area);
                this.phase(u,'turning',1);
            }else if(u.patchPasses<c.passes)this.startPass(u);else this.nextPatch(u);
            this.finished=this.assigned>=c.area&&this.units.every(unit=>unit.state==='standby');
            if(this.finished){this.completedArea=c.area;this.passArea=c.area*c.passes;}
        }
        advance(seconds){
            if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(this.time+seconds))throw new Error('Langkah waktu lintasan tidak valid.');
            if(this.finished)return this.snapshot();const target=this.time+seconds;
            while(this.events.peek()&&this.events.peek().time<=target&&!this.finished){const e=this.events.pop();this.time=e.time;this.process(e);}
            if(!this.finished)this.time=target;return this.snapshot();
        }
        snapshot(){
            const c=this.config,counts={entering:0,working:0,turning:0,standby:0};this.units.forEach(u=>counts[u.state]++);
            return {time:this.time,totalArea:c.area,hourlyArea:c.hourlyArea,completedArea:this.completedArea,remainingArea:Math.max(0,c.area-this.completedArea),
                passArea:this.passArea,completedPasses:this.completedPasses,requiredPasses:c.passes,passProgress:Math.min(100,this.passArea/(c.area*c.passes)*100),
                volumeCompleted:c.volume==null?null:Math.min(c.volume,this.completedArea*c.thickness),basis:c.basis,
                progress:Math.min(100,this.completedArea/c.area*100),finished:this.finished,counts};
        }
    }
    Object.assign(api,{PassActivityEngine,validatePassActivity});
})(typeof window!=='undefined'?window:globalThis);
