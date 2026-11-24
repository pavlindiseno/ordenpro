const assert=require('node:assert/strict'),files=require('./attachment-files');
const uri=(bytes,type='application/octet-stream')=>'data:'+type+';base64,'+Buffer.from(bytes).toString('base64');
(async()=>{
 const bytes=Buffer.from('%PDF-1.4\nExample\n%%EOF\n'),pdf={name:'Trabajo.PDF',type:'application/octet-stream',dataUrl:uri(bytes)};
 const decoded=files.decode(pdf);assert.equal(decoded.type,'application/pdf');assert.equal(decoded.previewable,true);assert.deepEqual(Buffer.from(await decoded.blob.arrayBuffer()),bytes);
 const attrs={download:'old'},link={removeAttribute(k){delete this[k];delete attrs[k];}};
 const entry=files.prepare(link,pdf);assert.ok(link.href.startsWith('blob:'));assert.equal(link.target,'_blank');assert.equal(link.download,undefined);assert.equal(link.rel,'noopener noreferrer');
 const url=link.href;files.prepare(link,pdf,true);assert.equal(link.href,url);assert.equal(link.download,'Trabajo.PDF');assert.equal(link.target,undefined);
 const jpeg=files.decode({name:'foto.JPG',dataUrl:uri([255,216,255,0,1])});assert.equal(jpeg.type,'image/jpeg');assert.equal(jpeg.previewable,true);assert.deepEqual([...new Uint8Array(await jpeg.blob.arrayBuffer())],[255,216,255,0,1]);
 const binary={name:'Original.ai',type:'application/postscript',dataUrl:uri([0,255,3,128])};files.prepare(link,binary);assert.equal(link.download,'Original.ai');assert.equal(link.target,undefined);assert.deepEqual([...new Uint8Array(await files.decode(binary).blob.arrayBuffer())],[0,255,3,128]);
 assert.equal(files.decode({name:'Sin extension',dataUrl:uri(bytes)}).type,'application/pdf');
 for(const [name,type] of [['pagina.html','text/html'],['vector.svg','image/svg+xml']])assert.equal(files.decode({name,type,dataUrl:uri('<svg onload="alert(1)">',type)}).previewable,false);
 assert.equal(files.decode({name:'nota.txt',dataUrl:'data:text/plain;charset=utf-8,Hola%20Pavl%C3%ADn'}).previewable,false);
 assert.throws(()=>files.decode({name:'mal.pdf',dataUrl:'data:application/pdf;base64,???'}),/leer/);
 assert.throws(()=>files.decode({name:'falta.pdf'}),/datos válidos/);
 for(const f of [pdf,binary])URL.revokeObjectURL(files.prepare(link,f).url);
 console.log('Attachment opening: real Blob PDF/JPEG, exact binary bytes, MIME recovery, named download, reused URL, invalid data and HTML/SVG download passed');
})().catch(e=>{console.error(e);process.exitCode=1});
