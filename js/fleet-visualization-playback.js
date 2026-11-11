/* Playback scheduling only. Engines retain ownership of events and material. */
(function(root){
    'use strict';
    class Playback {
        constructor(engine){this.engine=engine;this.target=engine.time;}
        get pending(){return Math.max(0,this.target-this.engine.time);}
        enqueue(seconds){
            if(!Number.isFinite(seconds)||seconds<0)throw new Error('Waktu pemutaran tidak valid.');
            this.target+=seconds;
        }
        flush(now=()=>performance.now()){
            const start=now();let steps=0;
            // Small engine advances bound each work batch. Keep all unprocessed time.
            while(this.pending>0&&!this.engine.finished&&steps<250){
                if(steps&&now()-start>=8)break;
                const dt=Math.min(this.target,this.engine.time+.1)-this.engine.time;
                this.engine.advance(dt);steps++;
            }
            if(this.engine.finished)this.target=this.engine.time;
            return this.engine.snapshot();
        }
    }
    root.ExcabaseFleetPlayback=Playback;
    if(typeof module!=='undefined'&&module.exports)module.exports=Playback;
})(typeof window!=='undefined'?window:globalThis);
