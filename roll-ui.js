(function(){
'use strict';
const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o)),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dec=n=>Number(n).toLocaleString('es-ES',{maximumFractionDigits:3}),money=n=>Number(n).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const input=(id,label,value='',step='any')=>'<label class="block text-xs text-slate-300">'+label+'<input id="roll_'+id+'" type="number" min="0" step="'+step+'" value="'+value+'" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"></label>';
let saved=[],draft=[],pieces=[{width:0,height:0,qty:0,label:''}],mode='panels',editing=null,last=null;
let glasses=[{width:0,height:0,margin:0,qty:1}];
const dialog=document.createElement('dialog');dialog.id='rollDialog';dialog.className='bg-slate-800 text-slate-100 rounded-xl border border-slate-600 p-4 w-full max-w-3xl';dialog.style.maxHeight='92vh';dialog.style.overflowY='auto';
dialog.innerHTML='<div class="flex justify-between mb-3"><h2 class="text-lg font-semibold text-blue-300">Bobinas y aprovechamiento</h2><button type="button" id="roll_close" aria-label="Cerrar">✕</button></div><div class="flex flex-wrap gap-2 mb-4"><button type="button" id="roll_panels" class="bg-blue-600 rounded-lg p-2 text-sm">Cristales por paños</button><button type="button" id="roll_pieces" class="bg-slate-700 rounded-lg p-2 text-sm">Piezas y etiquetas</button></div><div class="grid grid-cols-2 gap-3">'+input('roll','Ancho útil de bobina (mm)',1200)+input('margin','Margen para recortar POR LADO (mm)',0)+'</div><div id="roll_glass" class="mt-3"><div class="grid grid-cols-2 sm:grid-cols-3 gap-3">'+input('width','Ancho del cristal (mm)',0)+input('height','Alto del cristal (mm)',0)+input('qty','Cristales iguales',0,1)+input('overlap','Solape entre paños (mm)',0)+input('panelGap','Separación entre paños/cortes (mm)',5)+'<label class="block text-xs text-slate-300">Orientación<select id="roll_orientation" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2"><option value="best">Comparar y elegir menor consumo</option><option value="vertical">Paños verticales</option><option value="horizontal">Paños horizontales</option></select></label></div><p class="text-xs text-slate-400 mt-2">Cada medida tiene su margen y su cantidad. Solape: material que se monta sobre el paño contiguo en la unión (0 mm si no se solapa). Separación: espacio libre entre los cortes en la bobina; empieza en 5 mm. Son valores independientes.</p></div><div id="roll_pieceBlock" class="mt-3" hidden><div class="grid grid-cols-2 gap-3">'+input('gap','Separación entre contornos de corte (mm)',5)+input('bleed','Sangrado de impresión por lado (mm)',0)+'</div><label class="block text-sm my-3"><input type="checkbox" id="roll_rotate" checked> Permitir girar las piezas 90°</label><div id="roll_pieceRows"></div><button type="button" id="roll_addPiece" class="bg-slate-700 rounded-lg p-2 text-sm mt-2">+ Otra medida</button><p class="text-xs text-slate-400 mt-2">Las medidas son las del corte. El sangrado queda fuera del corte; si hace falta se amplía la separación para que no se invadan las gráficas. La distribución es una propuesta de aprovechamiento, no una garantía del mínimo absoluto.</p></div><button type="button" id="roll_calculate" class="bg-blue-600 rounded-lg px-4 py-2 font-semibold mt-4">Calcular y mostrar distribución</button><div id="roll_result" class="bg-slate-900 rounded-lg p-3 my-3 text-sm" aria-live="polite"></div><div id="roll_diagram" class="bg-white rounded-lg overflow-auto my-3"></div><details id="roll_cutList" class="text-sm mb-3"><summary class="cursor-pointer">Medidas de corte</summary><div id="roll_cuts" class="mt-2"></div></details><h3 class="text-emerald-400 mt-4 mb-2">Añadir el cálculo al presupuesto</h3><div class="grid grid-cols-2 gap-3"><label class="block text-xs">Material<select id="roll_material" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2"></select></label>'+input('price','Precio de venta (€/m²)',21)+'<label class="block text-xs">Superficie que se cobra<select id="roll_basis" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2"><option value="consumed">Bobina consumida</option><option value="surface">Superficie de cristales o piezas</option></select></label></div><label class="block text-sm mt-3">Descripción y observaciones<textarea id="roll_notes" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2" placeholder="Ej: Escaparate de la tienda; etiquetas para envases…"></textarea></label><p class="text-xs text-slate-400 my-2">Material antes de IVA. Diseño e instalación se presupuestan aparte; el descuento se aplica al trabajo completo.</p><button type="button" id="roll_addBudget" class="bg-emerald-600 rounded-lg px-4 py-2 font-semibold">Añadir partida</button><button type="button" id="roll_cancelEdit" class="ml-2 text-xs" hidden>Cancelar edición</button><h3 class="text-emerald-400 mt-4 mb-2">Partidas de bobina del trabajo</h3><div id="roll_budgetRows"></div><button type="button" id="roll_apply" class="bg-amber-600 rounded-lg px-4 py-2 font-semibold mt-3">Aplicar partidas al presupuesto</button>';
document.body.append(dialog);
$('roll_diagram').style.maxHeight='500px';
$('roll_diagram').style.overflow='auto';
for(const k of ['width','height','qty'])$('roll_'+k).closest('label').style.display='none';
const glassContainer=document.createElement('div');glassContainer.id='roll_glassRows';
const addGlass=document.createElement('button');addGlass.type='button';addGlass.id='roll_addGlass';addGlass.textContent='+ Añadir otro cristal';addGlass.className='bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg px-4 py-3 text-sm mt-3 mb-6';
$('roll_glass').prepend(glassContainer,addGlass);
function glassRows(){
 $('roll_glassRows').innerHTML=glasses.map((g,i)=>'<div class="border border-slate-700 rounded-lg p-2 my-2"><div class="flex justify-between text-sm mb-2"><span class="text-teal-300 font-semibold">Cristal '+(i+1)+'</span><button type="button" data-glass-remove="'+i+'" class="text-rose-300" aria-label="Eliminar cristal">✕</button></div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2">'+[['width','Ancho (mm)'],['height','Alto (mm)'],['margin','Margen por lado (mm)'],['qty','Número de cristales']].map(([k,l])=>'<label class="text-xs">'+l+'<input type="number" min="0" step="any" data-glass="'+i+'" data-glass-key="'+k+'" value="'+(g[k]===''?'':k==='qty'?(g.qty??1):+g[k]*10)+'" class="w-full min-w-0 bg-slate-900 rounded p-2"></label>').join('')+'</div></div>').join('');
}
$('roll_addGlass').onclick=()=>{glasses.push({width:0,height:0,margin:0,qty:1});glassRows();invalidate();};
$('roll_glassRows').addEventListener('input',e=>{const k=e.target.dataset.glassKey;if(k){glasses[+e.target.dataset.glass][k]=e.target.value===''?'':k==='qty'?Number(e.target.value):Number(e.target.value)/10;invalidate();}});
$('roll_glassRows').addEventListener('click',e=>{if(e.target.dataset.glassRemove!==undefined){glasses.splice(+e.target.dataset.glassRemove,1);glassRows();invalidate();}});

