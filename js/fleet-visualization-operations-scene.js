/* Zone geometry and vehicle meshes read state; never update work or time. */
(function(root){
    'use strict';
    const definitions={loader:{count:'loaderCount',name:'STOCKPILE / LOADING',prefix:'L'},grader:{count:'graderCount',name:'JALUR GRADING · LUAS',prefix:'G'},compactor:{count:'compactorCount',name:'LAPISAN / LINTASAN PEMADATAN',prefix:'R'}};
    const clamp=v=>Math.max(0,Math.min(1,v));
    function layout(r,ctx){
        r.earthBounds={x:0,y:0,w:r.worldW,h:r.worldH};
        r.activityZones={};
        for(const [key,d]of Object.entries(definitions)){
            const count=ctx[d.count]||0;if(!count)continue;
            const cols=Math.min(3,Math.ceil(Math.sqrt(count))),rows=Math.ceil(count/cols);
            r.activityZones[key]={cols,rows,y:r.worldH+4,count};r.worldH+=rows*6+7;r.worldW=Math.max(r.worldW,cols*13+6);
        }
    }
    function lane(r,key,id){const z=r.activityZones[key];return {x:4+id%z.cols*13,y:z.y+Math.floor(id/z.cols)*6};}
    function loaderBay(r,id){const p=lane(r,'loader',id);return {x:p.x+8,y:p.y};}
    function bounds(r){
        if(r.focus==='earthmoving')return r.earthBounds;
        if(r.focus==='dozer'&&r.model.bulldozerCount)return {x:0,y:r.dozerY-3,w:r.dozerCols*12+5,h:r.dozerRows*5.5+6};
        const zone=r.activityZones?.[r.focus];
        return zone?{x:0,y:zone.y-3,w:zone.cols*13+6,h:zone.rows*6+6}:{x:0,y:0,w:r.worldW,h:r.worldH};
    }
    function environment(r){
        for(const [key,z]of Object.entries(r.activityZones||{})){
            r.label(definitions[key].name,z.cols*6,z.y-2,0,'#624a31',9);
            for(let id=0;id<z.count;id++){
                const p=lane(r,key,id);r.ground([[p.x-2,p.y-1.7],[p.x+10,p.y-1.7],[p.x+10,p.y+1.7],[p.x-2,p.y+1.7]],'#b8a589');
                if(key==='loader')r.box(p.x+4,p.y,.8,1.7,.6,['#b5905b','#725333','#927043']);
                r.ground([[p.x+7,p.y-1.2],[p.x+10,p.y-1.2],[p.x+10,p.y+1.2],[p.x+7,p.y+1.2]],'#cdbd9f');
            }
        }
    }
    function wheels(r,p,xs,side=.65,radius=.3){
        for(const x of xs)for(const y of [-side,side]){const q=r.iso(p.x+x,p.y+y,radius),ctx=r.ctx;ctx.beginPath();ctx.ellipse(q.x,q.y,Math.max(.7,r.scale*radius),Math.max(.7,r.scale*radius*1.2),0,0,Math.PI*2);ctx.fillStyle='#263b4b';ctx.fill();}
    }
    function loaderPosition(r,u,time){
        const p=lane(r,'loader',u.id),f=clamp((time-u.start)/(u.end-u.start)||0);
        const x=u.state==='approaching'?2.5*f:['scooping','lifting'].includes(u.state)?2.5:u.state==='carrying'?2.5+3.5*f:u.state==='dumping'?6:u.state==='returning'?6*(1-f):0;
        return {x:p.x+x,y:p.y};
    }
    function loader(r,u,time,p){
        wheels(r,p,[-.85,.85]);
        r.box(p.x,p.y,2.3,1.2,.55,['#f9c536','#b38a19','#d5a622'],0,.38);
        r.box(p.x-.4,p.y,.85,1,.85,['#bedbe9','#2c5067','#55798e'],0,.93);
        r.box(p.x-.4,p.y,1,1.1,.12,['#ffe09a','#b38a19','#d5a622'],0,1.78);
        const f=clamp((time-u.start)/(u.end-u.start)||0),lift=u.state==='lifting'?f:['carrying','dumping'].includes(u.state)?1:0;
        for(const side of [-.45,.45]){
            const a=r.iso(p.x+.3,p.y+side,.7),b=r.iso(p.x+1.5,p.y+side,.35+lift*1.25),ctx=r.ctx;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='#e4af27';ctx.lineWidth=Math.max(1,r.scale*.18);ctx.stroke();
        }
        const tip=u.state==='dumping'?Math.sin(f*Math.PI)*.35:0;
        r.box(p.x+1.6,p.y,.6,1.55,.35,['#8d9faa','#344d60','#657d8e'],0,.15+lift*1.25-tip);
        if(u.load>0)r.box(p.x+1.6,p.y,.45,1.2,.18,['#b38b58','#725333','#927043'],0,.47+lift*1.25-tip);
        if(r.scale>=4)r.label('L'+(u.id+1),p.x,p.y,2.25,'#102a43',8);
    }
    function actors(r,engine,list){
        for(const [key,zone]of Object.entries(r.activityZones||{})){
            const child=engine?.[key],units=child?.units||Array.from({length:zone.count},(_,id)=>({id,state:'standby',load:0,start:0,end:0})),time=child?.time||0;
            if(key==='loader')units.forEach(u=>{const p=loaderPosition(r,u,time);list.push({depth:p.x+p.y,draw:()=>loader(r,u,time,p)});});
            else{
                const coverage=(child?.snapshot().passProgress||0)/100;
                units.forEach(u=>{
                    const base=lane(r,key,u.id);r.ground([[base.x+1,base.y-1.4],[base.x+1+8*coverage,base.y-1.4],[base.x+1+8*coverage,base.y+1.4],[base.x+1,base.y+1.4]],key==='compactor'?'#8b9b89':'#b3b7a8');
                    const p=passPosition(r,key,u,time);list.push({depth:p.x+p.y,draw:()=>key==='compactor'?compactor(r,u,time,p):grader(r,u,p)});
                });
            }
        }
    }
    function passPosition(r,key,u,time){
        const base=lane(r,key,u.id),f=clamp((time-u.start)/(u.end-u.start)||0),reverse=(u.passes||0)%2;
        const offset=u.state==='entering'?(reverse?9+.8*(1-f):1-.8*(1-f)):u.state==='working'?(reverse?9-8*f:1+8*f):u.state==='turning'?(reverse?9+.8*f:1-.8*f):u.passes?(reverse?9.8:.2):0;
        return {x:base.x+offset,y:base.y+(u.state==='turning'?Math.sin(f*Math.PI)*.7:0)};
    }
    function grader(r,u,p){
        wheels(r,p,[-1.1,-.35,2.25],.65,.28);
        r.box(p.x+.65,p.y,4.4,.38,.3,['#f3c64d','#a98422','#cda434'],0,.6);
        r.box(p.x-.75,p.y,1.9,1.15,.55,['#f9c536','#b38a19','#d5a622'],0,.55);
        r.box(p.x-.45,p.y,.8,.95,.8,['#c3deeb','#294b62','#55798e'],0,1.1);
        r.box(p.x-.45,p.y,1,1.1,.12,['#ffe3a0','#b38a19','#d5a622'],0,1.9);
        r.box(p.x+.85,p.y,.32,2.15,.45,['#dce2e7','#637d8e','#9aacb9'],Math.PI/7,u.state==='working'?.05:.4);
        if(r.scale>=4)r.label('G'+(u.id+1),p.x,p.y,2.25,'#102a43',8);
    }
    function compactor(r,u,time,p){
        wheels(r,p,[-.8],.65,.4);
        r.box(p.x+.2,p.y,2.4,.95,.35,['#f8ca4c','#a98422','#d1a536'],0,.65);
        r.box(p.x-.55,p.y,1.2,1.2,.6,['#f9c536','#b38a19','#d5a622'],0,.55);
        r.box(p.x-.25,p.y,.75,.9,.85,['#c3deeb','#294b62','#55798e'],0,1.08);
        r.box(p.x-.25,p.y,1,1.1,.12,['#ffe3a0','#b38a19','#d5ac38'],0,1.93);
        r.box(p.x+1.25,p.y,.95,1.9,.7,['#dce3e8','#657e8f','#a4b4be'],0,.05);
        for(const side of [-1,1]){const q=r.iso(p.x+1.25,p.y+side,.4),ctx=r.ctx;ctx.beginPath();ctx.ellipse(q.x,q.y,Math.max(.8,r.scale*.4),Math.max(.8,r.scale*.46),0,0,Math.PI*2);ctx.fillStyle='#708796';ctx.fill();
            const angle=u.state==='working'?time*4:0;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+Math.cos(angle)*r.scale*.3,q.y+Math.sin(angle)*r.scale*.32);ctx.strokeStyle='#d9e2e8';ctx.lineWidth=1;ctx.stroke();}
        if(r.scale>=4)r.label('R'+(u.id+1),p.x,p.y,2.3,'#102a43',8);
    }
    root.ExcabaseFleetScene={layout,lane,loaderBay,environment,actors,wheels,bounds};
})(window);
