const assert=require('node:assert/strict'),core=require('./plotter-core');
const base={kind:'textile',textileMode:'totals',smallQty:3,largeQty:2,smallPrice:4,largePrice:6,clothingSource:'client',garmentQty:0};
let r=core.calculate(base);assert.equal(r.smallAmount,12);assert.equal(r.largeAmount,12);assert.equal(r.total,24);
assert.equal(core.calculate({...base,smallPrice:3,largePrice:5}).total,19);
assert.equal(core.calculate({...base,garmentQty:10,garmentPrice:15,clothingSource:'client'}).garmentAmount,0);
const garments={...base,textileMode:'garments',garmentType:'camiseta',garmentQty:10,front:'small',back:'large'};
r=core.calculate(garments);assert.equal(r.smallQty,10);assert.equal(r.largeQty,10);assert.equal(r.total,100);
assert.equal(core.calculate({...garments,front:'small',back:'small'}).total,80);
assert.equal(core.calculate({...garments,front:'large',back:'none'}).total,60);
assert.equal(core.calculate({...garments,garmentType:'sudadera',clothingSource:'ours',garmentPrice:12}).total,220);
assert.equal(core.calculate({...base,smallQty:0,largeQty:0,clothingSource:'ours',garmentQty:2,garmentPrice:15}).total,30);
for(const p of [{...base,smallQty:-1},{...base,largeQty:1.5},{...base,smallPrice:''},{...base,largePrice:-1},{...base,smallQty:0,largeQty:0},{...garments,garmentQty:0},{...garments,front:'bad'},{...garments,clothingSource:'ours',garmentPrice:-1}])assert.throws(()=>core.calculate(p));
const saved={version:2,items:[{...garments,id:'textile1',result:core.calculate(garments)}]};assert.deepEqual(core.migrate(saved),saved.items);
console.log('Textile totals, editable rates, per-garment sides, client/own garments, optional type, input validation and persistence passed');

assert.equal(core.calculate({...garments,clothingSource:'ours',garmentPrice:''}).total,100);
