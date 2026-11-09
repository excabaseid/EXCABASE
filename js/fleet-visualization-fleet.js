/* One clock, independent activities. The selected loading source owns the truck fleet. */
(function(root){
    'use strict';
    const api=root.ExcabaseFleetEngine;
    const definitions={bulldozer:['BulldozerEngine','validateBulldozer','dozer'],wheelLoader:['WheelLoaderEngine','validateLoader','loader'],grader:['GraderEngine','validateGrader','grader'],compactor:['CompactorEngine','validateCompactor','compactor']};
    function validateFleet(c){
        if(c.haulingSource!=null&&!['excavator','wheelloader'].includes(c.haulingSource))throw new Error('Sumber pemuat tidak dikenal.');
        if(c.haulingEnabled!==false&&c.haulingSource!=='wheelloader')api.validate(c);
        for(const key of ['excavatorCount','truckCount'])if(!Number.isInteger(c[key])||c[key]<0)throw new Error('Jumlah alat tidak valid.');
        if(!(c.workingHours>0&&c.workingHours<=24))throw new Error('Jam kerja harus positif dan maksimal 24.');
        let count=c.excavatorCount+c.truckCount,active=c.haulingEnabled!==false;
        const copy={...c};
        for(const [key,[,validate]]of Object.entries(definitions))if(c[key]){copy[key]=api[validate](c[key]);count+=c[key].count;active=true;}
        if(c.haulingSource==='wheelloader'&&(!c.wheelLoader||c.wheelLoader.truckCount!==c.truckCount||!c.truckCount||c.volumeLCM!==c.wheelLoader.volumeLCM))throw new Error('Pemuat Wheel Loader dan armada truk tidak cocok.');
        if(c.wheelLoader?.truckCount&&c.haulingSource!=='wheelloader')throw new Error('Truk Wheel Loader membutuhkan sumber pemuat Wheel Loader yang dipilih.');
        if(!active)throw new Error('Belum ada aktivitas operasional yang dapat dijalankan.');
        if(count>2000)throw new Error('Maksimal 2.000 unit gabungan tanpa mengurangi skenario.');
        return copy;
    }
    class FleetEngine{
        constructor(config){
            const c=validateFleet(config);for(const key of Object.keys(definitions))if(c[key])Object.freeze(c[key]);this.config=Object.freeze(c);
            for(const [key,[model,,property]]of Object.entries(definitions))this[property]=c[key]?new api[model](c[key]):null;
            this.hauling=c.haulingEnabled===false?null:c.haulingSource==='wheelloader'?this.loader:new api.Engine(c);
            this.children=[...new Set([this.hauling,...Object.values(definitions).map(([, ,p])=>this[p])].filter(Boolean))];this.reset();
        }
        reset(){this.children.forEach(child=>child.reset());this.time=0;this.parkedTrucks=Array.from({length:this.config.truckCount},(_,id)=>({id,state:'standby',load:0}));this.idleExcavators=Array.from({length:this.config.excavatorCount},(_,id)=>({id,truckId:null}));}
        get trucks(){return this.hauling?.trucks||this.parkedTrucks;}
        get excavators(){return this.hauling?.excavators||this.idleExcavators;}
        get bulldozers(){return this.dozer?.units||[];}
        get wheelLoaders(){return this.loader?.units||[];}
        get delivered(){return this.hauling?.delivered||0;}
        get extracted(){return this.hauling?.extracted||0;}
        get finished(){return this.children.every(child=>child.finished);}
        get log(){return this.children.flatMap(child=>child.log||[]).sort((a,b)=>a.time-b.time).slice(-30);}
        advance(seconds){
            if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(this.time+seconds))throw new Error('Langkah waktu armada tidak valid.');
            if(!this.finished){this.children.forEach(child=>child.advance(seconds));this.time=this.finished?Math.max(...this.children.map(child=>child.time)):this.time+seconds;}
            return this.snapshot();
        }
        snapshot(){
            const hauling=this.hauling?.snapshot()||{total:0,extracted:0,delivered:0,inTransit:0,remaining:0,progress:0,counts:{loading:0,hauling:0,unloading:0,returning:0,queued:0,standby:this.config.truckCount}};
            return {...hauling,time:this.time,finished:this.finished,haulingEnabled:!!this.hauling,haulingFinished:this.hauling?.finished||false,bulldozer:this.dozer?.snapshot()||null,loader:this.loader?.snapshot()||null,grader:this.grader?.snapshot()||null,compactor:this.compactor?.snapshot()||null};
        }
    }
    Object.assign(api,{FleetEngine,validateFleet});
})(typeof window!=='undefined'?window:globalThis);
