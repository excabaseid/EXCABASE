/* Loader buckets are conserved from stockpile to truck/short-haul destination.
   Effective Q controls cycle payload. Phase fractions describe animation, not surveyed geometry. */
(function(root){
    'use strict';
    const api=root.ExcabaseFleetEngine;
    function validateLoader(c){
        for(const key of ['count','volumeLCM','hourlyPerUnit','cycleSeconds'])if(!Number.isFinite(c[key])||c[key]<=0)throw new Error('Wheel Loader: '+key+' harus positif.');
        if(!Number.isInteger(c.count)||c.count>2000)throw new Error('Jumlah Wheel Loader harus bilangan bulat 1–2.000.');
        if(!Number.isFinite(c.hourlyPerUnit*c.cycleSeconds/3600)||c.hourlyPerUnit*c.cycleSeconds/3600<=0)throw new Error('Payload siklus Wheel Loader tidak valid.');
        const trucks=c.truckCount??0;
        if(!Number.isInteger(trucks)||trucks<0||trucks>2000)throw new Error('Jumlah truk Loader tidak valid.');
        if(trucks){
            for(const key of ['truckCapacity','loadedTravelSeconds','unloadSeconds','returnTravelSeconds','truckEfficiency'])if(!Number.isFinite(c[key])||c[key]<=0)throw new Error('Loading/hauling: '+key+' harus positif.');
            if(c.truckEfficiency>1)throw new Error('Efisiensi truk maksimal 1.');
        }
        return {...c,truckCount:trucks};
    }
    class WheelLoaderEngine{
        constructor(config){this.config=Object.freeze(validateLoader(config));this.reset();}
        reset(){
            const c=this.config;
            this.time=0;this.assigned=0;this.extracted=0;this.loaded=0;this.delivered=0;this.finished=false;this.log=[];
            this.events=new api.EventQueue();this.queue=[];
            this.units=Array.from({length:c.count},(_,id)=>({id,state:'standby',load:0,reserved:0,truckId:null,start:0,end:0,cycles:0}));
            this.trucks=Array.from({length:c.truckCount||0},(_,id)=>({id,state:'queued',load:0,loaderId:null,start:0,end:0,trips:0}));
            this.trucks.forEach(t=>this.queue.push(t.id));this.assign();
        }
        phase(u,state,fraction){
            u.state=state;u.start=this.time;u.end=u.cycleStart+this.config.cycleSeconds*fraction;
            if(!Number.isFinite(u.end)||u.end<=this.time)throw new Error('Durasi fase Wheel Loader tidak valid.');
            this.events.push(u.end,state,u.id);
        }
        travel(t,state,seconds,event){t.state=state;t.start=this.time;t.end=this.time+seconds/this.config.truckEfficiency;this.events.push(t.end,event,t.id);}
        dispatch(u){
            const t=this.trucks[u.truckId];u.truckId=null;
            if(t.load>0)this.travel(t,'hauling',this.config.loadedTravelSeconds,'arrive');else{t.state='standby';t.loaderId=null;}
        }
        assign(){
            const c=this.config;
            for(const u of this.units){
                if(u.state!=='standby')continue;
                const remaining=Math.max(0,c.volumeLCM-this.assigned);
                if(!remaining){if(u.truckId!==null)this.dispatch(u);continue;}
                if(this.trucks.length&&u.truckId===null){
                    if(!this.queue.length)continue;
                    const t=this.trucks[this.queue.shift()];u.truckId=t.id;t.loaderId=u.id;t.state='loading';
                }
                const room=u.truckId===null?Infinity:c.truckCapacity-this.trucks[u.truckId].load;
                u.reserved=Math.min(remaining,room,c.hourlyPerUnit*c.cycleSeconds/3600);
                if(!(u.reserved>0)||this.assigned+u.reserved===this.assigned)throw new Error('Payload Wheel Loader terlalu kecil untuk target.');
                this.assigned=Math.min(c.volumeLCM,this.assigned+u.reserved);u.cycleStart=this.time;
                this.phase(u,'approaching',.1);
            }
            if(this.assigned>=c.volumeLCM){for(const id of this.queue)this.trucks[id].state='standby';this.queue=[];}
        }
        process(event){
            const c=this.config;
            if(['arrive','unload','return'].includes(event.type)){
                const t=this.trucks[event.id];
                if(event.type==='arrive')this.travel(t,'unloading',c.unloadSeconds,'unload');
                else if(event.type==='unload'){this.delivered=Math.min(c.volumeLCM,this.delivered+t.load);t.load=0;t.trips++;this.travel(t,'returning',c.returnTravelSeconds,'return');}
                else{t.state='queued';t.loaderId=null;this.queue.push(t.id);this.assign();}
            }else{
                const u=this.units[event.id];
                if(event.type==='approaching')this.phase(u,'scooping',.25);
                else if(event.type==='scooping'){
                    u.load=u.reserved;u.reserved=0;this.extracted=Math.min(c.volumeLCM,this.extracted+u.load);this.phase(u,'lifting',.35);
                }else if(event.type==='lifting')this.phase(u,'carrying',.55);
                else if(event.type==='carrying')this.phase(u,'dumping',.65);
                else if(event.type==='dumping'){
                    this.loaded=Math.min(c.volumeLCM,this.loaded+u.load);
                    if(u.truckId!==null){
                        const t=this.trucks[u.truckId];t.load=Math.min(c.truckCapacity,t.load+u.load);
                        if(t.load>=c.truckCapacity-1e-9||this.assigned>=c.volumeLCM)this.dispatch(u);
                    }else this.delivered=Math.min(c.volumeLCM,this.delivered+u.load);
                    this.log.push({time:this.time,message:'L'+(u.id+1)+' menumpahkan '+u.load.toFixed(2)+' m³ LCM '+(this.trucks.length?'ke truk.':'ke area pemindahan pendek.')});
                    if(this.log.length>30)this.log.shift();u.load=0;this.phase(u,'returning',1);
                }else{u.cycles++;u.state='standby';this.assign();}
            }
            this.finished=this.assigned>=c.volumeLCM&&this.units.every(u=>u.state==='standby')&&this.trucks.every(t=>['standby','queued'].includes(t.state));
            if(this.finished){this.extracted=c.volumeLCM;this.loaded=c.volumeLCM;this.delivered=c.volumeLCM;}
        }
        advance(seconds){
            if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(this.time+seconds))throw new Error('Langkah waktu Wheel Loader tidak valid.');
            if(this.finished)return this.snapshot();const target=this.time+seconds;
            while(this.events.peek()&&this.events.peek().time<=target&&!this.finished){const e=this.events.pop();this.time=e.time;this.process(e);}
            if(!this.finished)this.time=target;return this.snapshot();
        }
        snapshot(){
            const counts={loading:0,hauling:0,unloading:0,returning:0,queued:0,standby:0},phases={};
            this.trucks.forEach(t=>counts[t.state]++);this.units.forEach(u=>phases[u.state]=(phases[u.state]||0)+1);
            return {time:this.time,total:this.config.volumeLCM,extracted:this.extracted,delivered:this.delivered,inTransit:Math.max(0,this.extracted-this.delivered),remaining:Math.max(0,this.config.volumeLCM-this.delivered),progress:Math.min(100,this.delivered/this.config.volumeLCM*100),finished:this.finished,counts,
                completed:this.loaded,loadingProgress:Math.min(100,this.loaded/this.config.volumeLCM*100),phases,bucketLoad:this.units.reduce((sum,u)=>sum+u.load,0),passes:0};
        }
    }
    Object.assign(api,{WheelLoaderEngine,validateLoader});
})(typeof window!=='undefined'?window:globalThis);
