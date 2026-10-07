const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,textContent:'',innerHTML:'',classList:{toggle(){}},addEventListener(type,fn){const old=this[type];this[type]=old?(...args)=>{old(...args);fn(...args);}:fn;}});return elements.get(id);};
let rows=[{name:'Montaje',amount:'12'},{name:'Revistas · Papel interior',amount:'999'}],loads=0;
const context={console,OrdenProMagazine:require('./magazine-core.js'),document:{getElementById:get,createElement(){return {style:{},showModal(){loads++;},close(){}};},body:{append(){}}},confirm:()=>true,collectCustomCostRows:()=>rows,resetCustomCostRows:()=>{rows=[];},addCustomCostRow:r=>rows.push(r),updateImpresionesDisplay:()=>{},updateCostTotals:()=>{}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/magazine-ui.js','utf8'),context);
context.ordenproMagazineUI.open();assert.equal(loads,1);assert.equal(get('mag_coverPrice').value,81);get('mag_form').onsubmit({preventDefault(){}});assert.equal(rows.length,5);assert.equal(rows[0].name,'Montaje');assert.equal(get('printColorQty').value,900);assert.equal(context.ordenproMagazineUI.readSaved().result.hits,900);
context.ordenproMagazineUI.open();get('mag_form').onsubmit({preventDefault(){}});assert.equal(rows.length,5); // no duplicate generated lines
context.ordenproMagazineUI.load(null);assert.equal(context.ordenproMagazineUI.readSaved(),null);
get('mag_format').value='16x22';get('mag_format').change();assert.equal(get('mag_innerW').value,52);assert.equal(get('mag_innerH').value,70);assert.equal(get('mag_covers').value,1);
console.log('Magazine UI: apply, reopen, reset and replace passed');
context.ordenproMagazineUI.load({format:'A5',pages:32,innerMode:'bw'});context.ordenproMagazineUI.open();assert.equal(get('mag_colorPages').value,0);assert.equal(get('mag_bwPages').value,32);
get('mag_colorPages').value=8;get('mag_bwPages').value=24;get('mag_colorFaces').value='';const before=rows.length;get('mag_form').onsubmit({preventDefault(){}});assert.equal(rows.length,before);
get('mag_colorFaces').value=2;get('mag_form').onsubmit({preventDefault(){}});assert.equal(get('printBWQty').value,600);
console.log('Mixed UI and legacy migration: passed');
context.ordenproMagazineUI.load(null);context.ordenproMagazineUI.open();assert.equal(get('mag_designPrice').value,5);assert.equal(get('mag_designEnabled').checked,true);get('mag_form').onsubmit({preventDefault(){}});assert.equal(rows.find(r=>r.name==='Revistas · Diseño').amount,'160.00');
get('mag_designEnabled').checked=false;get('mag_form').onsubmit({preventDefault(){}});assert.equal(rows.some(r=>r.name==='Revistas · Diseño'),false);
context.ordenproMagazineUI.load({format:'A5',pages:32,innerMode:'bw'});context.ordenproMagazineUI.open();assert.equal(get('mag_designEnabled').checked,false);
console.log('Design UI and existing estimate preservation: passed');
