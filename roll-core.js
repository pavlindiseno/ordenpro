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
 function layout(choices){
  const results=patterns.map((g,i)=>g[choices[i]]);
  const list=[];for(let i=0;i<results.length;i++)for(const c of results[i].placed)list.push({width:c.width,height:c.height,qty:1,label:'Cristal '+(i+1)+' · Ejemplar '+c.copy+' · Parte '+c.part+'/'+c.parts,glassGroup:i+1,glassWidth:c.glassWidth,glassHeight:c.glassHeight,part:c.part,parts:c.parts,copy:c.copy,margin:c.margin,trim:c.trim,overlapLeft:c.overlapLeft,overlapRight:c.overlapRight});
  if(list.length>20000)throw Error('Demasiados paños para una sola distribución.');
  const packed=pack({roll:p.roll,gap:p.gap??5,margin:0,bleed:0,rotate:false,pieces:list});
  packed.placed=packed.placed.map((c,n)=>({...c,paño:n+1,glassGroup:list[c.id-1].glassGroup,glassWidth:list[c.id-1].glassWidth,glassHeight:list[c.id-1].glassHeight,part:list[c.id-1].part,parts:list[c.id-1].parts,copy:list[c.id-1].copy,margin:list[c.id-1].margin,trim:list[c.id-1].trim,overlapLeft:list[c.id-1].overlapLeft,overlapRight:list[c.id-1].overlapRight}));
  const orientation=choices.every(c=>c===choices[0])?choices[0]:'mixta';
  return {...packed,mode:'panels',margin:0,overlap:+p.overlap||0,qty,orientation,glassResults:results,glassArea:results.reduce((n,r)=>n+r.glassArea,0)};
 }
 const vertical=layout(patterns.map(()=>'vertical')),horizontal=layout(patterns.map(()=>'horizontal'));
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
