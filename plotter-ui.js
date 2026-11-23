(function(){
'use strict';
const $=id=>document.getElementById(id),money=n=>n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €',clone=x=>JSON.parse(JSON.stringify(x));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved=null,items=[],editing=-1,directEdit=false;
const uid=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
function withIds(list){return list.map(p=>({...p,id:p.id||uid()}));}
const defaults={product:0,qty:0,width:0,height:0,price:21,laminate:false,lamPrice:18,withEyelets:false,eyelets:0,withHanger:false,hangers:0,frame:false,notes:'',billingBasis:'surface',stockSource:'roll',rollWidth:120,stockHeight:200};
const cls='w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100';
function field(k,label){return '<label class="block text-xs text-slate-300">'+label+'<input id="plt_'+k+'" type="number" min="0" step="any" class="'+cls+'"></label>';}
function select(k,label){return '<label class="block text-sm">'+label+'<select id="plt_'+k+'" class="'+cls+'"></select></label>';}
const dialog=document.createElement('dialog');dialog.id='plotterDialog';dialog.className='bg-slate-800 text-slate-100 rounded-xl border border-slate-600 p-4 w-full max-w-2xl';dialog.style.maxHeight='90vh';dialog.style.overflowY='auto';
dialog.innerHTML='<div class="flex justify-between mb-3"><h2 class="text-lg font-semibold text-emerald-400">Partidas de plotter</h2><button type="button" id="plt_close" aria-label="Cerrar">✕</button></div><div class="flex flex-wrap gap-2 mb-4" id="plt_tabs"><button type="button" data-category="plates">Placas, lienzos y metacrilatos</button><button type="button" data-category="materials">Materiales por m²</button><button type="button" data-category="rollup">Roll-ups</button></div><form id="plt_form"><div id="plt_familyBlock" class="mb-3">'+select('family','Material')+'</div><div class="mb-3">'+select('product','Producto y formato')+'</div><div class="grid grid-cols-2 gap-3">'+field('qty','Cantidad de piezas')+field('price','Precio tarifa editable (€)')+'</div><div id="plt_measureBlock" class="grid grid-cols-2 gap-3 mt-3">'+field('width','Ancho de cada pieza (mm)')+field('height','Alto de cada pieza (mm)')+'</div><div id="plt_billingBlock" class="mt-3"><label class="block text-xs text-slate-300">Material que se cobra<select id="plt_billingBasis" class="'+cls+'"><option value="surface">Solo material usado (superficie de las piezas)</option><option value="consumed">Material usado + desperdicio</option></select></label><div id="plt_stockBlock" class="mt-3"><label class="block text-xs">Material de origen<select id="plt_stockSource" class="'+cls+'"><option value="roll">Bobina</option><option value="sheet">Plancha completa</option></select></label><div class="grid grid-cols-2 gap-3 mt-3">'+field('rollWidth','Ancho bobina / plancha (mm)')+'<div id="plt_stockHeightBlock">'+field('stockHeight','Alto plancha (mm)')+'</div></div><p class="text-xs text-slate-400 mt-2">Se cobra el ancho completo de bobina consumido o las planchas completas necesarias. Las piezas iguales se aprovechan en filas, comparando ambos sentidos. Para distribuir varios modelos, usa Bobinas.</p></div></div><p id="plt_hint" class="text-xs text-amber-300 mt-2"></p><div id="plt_hangerBlock" class="mt-3"><label><input type="checkbox" id="plt_withHanger"> Con colgador · 6 €/unidad</label><div id="plt_hangerCount">'+field('hangers','Colgadores totales de esta partida')+'</div></div><div id="plt_frameBlock" class="mt-3"><label><input type="checkbox" id="plt_frame"> Con bastidor · 0,01 €/mm</label></div><div id="plt_eyeletBlock" class="mt-3"><label><input type="checkbox" id="plt_withEyelets"> Con ojales · 1 €/unidad</label><div id="plt_eyeletCount">'+field('eyelets','Ojales totales de esta partida')+'</div></div><div id="plt_lamBlock" class="mt-3"><label><input type="checkbox" id="plt_laminate"> Añadir laminado (si no está incluido)</label><div id="plt_lamPriceBlock">'+field('lamPrice','Laminado adicional (€/m²)')+'</div></div><label class="block text-sm mt-4">Descripción y observaciones de esta partida<textarea id="plt_notes" rows="3" placeholder="Ej: Pegatinas para escaparate; lienzo con foto familiar…" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"></textarea></label><div id="plt_result" aria-live="polite" class="bg-slate-900 rounded-lg p-3 my-3"></div><div class="flex gap-2"><button type="submit" id="plt_add" class="bg-emerald-600 rounded-lg px-4 py-2 font-semibold">Añadir partida</button><button type="button" id="plt_cancelEdit" hidden>Cancelar edición</button></div></form><h3 class="text-emerald-400 mt-5 mb-2">Partidas de este trabajo</h3><div id="plt_items"></div><p id="plt_total" class="font-bold my-3"></p><p class="text-xs text-slate-400 my-3">Precios antes de IVA. El descuento del trabajo se aplica al final del presupuesto completo.</p><button type="button" id="plt_apply" class="bg-amber-600 rounded-lg px-4 py-2 font-semibold">Aplicar partidas al presupuesto</button>';document.body.append(dialog);
const rollLaunch=document.createElement('button');rollLaunch.type='button';rollLaunch.textContent='Bobinas · cristales / piezas / etiquetas';rollLaunch.className='bg-blue-600 rounded-lg px-3 py-2 text-sm mb-4 w-full';rollLaunch.onclick=()=>{dialog.close();window.ordenproRollUI.open();};dialog.querySelector?.('#plt_tabs')?.after(rollLaunch);
let category='plates';
function options(el,arr,value){el.innerHTML=arr.map(([v,t])=>'<option value="'+escape(v)+'">'+escape(t)+'</option>').join('');el.value=value!=null&&arr.some(([v])=>String(v)===String(value))?value:arr[0]?.[0]??'';}
function setCategory(c,id){
 category=c;
 options($('plt_family'),[['PVC','PVC'],['Glaspack','Glaspack'],['Alupanel','Alupanel'],['Imán','Imán'],['Metacrilato','Metacrilato'],['Lienzo','Lienzos']],id!=null?OrdenProPlotter.products[+id]?.family:null);
 chooseProducts(id);
 for(const b of $('plt_tabs').querySelectorAll('button')){b.className='rounded-lg px-3 py-2 text-xs '+(b.dataset.category===c?'bg-emerald-600':'bg-slate-700');b.setAttribute('aria-pressed',b.dataset.category===c);}
}
function chooseProducts(id){
 const arr=OrdenProPlotter.products.map((p,i)=>[i,p]).filter(([i,p])=>!p.retired&&p.category===category&&(category!=='plates'||p.family===$('plt_family').value)).map(([i,p])=>[i,mmText(category==='plates'?p.name+' · '+p.size:p.name)+' · '+(p.price==null?'precio pendiente':p.price+' €/'+p.unit)]);
 options($('plt_product'),arr,id);resetProduct();
}
function resetProduct(){const p=OrdenProPlotter.products[+$('plt_product').value];$('plt_price').value=p?.price??'';for(const k of ['withHanger','withEyelets','frame','laminate'])$('plt_'+k).checked=false;$('plt_hangers').value=$('plt_qty').value||0;preview();}
const mmText=s=>String(s).replace(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(cm|m)\b/g,(_,a,b,u)=>(Number(a.replace(',','.'))*(u==='cm'?10:1000))+' × '+(Number(b.replace(',','.'))*(u==='cm'?10:1000))+' mm');
function read(){const p=Object.fromEntries(Object.keys(defaults).map(k=>[k,typeof defaults[k]==='boolean'?$('plt_'+k).checked:$('plt_'+k).value]));p.width=+p.width/10;p.height=+p.height/10;p.rollWidth=+p.rollWidth/10;p.stockHeight=+p.stockHeight/10;if(OrdenProPlotter.products[+p.product]?.unit!=='m²')p.billingBasis='surface';return p;}
function display(id,on){$(id).hidden=!on;$(id).style.display=on?'':'none';}
function preview(){
 const product=OrdenProPlotter.products[+$('plt_product').value],canvas=product?.family==='Lienzo'||product?.name==='Lienzo';
 display('plt_familyBlock',category==='plates');display('plt_measureBlock',product?.unit==='m²');
 display('plt_hangerBlock',category==='plates'&&!canvas);display('plt_hangerCount',$('plt_withHanger').checked);
 display('plt_frameBlock',!!canvas);display('plt_eyeletBlock',product?.name==='Lona');display('plt_eyeletCount',$('plt_withEyelets').checked);
 display('plt_billingBlock',product?.unit==='m²');display('plt_stockBlock',$('plt_billingBasis').value==='consumed');display('plt_stockHeightBlock',$('plt_stockSource').value==='sheet');
 display('plt_lamBlock',category==='materials');display('plt_lamPriceBlock',$('plt_laminate').checked);
 try{const p=read(),r=OrdenProPlotter.calculate(p);$('plt_hint').textContent=product.unit==='m²'?'Superficie de piezas: '+r.area.toFixed(3)+' m² · Superficie cobrada: '+r.billedArea.toFixed(3)+' m²'+(p.billingBasis==='consumed'?' · Desperdicio: '+r.wasteArea.toFixed(3)+' m²'+(r.source==='sheet'?' · '+r.sheets+' planchas':' · '+(r.runLength*10).toFixed(0)+' mm de bobina'):''):'Tarifa por unidad del formato seleccionado';$('plt_result').textContent='Producto: '+money(r.base)+(r.frame?' · Bastidor: '+(r.frameMeters*1000).toFixed(0)+' mm × 0,01 € = '+money(r.frame):'')+(r.hangers?' · Colgadores: '+r.hangers+' × 6 €':'')+(r.eyelets?' · Ojales: '+r.eyelets+' × 1 €':'')+(r.lamination?' · Laminado: '+money(r.lamination):'')+' · Total: '+money(r.total);return {p,r};}catch(e){$('plt_result').textContent=+$('plt_qty').value===0?'Total: 0,00 € · Introduce la cantidad y las medidas.':e.message;return null;}
}
function label(p,r){const product=OrdenProPlotter.products[+p.product];return mmText(product.name+(product.size?' · '+product.size:product.unit==='m²'?' · '+(+p.width*10)+' × '+(+p.height*10)+' mm':''))+' · '+p.qty+' piezas'+(r.frame?' · bastidor '+(r.frameMeters*1000).toFixed(0)+' mm':'')+(r.hangers?' · '+r.hangers+' colgadores':'')+(r.eyelets?' · '+r.eyelets+' ojales':'')+(r.lamination?' · laminado adicional':'')+(p.billingBasis==='consumed'?' · material + desperdicio':'');}
function billingNotes(p){
 if(p.billingBasis!=='consumed')return '';
 const r=p.result;return 'Material usado + desperdicio: '+r.area.toFixed(3)+' m² de piezas + '+r.wasteArea.toFixed(3)+' m² de desperdicio = '+r.billedArea.toFixed(3)+' m² cobrados. '+(r.source==='sheet'?r.sheets+' planchas de '+(+p.rollWidth*10)+' × '+(+p.stockHeight*10)+' mm.':'Bobina de '+(+p.rollWidth*10)+' mm × '+(r.runLength*10).toFixed(0)+' mm de largo.')+' Tarifa: '+p.price+' €/m².';
}
function costNotes(p){return [p.notes,billingNotes(p)].filter(Boolean).join('\n');}
function render(){
 $('plt_items').innerHTML=items.map((p,i)=>'<div class="bg-slate-900 rounded-lg p-3 mb-2"><details><summary class="cursor-pointer">'+escape(mmText(p.label))+' — '+money(p.result.total)+'</summary><p class="text-sm mt-2 whitespace-pre-wrap">'+escape(p.notes||'Sin observaciones')+'</p></details><div class="flex flex-wrap gap-3 mt-2 text-xs"><button type="button" data-action="edit" data-index="'+i+'">Editar</button><button type="button" data-action="duplicate" data-index="'+i+'">Duplicar</button><button type="button" data-action="delete" data-index="'+i+'">Eliminar</button></div></div>').join('')||'<p class="text-sm text-slate-400">Añade la primera partida.</p>';
 $('plt_total').textContent='Total de partidas: '+money(items.reduce((n,p)=>n+p.result.total,0));
}
function resetEditor(){editing=-1;for(const k of Object.keys(defaults)){if(typeof defaults[k]==='boolean')$('plt_'+k).checked=defaults[k];else $('plt_'+k).value=['rollWidth','stockHeight'].includes(k)?defaults[k]*10:defaults[k];}$('plt_add').textContent='Añadir partida';$('plt_cancelEdit').hidden=true;setCategory(category);}
$('plt_tabs').addEventListener('click',e=>{if(e.target.dataset.category){editing=-1;$('plt_add').textContent='Añadir partida';$('plt_cancelEdit').hidden=true;setCategory(e.target.dataset.category);}});
$('plt_family').addEventListener('change',()=>chooseProducts());$('plt_product').addEventListener('change',resetProduct);$('plt_form').addEventListener('input',preview);
$('plt_qty').addEventListener('change',()=>{if(!$('plt_withHanger').checked)$('plt_hangers').value=$('plt_qty').value;});
$('plt_close').onclick=()=>{directEdit=false;dialog.close();};$('plt_cancelEdit').onclick=()=>{resetEditor();if(directEdit){directEdit=false;dialog.close();}};
$('plt_form').onsubmit=e=>{e.preventDefault();const result=preview();if(!result)return;const item={...result.p,id:editing<0?uid():items[editing].id,result:result.r,label:label(result.p,result.r)};if(editing<0)items.push(item);else items[editing]=item;render();resetEditor();if(directEdit){
 directEdit=false;
 if(window.replaceEstimatedCostRow?.('plotter',item.id,{name:'Plotter · '+item.label,amount:item.result.total.toFixed(2),notes:costNotes(item)})){saved={version:2,items:clone(items)};dialog.close();}
 else $('plt_apply').onclick();
 }};
$('plt_items').addEventListener('click',e=>{
 const a=e.target.dataset.action,i=+e.target.dataset.index;if(!a||!items[i])return;
 if(a==='delete'){items.splice(i,1);resetEditor();render();return;}
 if(a==='duplicate'){items.push({...clone(items[i]),id:uid()});render();return;}
 editEntry(i);
});
function editEntry(i){
 const p=items[i],product=OrdenProPlotter.products[+p.product];
 if(p.legacy&&!confirm('Esta partida conserva el importe anterior. Al editarla se recalculará con las opciones actuales. ¿Continuar?'))return;
 setCategory(product&&!product.retired?product.category:'materials',product&&!product.retired?p.product:null);
 for(const k of Object.keys(defaults)){if(k==='product')continue;const v=p[k]??defaults[k];if(typeof defaults[k]==='boolean')$('plt_'+k).checked=v;else $('plt_'+k).value=['width','height','rollWidth','stockHeight'].includes(k)?+v*10:v;}
 editing=i;$('plt_add').textContent=directEdit?'Guardar cambios':'Guardar partida';$('plt_cancelEdit').hidden=false;preview();
}
$('plt_apply').onclick=()=>{
 if(editing>=0){alert('Guarda o cancela la edición de la partida antes de aplicar.');return;}
 if(!items.length&&!saved){alert('Añade una partida al presupuesto.');return;}
 const keep=collectCustomCostRows().filter(row=>row.estimator!=='plotter'&&!row.name.startsWith('Plotter · '));resetCustomCostRows();keep.forEach(addCustomCostRow);
 for(const p of items)addCustomCostRow({name:'Plotter · '+p.label,amount:p.result.total.toFixed(2),notes:costNotes(p),estimator:'plotter',estimateId:p.id});
 saved=items.length?{version:2,items:clone(items)}:null;
 if(!$('jobTitle').value)$('jobTitle').value='Trabajo de plotter';
 if(!$('jobQuantity').value)$('jobQuantity').value=1;
 updateCostTotals();dialog.close();
};
window.ordenproPlotterUI={open(){directEdit=false;items=withIds(OrdenProPlotter.migrate(saved));const rows=collectCustomCostRows();for(const p of items){const row=rows.find(r=>r.estimator==='plotter'&&r.estimateId===p.id)||rows.find(r=>!r.estimateId&&r.name==='Plotter · '+p.label);if(row?.notes!==undefined){const suffix=billingNotes(p);p.notes=suffix&&row.notes.endsWith(suffix)?row.notes.slice(0,-suffix.length).trimEnd():row.notes;}}resetEditor();render();dialog.showModal();},reference(name,used=[]){const p=saved?.items?.find(r=>name==='Plotter · '+r.label&&!used.includes(r.id));return p?{estimator:'plotter',estimateId:p.id}:null;},
editSaved(id){this.open();const i=items.findIndex(p=>p.id===id);if(i<0){dialog.close();return false;}directEdit=true;editEntry(i);return true;},
removeSaved(id){if(saved){saved.items=saved.items.filter(p=>p.id!==id);if(!saved.items.length)saved=null;}},
load(p){saved=p?{version:2,items:withIds(OrdenProPlotter.migrate(p))}:null;},readSaved(){return saved?clone(saved):null;}};
})();
