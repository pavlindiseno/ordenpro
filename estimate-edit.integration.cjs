// Integration check: requires jsdom (npm install --no-save jsdom).
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=__dirname+'/';
const dom=new JSDOM('<body><div id="customCostRows"></div><p id="emptyCustomCost"></p><span id="customCostTotalAmount"></span><input id="jobTitle"><input id="jobQuantity"></body>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.alert=m=>{throw Error(m)};w.confirm=()=>true;w.TextEncoder=TextEncoder;
w.escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
w.getVinylRowField=(type,rowId,field)=>d.querySelector('[data-row="'+type+'_'+rowId+'"][data-field="'+field+'"]')?.value||'';
w.updateCostTotals=()=>{w.computeCustomCostTotal();};
const html=fs.readFileSync(root+'index.html','utf8');
w.eval(html.slice(html.indexOf('let customCostRowIds ='),html.indexOf('// Suma un array de filas "Otros"')));
for(const file of ['plotter-core.js','plotter-ui.js','roll-core.js','roll-cut-pdf.js','roll-ui.js'])w.eval(fs.readFileSync(root+file,'utf8'));
const put=(id,value)=>{const e=d.getElementById(id);if(typeof value==='boolean')e.checked=value;else e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));return e;};
const glass=(i,k,val)=>{const e=d.querySelector('[data-glass="'+i+'"][data-glass-key="'+k+'"]');e.value=val;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
const submit=()=>d.getElementById('plt_form').dispatchEvent(new w.Event('submit',{cancelable:true}));
w.addCustomCostRow({name:'Instalación manual',amount:30,notes:'Conservar'});
w.ordenproRollUI.load(null);w.ordenproRollUI.open();
glass(0,'width',700);glass(0,'height',1000);glass(0,'margin',20);
d.getElementById('roll_addGlass').click();glass(1,'width',500);glass(1,'height',400);
put('roll_price',35);d.getElementById('roll_addBudget').click();d.getElementById('roll_apply').click();
let rows=w.collectCustomCostRows();assert.equal(rows.length,2);let rollRow=rows.find(r=>r.estimator==='roll');assert.ok(rollRow);const id=rollRow.estimateId;
let saved=w.ordenproRollUI.readSaved();const originalParams=JSON.stringify(saved[0].p),originalPrice=+rollRow.amount;
let el=d.querySelector('[data-estimate-id="'+id+'"]');assert.ok(el.textContent.includes('Editar partida'));assert.ok(el.textContent.includes('PDF de corte'));
w.editEstimatedCostRow(el.id.replace('row_customCost_',''));
assert.equal(d.getElementById('roll_price').value,'35');
assert.equal(d.querySelector('[data-glass="0"][data-glass-key="margin"]').value,'20');
assert.equal(d.querySelector('[data-glass="1"][data-glass-key="width"]').value,'500');
put('roll_price',25);d.getElementById('roll_addBudget').click();
rows=w.collectCustomCostRows();assert.equal(rows.length,2);rollRow=rows.find(r=>r.estimator==='roll');assert.equal(rollRow.estimateId,id);assert.ok(+rollRow.amount<originalPrice);
saved=w.ordenproRollUI.readSaved();assert.equal(saved[0].price,25);assert.equal(JSON.stringify(saved[0].p),originalParams);assert.equal(d.getElementById('rollDialog').open,false);
// Saved JSON can be reopened, edited in size/material and exported from the fresh parameters.
const stored=JSON.parse(JSON.stringify({rows,roll:saved}));
w.resetCustomCostRows();w.ordenproRollUI.load(stored.roll);stored.rows.forEach(r=>w.addCustomCostRow(r));
assert.ok(w.ordenproRollUI.editSaved(id));glass(0,'width',800);
const otherMaterial=Array.from(d.getElementById('roll_material').options).find(o=>o.value!==d.getElementById('roll_material').value);
d.getElementById('roll_material').value=otherMaterial.value;d.getElementById('roll_material').dispatchEvent(new w.Event('change'));put('roll_price',26);d.getElementById('roll_addBudget').click();
saved=w.ordenproRollUI.readSaved();assert.equal(saved[0].p.glasses[0].width,80);assert.equal(saved[0].material,+otherMaterial.value);
let captured=null;w.OrdenProCutPDF.download=(r)=>{captured=w.OrdenProCutPDF.build(r);return captured;};
el=d.querySelector('[data-estimate-id="'+id+'"]');w.downloadEstimatedCostRow(el.id.replace('row_customCost_',''));
assert.equal(captured.contours.length,saved[0].result.pieceCount);assert.ok(captured.contours.some(c=>c.width===840||c.height===840));
// Cancelling never overwrites the applied price.
w.ordenproRollUI.editSaved(id);put('roll_price',1);d.getElementById('roll_cancelEdit').click();assert.equal(w.ordenproRollUI.readSaved()[0].price,26);
// Duplicate labels stay linked by ID, even if a visible name is renamed.
w.ordenproRollUI.open();d.querySelector('#roll_budgetRows [data-duplicate="0"]').click();d.getElementById('roll_apply').click();
rows=w.collectCustomCostRows().filter(r=>r.estimator==='roll');assert.equal(rows.length,2);assert.notEqual(rows[0].estimateId,rows[1].estimateId);
el=d.querySelector('[data-estimate-id="'+rows[1].estimateId+'"]');el.querySelector('[data-field="name"]').value='Nombre personalizado';
const otherEl=d.querySelector('[data-estimate-id="'+rows[0].estimateId+'"]');otherEl.querySelector('[data-field="amount"]').value='123.45';const otherId=otherEl.id;
w.editEstimatedCostRow(el.id.replace('row_customCost_',''));put('roll_price',22);d.getElementById('roll_addBudget').click();assert.equal(w.collectCustomCostRows().length,3);assert.equal(d.getElementById(otherId).querySelector('[data-field="amount"]').value,'123.45');
// Standard plotter material and plate entries also edit directly.
w.ordenproPlotterUI.open();d.querySelector('[data-category="materials"]').click();
put('plt_qty',1);put('plt_width',860);put('plt_height',2000);put('plt_price',35);put('plt_notes','Cliente amiga');submit();d.getElementById('plt_apply').click();
let plt=w.collectCustomCostRows().find(r=>r.estimator==='plotter');assert.ok(plt);
let pltId=plt.estimateId;el=d.querySelector('[data-estimate-id="'+pltId+'"]');w.editEstimatedCostRow(el.id.replace('row_customCost_',''));
assert.equal(d.getElementById('plt_width').value,'860');assert.equal(d.getElementById('plt_price').value,'35');put('plt_price',25);submit();
assert.equal(d.getElementById('plotterDialog').open,false);
plt=w.collectCustomCostRows().find(r=>r.estimator==='plotter');assert.equal(+plt.amount,43);assert.equal(plt.notes,'Cliente amiga');assert.equal(w.ordenproPlotterUI.readSaved().items[0].id,pltId);
// Deletion removes saved geometry so it cannot be resurrected on the next apply.
el=d.querySelector('[data-estimate-id="'+id+'"]');w.removeCustomCostRow(el.id.replace('row_customCost_',''));assert.equal(w.ordenproRollUI.readSaved().length,1);
el=d.querySelector('[data-estimate-id="'+pltId+'"]');w.removeCustomCostRow(el.id.replace('row_customCost_',''));assert.equal(w.ordenproPlotterUI.readSaved(),null);
assert.ok(w.collectCustomCostRows().find(r=>r.name==='Instalación manual'));
// Older budgets without metadata acquire editable links; duplicate names map independently.
const legacyRoll=JSON.parse(JSON.stringify(stored.roll));w.ordenproRollUI.load(legacyRoll);w.ordenproPlotterUI.load({version:2,items:[{product:0,qty:1,price:25,width:0,height:0,result:{total:25},label:'Antigua',notes:'Conservar'}]});
w.resetCustomCostRows();w.addCustomCostRow({name:'Bobina · '+legacyRoll[0].label,amount:10});w.addCustomCostRow({name:'Plotter · Antigua',amount:25});
rows=w.collectCustomCostRows();assert.equal(rows[0].estimator,'roll');assert.equal(rows[1].estimator,'plotter');assert.ok(w.ordenproPlotterUI.editSaved(rows[1].estimateId));assert.equal(d.getElementById('plt_price').value,'25');
console.log('PASS: apply, direct price edit, retained glass dimensions, material/size changes, fresh PDF, cancellation, duplicates, deletion, standard plotter, JSON reload and legacy references');
