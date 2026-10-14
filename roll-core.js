(function(root){
'use strict';
const num=(v,label,min=0)=>{const n=Number(v);if(v===''||v==null||!Number.isFinite(n)||n<min)throw Error('Revisa '+label+'.');return n;};
const count=v=>{const n=num(v,'la cantidad',1);if(!Number.isInteger(n)||n>20000)throw Error('La cantidad debe ser entera, entre 1 y 20.000.');return n;};
const ceil=n=>Math.ceil(n-1e-9);
function settings(p){return {roll:num(p.roll,'el ancho útil de bobina',.01),gap:num(p.gap??5,'la separación')/10,margin:num(p.margin??0,'el margen por lado'),bleed:num(p.bleed??0,'el sangrado')/10};}
function pack(p){
 const {roll,gap,margin,bleed}=settings(p),space=Math.max(0,gap-2*bleed);
 if(!Array.isArray(p.pieces)||!p.pieces.length)throw Error('Añade alguna pieza.');
 const pieces=[];let glassArea=0;
 p.pieces.forEach((r,i)=>{const w=num(r.width,'el ancho de la pieza',.01),h=num(r.height,'el alto de la pieza',.01),qty=count(r.qty);glassArea+=w*h*qty/10000;
 for(let j=0;j<qty;j++)pieces.push({id:i+1,label:r.label||'Pieza '+(i+1),w:w+2*margin,h:h+2*margin,sourceW:w,sourceH:h,fw:w+2*margin+2*bleed,fh:h+2*margin+2*bleed});});
 if(pieces.length>20000)throw Error('Calcula hasta 20.000 piezas por distribución.');
 for(const r of pieces)if(r.fw>roll+1e-8&&(!p.rotate||r.fh>roll+1e-8))throw Error(r.label+': no cabe en el ancho útil. Cambia la orientación o calcula el cristal por paños.');
 const orders=[(a,b)=>b.fh-a.fh||b.fw-a.fw,(a,b)=>b.fw-a.fw||b.fh-a.fh,(a,b)=>b.fw*b.fh-a.fw*a.fh,(a,b)=>Math.max(b.fw,b.fh)-Math.max(a.fw,a.fh)];
 let best=null;
 for(const order of orders){
 const shelves=[],placed=[];let bottom=0;
 for(const r of [...pieces].sort(order)){
 const opts=[{w:r.fw,h:r.fh,turned:false}];if(p.rotate&&r.fw!==r.fh)opts.push({w:r.fh,h:r.fw,turned:true});
 let chosen=null;
 for(const opt of opts){if(opt.w>roll+1e-8)continue;for(let i=0;i<shelves.length;i++){const row=shelves[i],x=row.used+(row.used?space:0);if(opt.h<=row.h+1e-8&&x+opt.w<=roll+1e-8){const score=(row.h-opt.h)*roll+(roll-x-opt.w);if(!chosen||score<chosen.score)chosen={...opt,row,x,score};}}}
 if(!chosen){const opt=opts.filter(o=>o.w<=roll+1e-8).sort((a,b)=>a.h-b.h||b.w-a.w)[0];const row={y:bottom+(shelves.length?space:0),h:opt.h,used:0};shelves.push(row);bottom=row.y+row.h;chosen={...opt,row,x:0};}
 const {row,x,w,h,turned}=chosen;placed.push({...r,x:x+bleed,y:row.y+bleed,width:w-2*bleed,height:h-2*bleed,turned});row.used=x+w;
 }
 const result={mode:'pieces',roll,gap,margin,bleed,placed,length:bottom/100,consumedArea:roll*bottom/10000,glassArea,pieceCount:pieces.length,cutArea:pieces.reduce((n,r)=>n+r.w*r.h/10000,0)};
 if(!best||result.length<best.length-1e-8)best=result;
 }
 return best;
}
function panels(p){
 const roll=num(p.roll,'el ancho útil de bobina',.01),width=num(p.width,'el ancho del cristal',.01),height=num(p.height,'el alto del cristal',.01),margin=num(p.margin??0,'el margen por lado'),overlap=num(p.overlap??0,'el solape'),gap=num(p.gap??0,'la separación')/10,qty=count(p.qty??1);
 if(overlap>=roll)throw Error('El solape debe ser menor que el ancho de bobina.');
 const W=width+2*margin,H=height+2*margin;
 function option(orientation){const span=orientation==='vertical'?W:H,along=orientation==='vertical'?H:W,n=Math.max(1,ceil((span-overlap)/(roll-overlap))),last=span-(n-1)*(roll-overlap);
 if(n*qty>20000)throw Error('Demasiados paños para una sola distribución.');
 const widths=Array.from({length:n},(_,i)=>i===n-1?last:roll),placed=[];
 let y=0;
 for(let q=0;q<qty;q++)for(let i=0;i<n;i++){if(placed.length)y+=gap;placed.push({id:i+1,label:'Cristal '+(q+1)+' · Paño '+(i+1),x:0,y,width:widths[i],height:along});y+=along;}
 return {mode:'panels',orientation,roll,overlap,gap,margin,width,height,qty,targetW:W,targetH:H,panelsPerGlass:n,widths,placed,length:y/100,consumedArea:roll*y/10000,glassArea:width*height*qty/10000,cutArea:widths.reduce((s,w)=>s+w*along,0)*qty/10000,pieceCount:n*qty};
 }
 const vertical=option('vertical'),horizontal=option('horizontal');
 const selected=p.orientation==='vertical'?vertical:p.orientation==='horizontal'?horizontal:vertical.length<=horizontal.length?vertical:horizontal;
 if(selected.pieceCount>20000)throw Error('Demasiados paños para una sola distribución.');
 return {...selected,alternatives:{vertical:{length:vertical.length,consumedArea:vertical.consumedArea,panels:vertical.panelsPerGlass},horizontal:{length:horizontal.length,consumedArea:horizontal.consumedArea,panels:horizontal.panelsPerGlass}}};
}
function panelsBatch(p){
 if(!Array.isArray(p.glasses)||!p.glasses.length)throw Error('Añade al menos un cristal.');
 if(p.glasses.length>1000)throw Error('Calcula hasta 1.000 cristales por partida.');
 const results=p.glasses.map(g=>panels({...p,width:g.width,height:g.height,qty:1,margin:g.margin===''||g.margin==null?p.margin:g.margin}));
 const gap=num(p.gap??0,'la separación')/10,placed=[];let offset=0;
 results.forEach((r,i)=>{if(i)offset+=gap;r.placed.forEach(c=>placed.push({...c,id:placed.length+1,label:'Cristal '+(i+1)+' · '+c.label.split(' · ').at(-1),y:c.y+offset}));offset+=r.length*100;});
 const sum=k=>results.reduce((a,r)=>a+r[k],0),alternative=k=>({length:results.reduce((a,r)=>a+r.alternatives[k].length,0)+(results.length-1)*gap/100});
 const orientation=results.every(r=>r.orientation===results[0].orientation)?results[0].orientation:'mixta';
 return {mode:'panels',roll:results[0].roll,margin:+p.margin||0,overlap:+p.overlap||0,gap,qty:results.length,orientation,glassResults:results,placed,pieceCount:placed.length,length:offset/100,consumedArea:results[0].roll*offset/10000,glassArea:sum('glassArea'),cutArea:sum('cutArea'),alternatives:{vertical:alternative('vertical'),horizontal:alternative('horizontal')}};
}
root.OrdenProRoll={pack,panels,panelsBatch};if(typeof module!=='undefined')module.exports=root.OrdenProRoll;
})(globalThis);
