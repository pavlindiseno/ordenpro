const assert=require('node:assert/strict'),{pack,panels}=require('./roll-core');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
const r=panels({roll:120,width:285,height:230,overlap:2,margin:0,qty:1,orientation:'best',gap:0});
assert.equal(r.orientation,'horizontal');near(r.length,5.7);near(r.consumedArea,6.84);assert.deepEqual(r.widths,[120,112]);near(r.alternatives.vertical.length,6.9);
const m=panels({roll:120,width:200,height:200,overlap:2,margin:2,qty:1,gap:5,orientation:'vertical'});
near(m.targetW,204);near(m.targetH,204);near(m.length,4.085);assert.deepEqual(m.widths,[120,86]);
assert.equal(panels({roll:120,width:238,height:100,overlap:2,qty:1,orientation:'vertical'}).panelsPerGlass,2);
assert.equal(panels({roll:120,width:238.01,height:100,overlap:2,qty:1,orientation:'vertical'}).panelsPerGlass,3);
assert.throws(()=>panels({roll:120,width:200,height:200,overlap:120,qty:1}));
const p=pack({roll:120,gap:5,margin:0,rotate:true,pieces:[{width:60,height:30,qty:1},{width:30,height:50,qty:1},{width:55,height:35,qty:2}]});
assert.equal(p.pieceCount,4);near(p.glassArea,.715);assert.ok(p.length<=1);
function geometry(r){for(const b of r.placed){assert.ok(b.x>=0&&b.y>=0);assert.ok(b.x+b.width<=r.roll+1e-8);assert.ok(b.y+b.height<=r.length*100+1e-8);}for(let i=0;i<r.placed.length;i++)for(let j=i+1;j<r.placed.length;j++){const a=r.placed[i],b=r.placed[j],g=Math.max(r.gap,2*r.bleed);assert.ok(a.x+a.width+g<=b.x+1e-8||b.x+b.width+g<=a.x+1e-8||a.y+a.height+g<=b.y+1e-8||b.y+b.height+g<=a.y+1e-8);}}
geometry(p);
const labels=pack({roll:120,gap:5,bleed:3,margin:0,rotate:false,pieces:[{width:5,height:5,qty:200}]});geometry(labels);assert.equal(labels.pieceCount,200);near(labels.glassArea,.5);
const offcut=pack({roll:30,gap:0,rotate:true,pieces:[{width:50,height:20,qty:2}]});near(offcut.length,1);assert.throws(()=>pack({roll:30,gap:0,rotate:false,pieces:[{width:50,height:20,qty:1}]}));
let seed=71;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
for(let i=0;i<50;i++){const q=pack({roll:120,gap:10,bleed:2,margin:1,rotate:true,pieces:Array.from({length:5},()=>({width:10+random()*70,height:10+random()*100,qty:1+Math.floor(random()*4)}))});geometry(q);}
console.log('Paños, márgenes, sangrado, separación, rotación y 50 distribuciones sin colisiones: correctos.');
const {panelsBatch}=require('./roll-core');
const batch=panelsBatch({roll:120,margin:1,overlap:0,gap:5,orientation:'vertical',glasses:[{width:60,height:30,margin:''},{width:30,height:50,margin:2}]});
assert.equal(batch.qty,2);near(batch.length,.865);near(batch.consumedArea,1.038);near(batch.glassArea,.33);assert.equal(batch.glassResults[1].margin,2);near(batch.placed[1].y,32.5);
assert.throws(()=>panelsBatch({roll:120,glasses:[]}));
