// Integration check: requires jsdom (npm install --no-save jsdom).
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),root=__dirname+'/';
const html=fs.readFileSync(root+'index.html','utf8');
const dom=new JSDOM('<body><div id="customCostRows"></div><p id="emptyCustomCost"></p><span id="customCostTotalAmount"></span><input id="jobTitle"><input id="jobQuantity">'+['vinylPoly','vinylMono','vinylCut','vinylLam'].map(t=>'<div id="'+t+'Rows"></div><span id="'+t+'TotalAmount"></span>').join('')+'</body>',{runScripts:'outside-only'});
const w=dom.window,d=w.document;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.alert=m=>{throw Error(m)};w.confirm=()=>true;
w.escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
w.updateCostTotals=()=>{};
w.eval(html.slice(html.indexOf('let vinylRowIds ='),html.indexOf('function getCostValues()')));
for(const f of ['plotter-core.js','plotter-ui.js'])w.eval(fs.readFileSync(root+f,'utf8'));
const put=(id,value)=>{const e=d.getElementById(id);if(typeof value==='boolean')e.checked=value;else e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}));return e;};
const submit=()=>d.getElementById('plt_form').dispatchEvent(new w.Event('submit',{cancelable:true}));
w.ordenproPlotterUI.open();d.querySelector('[data-category="materials"]').click();
assert.equal(d.getElementById('plt_billingBasis').value,'surface');assert.equal(d.getElementById('plt_rollWidth').value,'1200');
put('plt_qty',1);put('plt_width',225);put('plt_height',3000);put('plt_price',21);put('plt_billingBasis','consumed');put('plt_rollWidth',1000);
assert.equal(d.getElementById('plt_stockBlock').hidden,false);
assert.ok(d.getElementById('plt_hint').textContent.includes('3.000 m²'));submit();d.getElementById('plt_apply').click();
let rows=w.collectCustomCostRows(),line=rows[0];assert.equal(+line.amount,63);assert.ok(line.notes.includes('desperdicio'));
let saved=w.ordenproPlotterUI.readSaved();assert.equal(saved.items[0].rollWidth,100);assert.equal(saved.items[0].billingBasis,'consumed');
const keep=JSON.parse(JSON.stringify({rows,saved}));w.resetCustomCostRows();w.ordenproPlotterUI.load(keep.saved);keep.rows.forEach(r=>w.addCustomCostRow(r));
w.ordenproPlotterUI.editSaved(line.estimateId);assert.equal(d.getElementById('plt_rollWidth').value,'1000');assert.equal(d.getElementById('plt_billingBasis').value,'consumed');
assert.equal(d.getElementById('plt_notes').value,'');put('plt_billingBasis','surface');submit();rows=w.collectCustomCostRows();assert.equal(+rows[0].amount,14.18);
w.ordenproPlotterUI.open();d.querySelector('[data-category="plates"]').click();put('plt_qty',1);put('plt_billingBasis','consumed');submit();d.getElementById('plt_apply').click();
saved=w.ordenproPlotterUI.readSaved();assert.equal(saved.items[1].billingBasis,'surface');assert.ok(!w.collectCustomCostRows()[1].notes.includes('desperdicio'));
// Every legacy vinyl/lamination row supports the same billing choice and retains the original metre storage.
for(const type of ['vinylPoly','vinylMono','vinylCut','vinylLam']){
 w.addVinylRow(type,{width:.225,length:3,price:21});
 assert.equal(w.computeVinylTypeTotal(type),14.175);
 const row=d.getElementById(type+'Rows').lastElementChild;
 row.querySelector('[data-field="billingBasis"]').value='consumed';row.querySelector('[data-field="rollWidth"]').value=1000;
 assert.equal(w.computeVinylTypeTotal(type),63);
 const data=w.collectVinylRows(type);assert.equal(data[0].rollWidth,1);assert.equal(data[0].billingBasis,'consumed');
 assert.equal(w.sumVinylRows(JSON.parse(JSON.stringify(data))),63);
 row.querySelector('[data-field="rollWidth"]').value=10;
 assert.equal(w.computeVinylTypeTotal(type),0);assert.ok(row.querySelector('[data-amount]').innerText.includes('no cabe'));
 row.querySelector('[data-field="rollWidth"]').value=1000;
 assert.equal(w.computeVinylTypeTotal(type),63);
}
const printBlock=html.slice(html.indexOf('            const vinylLabels ='),html.indexOf("            const otherRow = document.getElementById('printOtherCostRow')"));
const order={vinylPolyRows:[{width:.225,length:3,price:21,billingBasis:'consumed',rollWidth:1}]};
w.order=order;w.eval(printBlock.replace("document.getElementById('printVinylRows').innerHTML = vinylHtml;","window.printResult=vinylHtml;"));
assert.ok(w.printResult.includes('63.00 €'));assert.ok(w.printResult.includes('3.000 m²'));
console.log('PASS: waste billing UI, per-line choice/stock dimensions, JSON reopen, editable choice, fixed plates, all four legacy vinyl types and printed totals');