function show(id,on){$(id).hidden=!on;$(id).style.display=on?'':'none';}
const materials=OrdenProPlotter.products.map((p,i)=>[p,i]).filter(([p])=>p.unit==='m²'&&!p.retired);
$('roll_material').innerHTML=materials.map(([p,i])=>'<option value="'+i+'">'+esc(p.name)+'</option>').join('');
function pieceRows(){
 $('roll_pieceRows').innerHTML=pieces.map((r,i)=>'<div class="border border-slate-700 rounded-lg p-2 mb-2"><div class="flex gap-2 items-center mb-2"><label class="text-xs flex-1 min-w-0">Nombre (opcional)<input data-piece="'+i+'" data-key="label" value="'+esc(r.label)+'" class="w-full min-w-0 bg-slate-900 rounded p-1"></label><button type="button" data-remove="'+i+'" class="text-rose-300 flex-shrink-0 p-2" aria-label="Eliminar medida">✕</button></div><div class="grid grid-cols-3 gap-2">'+[['width','Ancho (mm)'],['height','Alto (mm)'],['qty','Cantidad']].map(([k,l])=>'<label class="text-xs">'+l+'<input type="number" min="'+(k==='qty'?1:0)+'" step="'+(k==='qty'?1:'any')+'" data-piece="'+i+'" data-key="'+k+'" value="'+esc(['width','height'].includes(k)?+r[k]*10:r[k])+'" class="w-full min-w-0 bg-slate-900 rounded p-2"></label>').join('')+'</div></div>').join('');
}
function setMode(m){mode=m;$('roll_margin').closest('label').style.display='none';show('roll_glass',m==='panels');show('roll_pieceBlock',m==='pieces');$('roll_panels').className=(m==='panels'?'bg-blue-600':'bg-slate-700')+' rounded-lg p-2 text-sm';$('roll_pieces').className=(m==='pieces'?'bg-blue-600':'bg-slate-700')+' rounded-lg p-2 text-sm';invalidate();}
function invalidate(){last=null;$('roll_result').textContent='Pulsa Calcular para actualizar la distribución.';$('roll_diagram').innerHTML='';show('roll_cutList',false);}
function read(){return {mode,roll:Number($('roll_roll').value)/10,glasses:clone(glasses),margin:0,width:Number($('roll_width').value)/10,height:Number($('roll_height').value)/10,qty:$('roll_qty').value,overlap:Number($('roll_overlap').value)/10,orientation:$('roll_orientation').value,gap:mode==='panels'?$('roll_panelGap').value:$('roll_gap').value,bleed:$('roll_bleed').value,rotate:$('roll_rotate').checked,pieces:clone(pieces)};}
function diagram(r){
 const length=r.length*100,offset=Math.max(1,Math.min(12,r.roll*.03));
 const boxes=r.placed.slice(0,1500).map((p,i)=>{
 const x=p.x+offset,y=p.y+offset,n=i+1,t=p.trim||{left:0,right:0,top:0,bottom:0};
 let svg='<rect x="'+x+'" y="'+y+'" width="'+p.width+'" height="'+p.height+'" fill="'+['#bae6fd','#bbf7d0','#fde68a','#ddd6fe'][((p.glassGroup??p.id??i+1)-1)%4]+'" stroke="#334155" stroke-width=".25"/>';
 if(p.margin>0){
  svg+='<rect data-mark="margin" x="'+x+'" y="'+y+'" width="'+p.width+'" height="'+p.height+'" fill="none" stroke="#dc2626" stroke-width=".6" stroke-dasharray="1.5 1"/>';
  svg+='<rect x="'+(x+t.left)+'" y="'+(y+t.top)+'" width="'+Math.max(0,p.width-t.left-t.right)+'" height="'+Math.max(0,p.height-t.top-t.bottom)+'" fill="none" stroke="#dc2626" data-mark="margin-start" stroke-width=".65" stroke-dasharray="1.5 1"/>';
 }
 for(const [edge,band] of [['left',p.overlapLeft],['right',p.overlapRight]])if(band>0){
  const lineX=edge==='left'?x+band:x+p.width-band;
  svg+='<line data-mark="overlap" x1="'+lineX+'" x2="'+lineX+'" y1="'+y+'" y2="'+(y+p.height)+'" stroke="#111827" stroke-width=".65" stroke-dasharray="1.5 1"/>';
 }
 const size=(w,h)=>dec(w*10)+' × '+dec(h*10)+' mm';
 const lines=['Paño '+n,p.glassWidth!=null?'Cristal '+size(p.glassWidth,p.glassHeight):'Pieza '+size(p.sourceW??p.width,p.sourceH??p.height)];
 if(p.part!=null)lines.push('Parte '+p.part+' de '+p.parts+(p.copy>1?' · Ejemplar '+p.copy:''));
 lines.push('Corte: '+size(p.width,p.height));
 if(p.margin>0)lines.push('Margen: '+dec(p.margin*10)+' mm');
 if(p.overlapLeft||p.overlapRight)lines.push('Solape: '+dec(Math.max(p.overlapLeft||0,p.overlapRight||0)*10)+' mm');
 const longest=Math.max(...lines.map(s=>s.length));
 const font=Math.max(.6,Math.min(4.2,(p.width-2)/(longest*.58),p.height/(lines.length*1.7)));
 const lineHeight=font*1.45,firstY=y+p.height/2-(lines.length-1)*lineHeight/2;
 svg+='<title>'+esc(lines.join(' · '))+'</title>';
 svg+='<text x="'+(x+p.width/2)+'" y="'+firstY+'" text-anchor="middle" dominant-baseline="middle" font-size="'+font+'" fill="#0f172a">'+lines.map((line,j)=>'<tspan x="'+(x+p.width/2)+'" dy="'+(j?lineHeight:0)+'" font-weight="'+(j===0?'700':'400')+'">'+esc(line)+'</tspan>').join('')+'</text>';
 return svg;
 }).join('');
 return '<svg role="img" aria-label="Distribución de los cortes en la bobina" viewBox="0 0 '+(r.roll+2*offset)+' '+(length+2*offset)+'" style="display:block;width:100%;height:auto"><rect x="'+offset+'" y="'+offset+'" width="'+r.roll+'" height="'+length+'" fill="#f8fafc" stroke="#94a3b8" stroke-width=".3"/>'+boxes+'</svg><p style="color:#334155;padding:8px;font-size:12px">Ancho útil '+dec(r.roll*10)+' mm · Largo '+dec(r.length*1000)+' mm'+(r.placed.length>1500?' · Se muestran los primeros 1.500 cortes; los totales incluyen todos.':'')+'</p><p style="padding:8px;color:#334155;font-size:12px">Desplaza el esquema para ver todos los paños. Rojo punteado interior: donde empieza el margen añadido; el contorno exterior es el corte total. Negro punteado lateral: donde empieza la franja de solape; continúa hasta el borde con el mismo relleno.</p>';
}
function calculate(){
 try{const p=read(),r=mode==='panels'?OrdenProRoll.panelsBatch(p):OrdenProRoll.pack(p);last={p,r};$('roll_result').innerHTML='<p><strong>'+dec(r.length*1000)+' mm lineales · '+dec(r.consumedArea)+' m² de bobina</strong></p><p>'+r.pieceCount+' piezas · Superficie del cristal/piezas: '+dec(r.glassArea)+' m² · Superficie de cortes: '+dec(r.cutArea)+' m²</p>'+(r.mode==='panels'?'<p>'+r.pieceCount+' paños en '+r.qty+' cristales · Orientación '+(r.orientation==='vertical'?'vertical':r.orientation==='horizontal'?'horizontal':'mixta')+'</p><p>Vertical: '+dec(r.alternatives.vertical.length*1000)+' mm · Horizontal: '+dec(r.alternatives.horizontal.length*1000)+' mm. Compara el sentido del material antes de elegir.</p>':'<p>Separación entre cortes: '+dec(Math.max(r.gap,2*r.bleed)*10)+' mm'+(r.bleed?' (incluye espacio suficiente para el sangrado)':'')+'. Se reserva el ancho completo de bobina.</p>');
 $('roll_diagram').innerHTML=diagram(r);const grouped=new Map();r.placed.forEach(c=>{const key=c.id+'|'+c.width+'|'+c.height;const g=grouped.get(key);if(g)g.qty++;else grouped.set(key,{...c,qty:1});});
 $('roll_cuts').innerHTML=[...grouped.values()].map(c=>'<p>'+c.qty+' × '+'Paño '+(c.paño||c.id)+' · '+esc(c.label)+(c.glassWidth!=null?' · Cristal '+dec(c.glassWidth*10)+' × '+dec(c.glassHeight*10)+' mm':'')+' · Corte: '+dec(c.width*10)+' × '+dec(c.height*10)+' mm</p>').join('');show('roll_cutList',true);return last;
 }catch(e){last=null;$('roll_result').textContent=e.message;$('roll_diagram').innerHTML='';show('roll_cutList',false);return null;}
}
function renderBudget(){ $('roll_budgetRows').innerHTML=draft.map((e,i)=>'<div class="bg-slate-900 rounded-lg p-2 my-2"><details><summary class="cursor-pointer text-sm">'+esc(e.label)+' · '+money(e.amount)+'</summary><p class="whitespace-pre-wrap text-xs mt-2">'+esc(e.notes)+'</p></details><div class="flex gap-3 text-xs mt-2"><button type="button" data-edit="'+i+'">Editar</button><button type="button" data-duplicate="'+i+'">Duplicar</button><button type="button" data-delete="'+i+'">Eliminar</button></div></div>').join('')||'<p class="text-xs text-slate-400">Ninguna partida añadida.</p>'; }
function newEditor(){editing=null;$('roll_addBudget').textContent='Añadir partida';show('roll_cancelEdit',false);}
$('roll_panels').onclick=()=>setMode('panels');$('roll_pieces').onclick=()=>setMode('pieces');
$('roll_close').onclick=()=>dialog.close();$('roll_calculate').onclick=calculate;
$('roll_addPiece').onclick=()=>{pieces.push({width:0,height:0,qty:0,label:''});pieceRows();invalidate();};
$('roll_pieceRows').addEventListener('input',e=>{const {piece,key}=e.target.dataset;if(key){pieces[+piece][key]=['width','height'].includes(key)?Number(e.target.value)/10:e.target.value;invalidate();}});
$('roll_pieceRows').addEventListener('click',e=>{if(e.target.dataset.remove!==undefined){pieces.splice(+e.target.dataset.remove,1);pieceRows();invalidate();}});
for(const k of ['roll','margin','width','height','qty','overlap','panelGap','orientation','gap','bleed','rotate'])$('roll_'+k).addEventListener('input',invalidate);
$('roll_material').onchange=()=>{$('roll_price').value=OrdenProPlotter.products[+$('roll_material').value].price;};
$('roll_addBudget').onclick=()=>{
 const calc=calculate();if(!calc)return;const price=Number($('roll_price').value);if($('roll_price').value===''||!Number.isFinite(price)||price<0){alert('Indica un precio válido por m².');return;}
 const {p,r}=calc,material=+$('roll_material').value,basis=$('roll_basis').value,area=basis==='surface'?r.glassArea:r.consumedArea,amount=area*price;
 const id=editing==null?'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,7):draft[editing].id;
 const label=OrdenProPlotter.products[material].name+' · '+(mode==='panels'?r.qty+' cristales de varias medidas':r.pieceCount+' piezas')+' · '+dec(r.length*1000)+' mm lineales';
 const calculationNotes='Bobina útil: '+dec(r.roll*10)+' mm. Consumo: '+dec(r.length*1000)+' mm lineales / '+dec(r.consumedArea)+' m². Superficie final: '+dec(r.glassArea)+' m². Margen: '+dec(r.margin*10)+' mm por lado. '+(mode==='panels'?'Paños '+r.orientation+', solape '+dec(r.overlap*10)+' mm.':'Separación '+dec(Math.max(r.gap,2*r.bleed)*10)+' mm; sangrado '+dec(r.bleed*10)+' mm; giro '+(p.rotate?'permitido':'no permitido')+'.')+' Cobro por '+(basis==='surface'?'superficie final':'bobina consumida')+': '+dec(area)+' m² × '+money(price)+'/m².';
 const glassDetails=mode==='panels'?r.glassResults.map((g,i)=>'Cristal '+(i+1)+' ('+g.qty+' iguales): '+dec(g.width*10)+' × '+dec(g.height*10)+' mm; margen '+dec(g.margin*10)+' mm por lado; '+g.panelsPerGlass+' paños '+g.orientation+'.').join('\n'):'';
 const userNotes=$('roll_notes').value,entry={id,label,p,result:r,material,price,basis,amount,userNotes,calculationNotes,notes:[userNotes,glassDetails,calculationNotes].filter(Boolean).join('\n')};
 if(editing==null)draft.push(entry);else draft[editing]=entry;renderBudget();newEditor();$('roll_notes').value='';
};
$('roll_cancelEdit').onclick=()=>{newEditor();invalidate();};
$('roll_budgetRows').addEventListener('click',e=>{
 const data=e.target.dataset;
 if(data.delete!==undefined){draft.splice(+data.delete,1);newEditor();renderBudget();return;}
 if(data.duplicate!==undefined){const row=clone(draft[+data.duplicate]);row.id='b'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);draft.push(row);renderBudget();return;}
 if(data.edit===undefined)return;editing=+data.edit;const row=draft[editing],p=row.p;pieces=clone(p.pieces||[]);glasses=p.glasses?p.glasses.map(g=>({...g,qty:g.qty??1,margin:g.margin===''||g.margin==null?p.margin||0:g.margin})):Array.from({length:Math.max(1,+p.qty||1)},()=>({width:+p.width||0,height:+p.height||0,margin:p.margin??0,qty:1}));glassRows();pieceRows();setMode(p.mode);
 for(const k of ['roll','margin','width','height','qty','overlap','orientation','bleed'])if(p[k]!=null)$('roll_'+k).value=['roll','margin','width','height','overlap'].includes(k)?+p[k]*10:p[k];
 $('roll_'+(mode==='panels'?'panelGap':'gap')).value=p.gap;$('roll_rotate').checked=p.rotate; $('roll_material').value=row.material;$('roll_price').value=row.price;$('roll_basis').value=row.basis;$('roll_notes').value=row.userNotes||'';
 $('roll_addBudget').textContent='Guardar partida';show('roll_cancelEdit',true);calculate();
});
$('roll_apply').onclick=()=>{
 if(editing!=null){alert('Guarda o cancela la edición antes de aplicar.');return;}
 if(!draft.length&&!saved.length){alert('Añade primero una partida, o cierra para consultar solo el cálculo.');return;}
 const keep=collectCustomCostRows().filter(row=>!row.name.startsWith('Bobina · '));resetCustomCostRows();keep.forEach(addCustomCostRow);
 draft.forEach(row=>addCustomCostRow({name:'Bobina · '+row.label,amount:row.amount.toFixed(2),notes:row.notes}));
 saved=clone(draft);if(!$('jobTitle').value)$('jobTitle').value='Trabajo de vinilo';if(!$('jobQuantity').value)$('jobQuantity').value=1;updateCostTotals();dialog.close();
};
window.ordenproRollUI={open(){draft=clone(saved);const rows=collectCustomCostRows();for(const row of draft){const cost=rows.find(c=>c.name==='Bobina · '+row.label);if(cost?.notes!==undefined&&cost.notes!==row.notes){row.notes=cost.notes;const suffix='\n'+(row.calculationNotes||'');row.userNotes=row.calculationNotes&&cost.notes.endsWith(suffix)?cost.notes.slice(0,-suffix.length):cost.notes;}}newEditor();glassRows();pieceRows();renderBudget();setMode(mode);dialog.showModal();},load(p){saved=Array.isArray(p)?clone(p):[];if(!p){glasses=[{width:0,height:0,margin:0,qty:1}];$('roll_overlap').value=0;$('roll_panelGap').value=5;pieces=[{width:0,height:0,qty:0,label:''}];for(const k of ['width','height','qty','margin','bleed'])$('roll_'+k).value=0;}},readSaved(){return saved.length?clone(saved):null;}};
})();
