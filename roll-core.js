(function(root){
'use strict';
const num=(v,label,min=0)=>{const n=Number(v);if(v===''||v==null||!Number.isFinite(n)||n<min)throw Error('Revisa '+label+'.');return n;};
const count=v=>{const n=num(v,'la cantidad',1);if(!Number.isInteger(n)||n>20000)throw Error('La cantidad debe ser entera, entre 1 y 20.000.');return n;};
const ceil=n=>Math.ceil(n-1e-9);
function settings(p){return {roll:num(p.roll,'el ancho útil de bobina',.01),gap:num(p.gap??5,'la separación')/10,margin:num(p.margin??0,'el margen por lado'),bleed:num(p.bleed??0,'el sangrado')/10};}
function packLayout(p){
 const base=settings(p),roll=base.roll,margin=base.margin;
 const gap=Math.max(...p.pieces.map(r=>num(r.gap??p.gap??5,'la separación')/10)),bleed=base.bleed;
 const minBleed=Math.min(...p.pieces.map(r=>num(r.bleed??p.bleed??0,'el sangrado')/10)),space=Math.max(0,gap-2*minBleed);
 if(!Array.isArray(p.pieces)||!p.pieces.length)throw Error('Añade alguna pieza.');
 const pieces=[];let glassArea=0;
 p.pieces.forEach((r,i)=>{const w=num(r.width,'el ancho de la pieza',.01),h=num(r.height,'el alto de la pieza',.01),qty=count(r.qty),itemBleed=num(r.bleed??p.bleed??0,'el sangrado')/10,itemGap=num(r.gap??p.gap??5,'la separación')/10;glassArea+=w*h*qty/10000;
 for(let j=0;j<qty;j++)pieces.push({id:i+1,label:r.label||'Pieza '+(i+1),w:w+2*margin,h:h+2*margin,sourceW:w,sourceH:h,bleed:itemBleed,gap:itemGap,fw:w+2*margin+2*itemBleed,fh:h+2*margin+2*itemBleed});});
 if(pieces.length>20000)throw Error('Calcula hasta 20.000 piezas por distribución.');
 for(const r of pieces)if(r.fw>roll+1e-8&&(!p.rotate||r.fh>roll+1e-8))throw Error(r.label+': no cabe en el ancho útil. Cambia la orientación o calcula el cristal por paños.');
 const orders=[(a,b)=>b.fh-a.fh||b.fw-a.fw,(a,b)=>b.fw-a.fw||b.fh-a.fh,(a,b)=>b.fw*b.fh-a.fw*a.fh,(a,b)=>Math.max(b.fw,b.fh)-Math.max(a.fw,a.fh)];
 let best=null;
 for(const order of orders)for(const rowStrategy of (p.rotate?['short','tall','density']:['short'])){
 const shelves=[],placed=[];let bottom=0;
 for(const r of [...pieces].sort(order)){
 const opts=[{w:r.fw,h:r.fh,turned:false}];if(p.rotate&&r.fw!==r.fh)opts.push({w:r.fh,h:r.fw,turned:true});
 let chosen=null;
 for(const opt of opts){if(opt.w>roll+1e-8)continue;for(let i=0;i<shelves.length;i++){const row=shelves[i],x=row.used+(row.used?space:0);if(opt.h<=row.h+1e-8&&x+opt.w<=roll+1e-8){const score=(row.h-opt.h)*roll+(roll-x-opt.w);if(!chosen||score<chosen.score)chosen={...opt,row,x,score};}}}
 if(!chosen){const opt=opts.filter(o=>o.w<=roll+1e-8).sort((a,b)=>rowStrategy==='tall'?b.h-a.h||b.w-a.w:rowStrategy==='density'?(Math.floor((roll+space)/(b.w+space))*b.w-Math.floor((roll+space)/(a.w+space))*a.w)||a.h-b.h:a.h-b.h||b.w-a.w)[0];const row={y:bottom+(shelves.length?space:0),h:opt.h,used:0};shelves.push(row);bottom=row.y+row.h;chosen={...opt,row,x:0};}
 const {row,x,w,h,turned}=chosen;placed.push({...r,x:x+r.bleed,y:row.y+r.bleed,width:w-2*r.bleed,height:h-2*r.bleed,turned});row.used=x+w;
 }
 const result={mode:'pieces',roll,gap,margin,bleed,placed,length:bottom/100,consumedArea:roll*bottom/10000,glassArea,pieceCount:pieces.length,cutArea:pieces.reduce((n,r)=>n+r.w*r.h/10000,0)};
 if(!best||result.length<best.length-1e-8)best=result;
 }
 // Also fill free corners instead of restricting every cut to a shelf.
 // Keep large production runs on the scalable shelf search.
 if(pieces.length<=80)for(const order of orders)for(const preferTall of (p.rotate?[false,true]:[false])){
  const occupied=[],placed=[];let bottom=0;
  for(const r of [...pieces].sort(order)){
   const opts=[{w:r.fw,h:r.fh,turned:false}];
   if(p.rotate&&r.fw!==r.fh)opts.push({w:r.fh,h:r.fw,turned:true});
   const xs=[0,...occupied.map(b=>b.x+b.w+space)],ys=[0,...occupied.map(b=>b.y+b.h+space)];
   let chosen=null;
   for(const opt of opts)if(opt.w<=roll+1e-8)for(const y of ys)for(const x of xs){
    if(x+opt.w>roll+1e-8)continue;
    if(occupied.some(b=>!(x+opt.w+space<=b.x+1e-8||b.x+b.w+space<=x+1e-8||y+opt.h+space<=b.y+1e-8||b.y+b.h+space<=y+1e-8)))continue;
    const score=[!occupied.length&&preferTall?-opt.h:Math.max(bottom,y+opt.h),y,x];
    if(!chosen||score[0]<chosen.score[0]-1e-8||Math.abs(score[0]-chosen.score[0])<1e-8&&(score[1]<chosen.score[1]-1e-8||Math.abs(score[1]-chosen.score[1])<1e-8&&score[2]<chosen.score[2]-1e-8))chosen={...opt,x,y,score};
   }
   occupied.push(chosen);bottom=Math.max(bottom,chosen.y+chosen.h);
   placed.push({...r,x:chosen.x+r.bleed,y:chosen.y+r.bleed,width:chosen.w-2*r.bleed,height:chosen.h-2*r.bleed,turned:chosen.turned});
  }
  if(bottom/100<best.length-1e-8)best={...best,placed,length:bottom/100,consumedArea:roll*bottom/10000};
 }
 return best;
}
function pack(p){
 if(!Array.isArray(p.pieces)||!p.pieces.length)throw Error('Añade alguna pieza.');
 const orientation=p.pieceOrientation||(p.rotate?'mixed':'vertical');
 const items=p.pieces.map(r=>orientation==='horizontal'?{...r,width:r.height,height:r.width}:r);
 const params={...p,pieces:items,rotate:orientation==='mixed'};
 function restore(r,index){
  r.placed=r.placed.map(c=>({...c,id:index==null?c.id:index+1,model:index==null?c.id:index+1,
   ...(orientation==='horizontal'?{sourceW:c.sourceH,sourceH:c.sourceW,turned:true}:{})}));
  return r;
 }
 if(p.mixJobs!==false)return {...restore(packLayout(params)),pieceOrientation:orientation,mixJobs:true};
 const placed=[],segments=[];let bottom=0,glassArea=0,cutArea=0,pieceCount=0,previousGap=0;
 items.forEach((item,i)=>{
  const r=restore(packLayout({...params,pieces:[item],gap:item.gap??p.gap??5,bleed:item.bleed??p.bleed??0}),i);
  if(i)bottom+=Math.max(previousGap,r.gap);
  const start=bottom;placed.push(...r.placed.map(c=>({...c,y:c.y+start})));bottom+=r.length*100;
  segments.push({model:i+1,label:item.label||'Modelo '+(i+1),start,length:r.length,pieceCount:r.pieceCount});
  glassArea+=r.glassArea;cutArea+=r.cutArea;pieceCount+=r.pieceCount;previousGap=r.gap;
 });
 if(pieceCount>20000)throw Error('Calcula hasta 20.000 piezas por distribución.');
 const base=settings(p);
 return {...base,mode:'pieces',placed,segments,length:bottom/100,consumedArea:base.roll*bottom/10000,glassArea,cutArea,pieceCount,pieceOrientation:orientation,mixJobs:false};
}
function panels(p){
 const roll=num(p.roll,'el ancho útil de bobina',.01),width=num(p.width,'el ancho del cristal',.01),height=num(p.height,'el alto del cristal',.01),margin=num(p.margin??0,'el margen por lado'),overlap=num(p.overlap??0,'el solape'),gap=num(p.gap??0,'la separación')/10,qty=count(p.qty??1);
 if(overlap>=roll)throw Error('El solape debe ser menor que el ancho de bobina.');
 const W=width+2*margin,H=height+2*margin;
 function option(orientation){const span=orientation==='vertical'?W:H,along=orientation==='vertical'?H:W,n=Math.max(1,ceil((span-overlap)/(roll-overlap))),last=span-(n-1)*(roll-overlap);
 if(n*qty>20000)throw Error('Demasiados paños para una sola distribución.');
 const widths=Array.from({length:n},(_,i)=>i===n-1?last:roll),placed=[];
 let y=0;
 for(let q=0;q<qty;q++)for(let i=0;i<n;i++){if(placed.length)y+=gap;placed.push({id:i+1,label:'Cristal '+(q+1)+' · Paño '+(i+1),x:0,y,width:widths[i],height:along,glassWidth:width,glassHeight:height,part:i+1,parts:n,copy:q+1,margin,trim:{left:i===0?margin:0,right:i===n-1?margin:0,top:margin,bottom:margin},overlapLeft:i>0?overlap:0,overlapRight:i<n-1?overlap:0});y+=along;}
 return {mode:'panels',orientation,roll,overlap,gap,margin,width,height,qty,targetW:W,targetH:H,panelsPerGlass:n,widths,placed,length:y/100,consumedArea:roll*y/10000,glassArea:width*height*qty/10000,cutArea:widths.reduce((s,w)=>s+w*along,0)*qty/10000,pieceCount:n*qty};
 }
 const vertical=option('vertical'),horizontal=option('horizontal');
 const selected=p.orientation==='vertical'?vertical:p.orientation==='horizontal'?horizontal:vertical.length<=horizontal.length?vertical:horizontal;
 if(selected.pieceCount>20000)throw Error('Demasiados paños para una sola distribución.');
 return {...selected,alternatives:{vertical:{length:vertical.length,consumedArea:vertical.consumedArea,panels:vertical.panelsPerGlass},horizontal:{length:horizontal.length,consumedArea:horizontal.consumedArea,panels:horizontal.panelsPerGlass}}};
}
function panelsBatch(p){
 if(!Array.isArray(p.glasses)||!p.glasses.length)throw Error('Añade al menos un cristal.');
 if(p.glasses.length>1000)throw Error('Calcula hasta 1.000 medidas por partida.');
 const patterns=p.glasses.map((g,i)=>{
  const qty=count(g.qty??1),common={...p,width:g.width,height:g.height,qty,margin:g.margin===''||g.margin==null?p.margin:g.margin};
  return {vertical:panels({...common,orientation:'vertical'}),horizontal:panels({...common,orientation:'horizontal'})};
 });
 const qty=patterns.reduce((n,g)=>n+g.vertical.qty,0);
 function layout(choices,rotate=p.orientation!=='vertical'&&p.orientation!=='horizontal'){
  const results=patterns.map((g,i)=>g[choices[i]]);
  const list=[];for(let i=0;i<results.length;i++)for(const c of results[i].placed)list.push({width:c.width,height:c.height,qty:1,label:'Cristal '+(i+1)+' · Ejemplar '+c.copy+' · Parte '+c.part+'/'+c.parts,glassGroup:i+1,glassWidth:c.glassWidth,glassHeight:c.glassHeight,part:c.part,parts:c.parts,copy:c.copy,margin:c.margin,trim:c.trim,overlapLeft:c.overlapLeft,overlapRight:c.overlapRight});
  if(list.length>20000)throw Error('Demasiados paños para una sola distribución.');
  const packed=pack({roll:p.roll,gap:p.gap??5,margin:0,bleed:0,rotate,pieces:list});
  packed.placed=packed.placed.map((c,n)=>({...c,paño:n+1,glassGroup:list[c.id-1].glassGroup,glassWidth:list[c.id-1].glassWidth,glassHeight:list[c.id-1].glassHeight,part:list[c.id-1].part,parts:list[c.id-1].parts,copy:list[c.id-1].copy,margin:list[c.id-1].margin,trim:list[c.id-1].trim,overlapLeft:list[c.id-1].overlapLeft,overlapRight:list[c.id-1].overlapRight}));
  packed.placed=packed.placed.map(c=>{
   if(!c.turned)return c;
   const t=c.trim;
   return {...c,trim:{left:t.bottom,right:t.top,top:t.left,bottom:t.right},overlapTop:c.overlapLeft,overlapBottom:c.overlapRight,overlapLeft:0,overlapRight:0};
  });
  const actual=packed.placed.map(c=>c.turned?(choices[c.glassGroup-1]==='vertical'?'horizontal':'vertical'):choices[c.glassGroup-1]);
  const orientation=actual.every(c=>c===actual[0])?actual[0]:'mixta';
  return {...packed,mode:'panels',margin:0,overlap:+p.overlap||0,qty,orientation,glassResults:results.map((r,i)=>{const dirs=packed.placed.filter(c=>c.glassGroup===i+1).map(c=>c.turned?(choices[i]==='vertical'?'horizontal':'vertical'):choices[i]);return {...r,orientation:dirs.every(d=>d===dirs[0])?dirs[0]:'mixta'};}),glassArea:results.reduce((n,r)=>n+r.glassArea,0)};
 }
 const vertical=layout(patterns.map(()=>'vertical'),false),horizontal=layout(patterns.map(()=>'horizontal'),false);
 let best=vertical.length<=horizontal.length?vertical:horizontal;
 if(p.orientation==='vertical')best=vertical;
 else if(p.orientation==='horizontal')best=horizontal;
 else {
  const allowed=patterns.map(g=>g.vertical.panelsPerGlass===1&&g.horizontal.panelsPerGlass>1?['vertical']:g.horizontal.panelsPerGlass===1&&g.vertical.panelsPerGlass>1?['horizontal']:['vertical','horizontal']);
  const choices=patterns.map((g,i)=>allowed[i].length===1?allowed[i][0]:g.vertical.length<=g.horizontal.length?'vertical':'horizontal');
  best=layout(choices);
  if(patterns.length<=8){for(let mask=0;mask<2**patterns.length;mask++){const trial=layout(patterns.map((_,i)=>allowed[i].length===1?allowed[i][0]:(mask&(1<<i))?'horizontal':'vertical'));if(trial.length<best.length-1e-8)best=trial;}}
  else if(patterns.length<=50){for(let i=0;i<patterns.length;i++){if(allowed[i].length===1)continue;const test=[...choices];test[i]=test[i]==='vertical'?'horizontal':'vertical';const trial=layout(test);if(trial.length<best.length-1e-8){best=trial;choices[i]=test[i];}}}
 }
 return {...best,alternatives:{vertical:{length:vertical.length},horizontal:{length:horizontal.length}}};
}
root.OrdenProRoll={pack,panels,panelsBatch};if(typeof module!=='undefined')module.exports=root.OrdenProRoll;
})(globalThis);
