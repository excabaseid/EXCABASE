/* Canvas 2D isometric renderer. Reads engine state; never advances time or moves material. */
(function (root) {
    'use strict';
    const clamp = v => Math.max(0, Math.min(1, v));
    class Renderer {
        constructor(canvas) {
            this.canvas = canvas; this.ctx = canvas.getContext('2d');
            this.background = document.createElement('canvas'); this.model = null;
        }
        setContext(context) {
            this.model = context;
            const cols = Math.max(1, Math.min(8, Math.ceil(Math.sqrt(context.excavatorCount))));
            this.hasHauling = context.haulingEnabled !== false;
            this.bayCols = cols; this.bayRows = Math.ceil(context.excavatorCount / cols);
            this.queueCols = Math.max(5, Math.ceil(Math.sqrt(context.truckCount * 1.6)));
            this.queueRows = Math.ceil(context.truckCount / this.queueCols);
            this.disposalX = Math.max(cols * 3.7 + 24, this.queueCols * 1.75 + 10);
            this.disposalY = 5 + this.bayRows * 1.8;
            this.worldW = this.disposalX + 7;
            this.worldH = Math.max(this.bayRows * 3.8 + 9 + this.queueRows * 1.6, this.disposalY + 12);
            const dozerCount=context.bulldozerCount||0;
            this.dozerCols=Math.max(1,Math.min(4,Math.ceil(Math.sqrt(dozerCount))));
            this.dozerRows=Math.ceil(dozerCount/this.dozerCols);
            this.dozerY=this.hasHauling?this.worldH+4:Math.max(5,context.excavatorCount?this.bayRows*3.8+8:0,context.truckCount?this.queueRows*1.6+7:0);
            if(!this.hasHauling){this.worldW=Math.max(18,this.queueCols*1.75+8,cols*3.7+6);this.worldH=this.dozerY;}
            if(dozerCount){this.worldW=Math.max(this.worldW,this.dozerCols*12+5);this.worldH=this.dozerY+this.dozerRows*5.5+3;}
            this.hub = { x: cols * 3.7 + 6, y: 4 + this.bayRows * 1.8 };
            this.resize();
        }
        bay(id) { return { x: 4 + id % this.bayCols * 3.7, y: 4 + Math.floor(id / this.bayCols) * 3.8 }; }
        parking(id) { return { x: 3 + id % this.queueCols * 1.75, y: (this.hasHauling?this.bayRows*3.8+8:this.bayRows*3.8+2) + Math.floor(id / this.queueCols) * 1.6 }; }
        dozerLane(id) { return {x:3+id%this.dozerCols*12,y:this.dozerY+Math.floor(id/this.dozerCols)*5.5}; }
        loading(id) { const b = this.bay(id); return { x: b.x + 1.8, y: b.y + 1.1 }; }
        iso(x, y, z = 0) { return { x: this.ox + (x - y) * this.scale, y: this.oy + (x + y) * this.scale * .5 - z * this.scale }; }
        resize() {
            if (!this.ctx || !this.model) return;
            const rect = this.canvas.getBoundingClientRect();
            this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
            this.dpr = Math.min(root.devicePixelRatio || 1, this.model.excavatorCount + this.model.truckCount + (this.model.bulldozerCount||0) > 120 ? 1 : 2);
            for (const c of [this.canvas, this.background]) { c.width = Math.round(this.width * this.dpr); c.height = Math.round(this.height * this.dpr); }
            this.scale = Math.min((this.width - 32) / (this.worldW + this.worldH), (this.height - 54) / ((this.worldW + this.worldH) * .5 + 4));
            this.ox = (this.width - (this.worldW - this.worldH) * this.scale) / 2;
            this.oy = Math.max(28, (this.height - (this.worldW + this.worldH) * .5 * this.scale) / 2);
            const main = this.ctx; this.ctx = this.background.getContext('2d');
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this.environment(); this.ctx = main;
        }
        polygon(points, fill, stroke) {
            const ctx = this.ctx; ctx.beginPath();
            points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
            ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
            if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .65; ctx.stroke(); }
        }
        ground(points, fill, z = 0) { this.polygon(points.map(p => this.iso(p[0], p[1], z)), fill); }
        box(x, y, w, d, h, color, angle = 0, z = 0) {
            const co = Math.cos(angle), si = Math.sin(angle);
            const pts = [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b]) => ({ x: x + a * co - b * si, y: y + a * si + b * co }));
            const sides = pts.map((p, i) => ({ a: p, b: pts[(i + 1) % 4], i })).sort((a,b) => (a.a.x+a.a.y+a.b.x+a.b.y)-(b.a.x+b.a.y+b.b.x+b.b.y));
            for (const s of sides) this.polygon([this.iso(s.a.x,s.a.y,z),this.iso(s.b.x,s.b.y,z),this.iso(s.b.x,s.b.y,z+h),this.iso(s.a.x,s.a.y,z+h)], s.i % 2 ? color[1] : color[2]);
            this.polygon(pts.map(p => this.iso(p.x,p.y,z+h)), color[0], 'rgba(16,42,67,.16)');
        }
        label(text, x, y, z = 0, color = '#40556b', size = 10) {
            const p = this.iso(x,y,z), ctx = this.ctx;
            ctx.font = '700 ' + size + 'px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = color;
            ctx.fillText(text,p.x,p.y);
        }
        road(points, width, color) {
            const ctx = this.ctx;ctx.beginPath();
            points.forEach((p,i) => {const q=this.iso(p.x,p.y,.025);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});
            ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,width*this.scale);ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
        }
        environment() {
            const ctx = this.ctx;
            const sky=ctx.createLinearGradient(0,0,0,this.height);sky.addColorStop(0,'#edf4f8');sky.addColorStop(1,'#dce6ec');
            ctx.fillStyle=sky;ctx.fillRect(0,0,this.width,this.height);
            this.box(this.worldW/2,this.worldH/2,this.worldW,this.worldH,.85,['#d9c5a6','#a88c65','#bea37b'],0,-.85);
            const step=Math.max(3,Math.ceil(Math.max(this.worldW,this.worldH)/16));
            for(let x=0;x<this.worldW;x+=step)for(let y=0;y<this.worldH;y+=step){
                if((Math.floor(x/step)+Math.floor(y/step))%2)this.ground([[x,y],[Math.min(x+step,this.worldW),y],[Math.min(x+step,this.worldW),Math.min(y+step,this.worldH)],[x,Math.min(y+step,this.worldH)]],'rgba(255,255,255,.045)');
            }
            if(this.hasHauling){
            this.road([this.hub,{x:this.disposalX-6,y:this.hub.y},{x:this.disposalX,y:this.disposalY}],2.4,'#a6957e');
            this.road([{x:this.disposalX,y:this.disposalY},{x:this.disposalX-7,y:this.disposalY+6},{x:this.hub.x+1,y:this.hub.y+5},{x:this.hub.x-2,y:this.worldH-3}],2.1,'#b2a188');
            this.road([this.hub,{x:this.disposalX-6,y:this.hub.y},{x:this.disposalX,y:this.disposalY}],.06,'#e9d6ae');
            }
            for(let i=0;i<this.model.excavatorCount;i++){
                const b=this.bay(i);this.ground([[b.x-2,b.y-1.3],[b.x-.8,b.y-1.3],[b.x-.8,b.y+1],[b.x-2,b.y+1]],'#94714d');
                this.ground([[b.x-1.8,b.y-1.1],[b.x-1,b.y-1.1],[b.x-1,b.y+.8],[b.x-1.8,b.y+.8]],'#775a40');
            }
            if(this.hasHauling)this.ground([[this.disposalX-3,this.disposalY-3],[this.disposalX+4,this.disposalY-3],[this.disposalX+4,this.disposalY+3],[this.disposalX-3,this.disposalY+3]],'#c7ad87');
            for(let id=0;id<(this.model.bulldozerCount||0);id++){
                const p=this.dozerLane(id);
                this.ground([[p.x-1.5,p.y-1.5],[p.x+10,p.y-1.5],[p.x+10,p.y+1.5],[p.x-1.5,p.y+1.5]],'#bda584');
                this.road([{x:p.x,y:p.y-.7},{x:p.x+8,y:p.y-.7}],.08,'#8b775e');
                this.road([{x:p.x,y:p.y+.7},{x:p.x+8,y:p.y+.7}],.08,'#8b775e');
            }
            // Boundary stakes give a scale cue without texture assets or animation.
            for(let x=2;x<this.worldW-2;x+=Math.max(4,this.worldW/10))this.box(x,1,.12,.12,.6,['#fff4cf','#b09860','#ded1a5']);
            if(this.hasHauling){
                this.label(this.width<450?'GALIAN':'GALIAN / PEMUATAN',4,-1.2,0,'#624a31',Math.max(8,Math.min(11,this.width/65)));
                this.label('DISPOSAL',this.disposalX,this.disposalY-4,0,'#624a31',Math.max(8,Math.min(11,this.width/65)));
            }
            if(this.model.bulldozerCount)this.label('AREA DORONG · PEKERJAAN TERPISAH',this.dozerCols*6,this.dozerY-2,0,'#624a31',Math.max(8,Math.min(11,this.width/65)));
            if(this.model.truckCount)this.label(this.hasHauling?'ANTREAN ARMADA':'TRUK SIAGA · TANPA PEMUAT',Math.min(this.queueCols,8),this.parking(this.model.truckCount-1).y+2,0,'#624a31',9);
        }
        dozerPosition(unit,time) {
            const lane=this.dozerLane(unit.id),f=clamp((time-unit.start)/(unit.end-unit.start)||0);
            const offset=unit.state==='approaching'?2*f:unit.state==='pushing'?2+5*f:unit.state==='returning'?7*(1-f):0;
            return {x:lane.x+offset,y:lane.y};
        }
        bulldozer(unit,time,p) {
            const moving=['approaching','pushing','returning'].includes(unit.state);
            for(const side of [-.65,.65]){
                this.box(p.x,p.y+side,2.4,.46,.43,['#53616c','#243445','#384957'],0,.08);
                for(const x of [-.85,-.3,.3,.85]){
                    const q=this.iso(p.x+x,p.y+side,.31),ctx=this.ctx;
                    ctx.beginPath();ctx.ellipse(q.x,q.y,Math.max(.6,this.scale*.17),Math.max(.7,this.scale*.2),0,0,Math.PI*2);ctx.fillStyle='#91a0ab';ctx.fill();
                }
                if(moving){const shift=(time*3%1)*.3;this.box(p.x-.8+shift,p.y+side,.1,.48,.04,['#d6dce0','#53616c','#8e9ca7'],0,.51);}
            }
            this.box(p.x+.1,p.y,1.95,1.18,.65,['#f9c536','#b38a19','#d5a622'],0,.48);
            this.box(p.x-.38,p.y,.9,1.04,.85,['#c5e2ec','#25485f','#4e748a'],0,1.02);
            this.box(p.x-.38,p.y,1.08,1.18,.14,['#fce197','#b58d20','#d5ac38'],0,1.87);
            this.box(p.x+.92,p.y,1.1,.17,.15,['#8599a7','#435e70','#657b8a'],0,.5);
            const raised=(unit.state==='returning'||unit.state==='standby') ? .3 : 0;
            this.box(p.x+1.58,p.y,.28,2.05,.8,['#edf1f4','#708796','#b6c3cc'],0,.13+raised);
            if(unit.state==='pushing'&&unit.load>0)this.box(p.x+2.05,p.y,.65,1.65,.5,['#bd9868','#795b38','#9b7549'],0,.02);
            if(this.scale>=5)this.label('B'+(unit.id+1),p.x,p.y,2.25,'#102a43',Math.max(7,Math.min(10,this.scale*.75)));
        }
        route(t) {
            const start=this.loading(t.excavatorId ?? 0), end={x:this.disposalX,y:this.disposalY};
            return t.state==='returning' ? [end,{x:this.disposalX-7,y:this.disposalY+6},{x:this.hub.x+1,y:this.hub.y+5},this.parking(t.id)]
                : [start,this.hub,{x:this.disposalX-6,y:this.hub.y},end];
        }
        position(t,time) {
            if(t.state==='loading')return {...this.loading(t.excavatorId),angle:0};
            if(t.state==='unloading')return {x:this.disposalX,y:this.disposalY,angle:Math.PI/2};
            if(!['hauling','returning'].includes(t.state))return {...this.parking(t.id),angle:0};
            const points=this.route(t), lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
            let distance=lengths.reduce((a,b)=>a+b,0)*clamp((time-t.start)/(t.end-t.start));
            for(let i=0;i<lengths.length;i++){
                if(distance<=lengths[i]||i===lengths.length-1){const a=points[i],b=points[i+1],f=lengths[i]?clamp(distance/lengths[i]):1;return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,angle:Math.atan2(b.y-a.y,b.x-a.x)};}distance-=lengths[i];
            }
        }
        truck(t,time,capacity,p) {
            const ctx=this.ctx,scale=this.scale, co=Math.cos(p.angle),si=Math.sin(p.angle);
            const at=(x,y)=>({x:p.x+x*co-y*si,y:p.y+x*si+y*co});
            for(const x of [-.72,.65])for(const y of [-.55,.55]){const w=at(x,y),q=this.iso(w.x,w.y,.22);ctx.beginPath();ctx.ellipse(q.x,q.y,Math.max(.7,scale*.23),Math.max(.6,scale*.27),0,0,Math.PI*2);ctx.fillStyle='#243445';ctx.fill();}
            this.box(p.x,p.y,2.05,1.05,.27,['#64788a','#33485a','#43586a'],p.angle,.3);
            const cab=at(.64,0),bed=at(-.36,0);
            this.box(cab.x,cab.y,.66,1,.75,['#f9c536','#b78d1c','#d4a724'],p.angle,.57);
            this.box(cab.x,cab.y,.5,.77,.3,['#b4d9e8','#335d73','#547b91'],p.angle,1.02);
            const tip=t.state==='unloading'?Math.sin(clamp((time-t.start)/(t.end-t.start))*Math.PI)*.65:0;
            this.box(bed.x,bed.y,1.35,1.04,.44,['#527086','#243f55','#345269'],p.angle,.62+tip);
            if(t.load>0){const fill=Math.min(1,t.load/capacity);this.box(bed.x,bed.y,1.14,.84,.07+fill*.2,['#a78050','#725333','#8e6b43'],p.angle,1.02+tip);}
            if(scale>=5)this.label('T'+(t.id+1),p.x,p.y,1.6,'#102a43',Math.max(7,Math.min(10,scale*.75)));
        }
        excavator(ex,time) {
            const b=this.bay(ex.id), active=ex.truckId!==null;
            const f=active?clamp((time-ex.cycleStart)/(ex.cycleEnd-ex.cycleStart)):0;
            const swing=f<.38?0:f<.66?(f-.38)/.28:f<.86?1:1-(f-.86)/.14;
            const angle=Math.PI-(Math.PI-.55)*swing;
            const lift=active?Math.sin(Math.min(1,f/.65)*Math.PI*.6):.35;
            this.box(b.x,b.y-.58,2.1,.4,.36,['#3d4c56','#283540','#34424d']);
            this.box(b.x,b.y+.58,2.1,.4,.36,['#3d4c56','#283540','#34424d']);
            this.box(b.x,b.y,1.65,1.35,.7,['#f9c536','#b78b16','#d7a726'],angle,.38);
            this.box(b.x+.15*Math.cos(angle),b.y+.15*Math.sin(angle),.65,.67,.65,['#c1e0ea','#315a70','#527f92'],angle,.95);
            const root=this.iso(b.x,b.y,1.1),elbow=this.iso(b.x+Math.cos(angle)*1.05,b.y+Math.sin(angle)*1.05,1.7+lift*.8),bucket=this.iso(b.x+Math.cos(angle)*2,b.y+Math.sin(angle)*2,.35+lift*1.25);
            const ctx=this.ctx;
            for(const [color,width] of [['#8f6c10',.37],['#f9c536',.23]]){ctx.beginPath();ctx.moveTo(root.x,root.y);ctx.lineTo(elbow.x,elbow.y);ctx.lineTo(bucket.x,bucket.y);ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,width*this.scale);ctx.lineJoin='round';ctx.stroke();}
            ctx.beginPath();ctx.moveTo(bucket.x-this.scale*.25,bucket.y);ctx.lineTo(bucket.x+this.scale*.3,bucket.y+this.scale*.23);ctx.lineTo(bucket.x+this.scale*.4,bucket.y-this.scale*.15);ctx.closePath();ctx.fillStyle=active&&f>.16&&f<.82?'#8f6b43':'#52616a';ctx.fill();
            if(this.scale>=5)this.label('E'+(ex.id+1),b.x,b.y,2.2,'#102a43',Math.max(7,Math.min(10,this.scale*.75)));
        }
        draw(engine) {
            if(!this.ctx||!this.model)return;
            const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.drawImage(this.background,0,0);
            ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
            const progress=engine&&engine.config.volumeLCM>0?engine.delivered/engine.config.volumeLCM:0;
            const pileX=this.disposalX+1.8,pileY=this.disposalY-1.1,height=.12+progress*2.2;
            if(this.hasHauling){
            this.polygon([this.iso(pileX-1.7,pileY,0),this.iso(pileX,pileY-1.5,0),this.iso(pileX,pileY,height)],'#b08755');
            this.polygon([this.iso(pileX,pileY-1.5,0),this.iso(pileX+1.7,pileY,0),this.iso(pileX,pileY,height)],'#c8a574');
            this.polygon([this.iso(pileX+1.7,pileY,0),this.iso(pileX,pileY+1.5,0),this.iso(pileX-1.7,pileY,0),this.iso(pileX,pileY,height)],'#967047');
            }
            const trucks=engine?engine.trucks:Array.from({length:this.model.truckCount},(_,id)=>({id,state:'standby',load:0}));
            const excavators=engine?engine.excavators:Array.from({length:this.model.excavatorCount},(_,id)=>({id,truckId:null}));
            const time=engine?.time||0;
            const actors=trucks.map(t=>{const p=this.position(t,time);return {depth:p.x+p.y,draw:()=>this.truck(t,time,engine?.config.truckCapacity||1,p)};});
            excavators.forEach(ex=>{const b=this.bay(ex.id);actors.push({depth:b.x+b.y,draw:()=>this.excavator(ex,time)});});
            const bulldozers=engine?.bulldozers||[];
            const pushed=engine?.dozer?engine.dozer.pushed/engine.dozer.config.volume:0;
            for(let id=0;id<(this.model.bulldozerCount||0);id++){
                const lane=this.dozerLane(id);
                this.box(lane.x+3.6,lane.y,.7,1.8,.15+(1-pushed)*.45,['#b89668','#765936','#947248']);
                this.box(lane.x+9,lane.y,1.3,2,.12+pushed*.85,['#c5a16e','#795b38','#a27d50']);
            }
            // Inactive Bulldozer models remain parked, without fictional work.
            const units=bulldozers.length?bulldozers:Array.from({length:this.model.bulldozerCount||0},(_,id)=>({id,state:'standby',load:0,start:0,end:0}));
            units.forEach(unit=>{const p=this.dozerPosition(unit,engine?.dozer?.time||0);actors.push({depth:p.x+p.y,draw:()=>this.bulldozer(unit,engine?.dozer?.time||0,p)});});
            actors.sort((a,b)=>a.depth-b.depth).forEach(a=>a.draw());
            if(this.scale<5){ctx.fillStyle='rgba(255,255,255,.92)';ctx.fillRect(10,this.height-29,this.width-20,22);ctx.font='11px Arial';ctx.textAlign='center';ctx.fillStyle='#102a43';ctx.fillText('E '+this.model.excavatorCount+' · T '+this.model.truckCount+' · B '+(this.model.bulldozerCount||0)+' · seluruh unit ditampilkan',this.width/2,this.height-14);}
        }
    }
    root.ExcabaseFleetRenderer=Renderer;
})(window);
