const assert=require('node:assert/strict'),core=require('./roll-core'),pdf=require('./roll-cut-pdf');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
const glasses=core.panelsBatch({roll:120,gap:5,overlap:2,orientation:'vertical',glasses:[{width:200,height:100,qty:1,margin:2}]});
const glassPdf=pdf.build(glasses),text=new TextDecoder().decode(glassPdf.bytes);
assert.equal(glassPdf.contours.length,2);
assert.deepEqual(glassPdf.contours.map(c=>[c.width,c.height]),[[1200,1040],[860,1040]]);
assert.equal((text.match(/ re S/g)||[]).length,2);
assert.ok(!/BT|\/Font|\/Annots|\/XObject|CutContour|OPOS/.test(text));
assert.ok(text.includes('[] 0 d'));
near(glassPdf.width,1200);near(glassPdf.height,2085);
for(const shape of ['square','round']){
 const r=core.pack({roll:12,gap:5,labelShape:shape,pieceOrientation:'vertical',pieces:[{width:4,height:2,qty:3,bleed:2}]});
 const out=pdf.build(r),content=new TextDecoder().decode(out.bytes);
 assert.equal(out.contours.length,3);out.contours.forEach(c=>{near(c.width,44);near(c.height,24);assert.equal(c.shape,shape==='round'?'ellipse':'rect');});
 assert.equal((content.match(shape==='round'?/h S/g:/ re S/g)||[]).length,3);
}
const rotated=core.pack({roll:3,gap:5,labelShape:'round',pieceOrientation:'horizontal',pieces:[{width:4,height:2,qty:2,bleed:2}]});
assert.deepEqual(pdf.geometry(rotated).contours.map(c=>[c.width,c.height]),[[24,44],[24,44]]);
const many=core.pack({roll:120,gap:5,rotate:false,pieces:[{width:2,height:2,qty:1600,bleed:1}]});
assert.equal(pdf.build(many).contours.length,1600); // export every piece, independent of preview limit
const long={mode:'panels',roll:120,length:12,placed:[{x:0,y:0,width:120,height:1200}]},longPdf=pdf.build(long);
assert.ok(longPdf.userUnit>1);near(longPdf.height,12000);
const longText=new TextDecoder().decode(longPdf.bytes),box=longText.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
near(+box[2]*longPdf.userUnit*25.4/72,12000);
const xref=+text.match(/startxref\n(\d+)/)[1];assert.equal(text.slice(xref,xref+4),'xref');
assert.throws(()=>pdf.build({...long,placed:[{x:-1,y:0,width:10,height:10}]}),/fuera/);
assert.throws(()=>pdf.build({roll:120,length:1,placed:[]}),/Calcula/);
console.log('Cut PDF: exact millimetres, one outer contour, margins/overlaps/bleed, ovals/rotation, all pieces, long roll scale and no text/marks passed');

// Single panels centre independently, while rows with multiple cuts keep their geometry.
const centred=pdf.geometry(glasses);
near(centred.contours[0].x,0);near(centred.contours[1].x,170);
const source={mode:'panels',roll:120,length:1.1,gap:.5,placed:[
 {x:0,y:0,width:30,height:50},{x:30.5,y:0,width:40,height:50},
 {x:0,y:50.5,width:20,height:50}
]};
const unchanged=JSON.stringify(source),grouped=pdf.geometry(source);
near(grouped.contours[0].x,247.5);near(grouped.contours[1].x,552.5);near(grouped.contours[2].x,500);
near(grouped.contours[1].x-grouped.contours[0].x,305);assert.equal(JSON.stringify(source),unchanged);
const ellipseRows=core.pack({roll:12,gap:5,labelShape:'round',pieceOrientation:'vertical',pieces:[{width:4,height:2,qty:3,bleed:2}]});
const ellipses=pdf.geometry(ellipseRows).contours;
near(ellipses[0].x,15.5);near(ellipses[1].x,60.5);near(ellipses[2].x,38);
for(const c of ellipses){near(c.width,44);near(c.height,24);}
console.log('PDF centring: independent panels, side-by-side rows, oval bleed and source immutability passed');
