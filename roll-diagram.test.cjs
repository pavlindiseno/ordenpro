const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),core=require('./roll-core');
const src=fs.readFileSync('roll-ui.js','utf8'),ctx={dec:n=>String(n),esc:s=>String(s)};
vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('function diagram('),src.indexOf('function calculate(')),ctx);
const r=core.panelsBatch({roll:25,overlap:0,gap:5,orientation:'vertical',glasses:[{width:100,height:100,qty:1,margin:0}]});
assert.equal(r.pieceCount,4);
for(let i=0;i<4;i++){assert.equal(r.placed[i].glassWidth,100);assert.equal(r.placed[i].glassHeight,100);assert.equal(r.placed[i].part,i+1);assert.equal(r.placed[i].parts,4);}
const svg=ctx.diagram(r);
for(let i=1;i<=4;i++){assert.ok(svg.includes('Paño '+i));assert.ok(svg.includes('Parte '+i+' de 4'));}
assert.ok(svg.includes('Cristal 1000 × 1000 mm'));assert.ok(svg.includes('Corte: 250 × 1000 mm'));
const overlap=core.panelsBatch({roll:120,overlap:2,gap:5,orientation:'vertical',glasses:[{width:200,height:100,qty:1,margin:2}]});
const marked=ctx.diagram(overlap);
assert.match(marked,/data-mark="margin-start"[^>]*stroke-dasharray/);
assert.match(marked,/data-mark="overlap"[^>]*stroke="#111827"[^>]*stroke-dasharray/);
assert.ok(marked.includes('Corte: 860 × 1040 mm'));assert.ok(marked.includes('Solape: 20 mm'));
console.log('Diagram labels: source glass, part index, cut dimensions, dashed margin and overlap boundaries passed');

assert.ok(!marked.includes('data-mark="margin"'));
assert.ok(svg.indexOf('Cristal 1000 × 1000 mm')<svg.indexOf('Paño 1'));
assert.ok(ctx.panelSummary(r).includes('4 paños de 250 × 1000 mm'));
assert.ok(ctx.panelSummary(overlap).includes('1 paño de 1200 × 1040 mm + 1 paño de 860 × 1040 mm'));

const pieces=core.pack({roll:12,gap:5,bleed:2,rotate:true,pieces:[{width:5,height:3,qty:2}]});
const bsvg=ctx.diagram(pieces);
assert.equal((bsvg.match(/data-mark="bleed-cut"/g)||[]).length,2);
assert.match(bsvg,/data-mark="bleed-cut"[^>]*stroke="#dc2626"[^>]*stroke-dasharray/);
assert.ok(bsvg.includes('Sangrado: 2 mm por lado'));
assert.ok(bsvg.includes('Impresión: 54 × 34 mm')||bsvg.includes('Impresión: 34 × 54 mm'));
assert.ok(!ctx.diagram(core.pack({roll:12,gap:5,bleed:0,pieces:[{width:5,height:3,qty:1}]})).includes('data-mark="bleed-cut"'));

const rotatedDiagram=ctx.diagram({mode:'panels',roll:120,length:1,placed:[{x:0,y:0,width:100,height:80,glassWidth:200,glassHeight:100,part:2,parts:2,margin:2,trim:{left:2,right:2,top:0,bottom:2},overlapTop:2,overlapBottom:0}]});
assert.match(rotatedDiagram,/data-mark="overlap" x1="[^"]+" x2="[^"]+" y1="5.6" y2="5.6"/);
assert.ok(rotatedDiagram.includes('Solape: 20 mm'));
const circles=core.pack({roll:12,labelShape:'round',pieceOrientation:'mixed',pieces:[{width:2,height:9,qty:6,gap:3,bleed:2}]});
assert.equal(circles.pieceCount,6);
for(const p of circles.placed){assert.equal(p.shape,'round');assert.equal(p.width,2);assert.equal(p.height,2);}
assert.ok(Math.abs(circles.glassArea-6*Math.PI/10000)<1e-9);
const circleSvg=ctx.diagram(circles);
assert.equal((circleSvg.match(/<ellipse data-mark="bleed-cut"/g)||[]).length,6);
assert.match(circleSvg,/<ellipse data-mark="bleed-cut"[^>]*stroke-width=".7"[^>]*vector-effect="non-scaling-stroke"/);
assert.ok(circleSvg.includes('Redonda · Ø 20 mm'));
assert.match(bsvg,/<rect data-mark="bleed-cut"[^>]*stroke-width=".7"[^>]*vector-effect="non-scaling-stroke"/);
console.log('Round label area, circular bleed, diameter and fixed fine stroke passed');
