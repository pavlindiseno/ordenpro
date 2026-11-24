// Requires jsdom: npm install --no-save jsdom
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),root=__dirname+'/';
const html=fs.readFileSync(root+'index.html','utf8'),dom=new JSDOM(html,{url:'https://example.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.orders=[{id:'a',orderNum:1,attachedFiles:[
 {name:'Arte final.PDF',type:'application/octet-stream',dataUrl:'data:application/octet-stream;base64,'+Buffer.from('%PDF-1.4\n').toString('base64')},
 {name:'Imagen.jpg',type:'image/jpeg',dataUrl:'data:image/jpeg;base64,/9j/AA=='},
 {name:'Diseño.ai',type:'application/postscript',dataUrl:'data:application/postscript;base64,AAECAw=='},
 {name:'Dañado.pdf',dataUrl:'no válido'}]}];w.quotes=[];w.confirm=()=>true;w.saveOrders=()=>{};w.saveQuotes=()=>{};
w.escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blobs=[];w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:https://example.test/'+blobs.length;};w.Blob=Blob;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
w.eval(fs.readFileSync(root+'attachment-files.js','utf8'));
w.eval(html.slice(html.indexOf('let currentFileOrderId ='),html.indexOf('        function formatDate(dateStr)')));
w.openFileModal('a');
const click=el=>{let prevented;el.addEventListener('click',e=>{prevented=e.defaultPrevented;e.preventDefault();},{once:true});el.click();return prevented;};
let links=d.querySelectorAll('[data-attachment-open]');assert.equal(click(links[0]),false);assert.equal(links[0].href,'blob:https://example.test/1');assert.equal(links[0].target,'_blank');assert.equal(blobs[0].type,'application/pdf');
const dl=d.querySelector('[data-attachment-download="0"]');click(dl);assert.equal(dl.download,'Arte final.PDF');assert.equal(dl.href,links[0].href);
click(links[1]);assert.equal(links[1].target,'_blank');assert.equal(blobs[1].type,'image/jpeg');
click(links[2]);assert.equal(links[2].download,'Diseño.ai');assert.equal(links[2].target,'');
assert.equal(click(links[3]),true);assert.ok(d.getElementById('fileUploadStatus').textContent.includes('datos válidos'));
w.renderFileList();links=d.querySelectorAll('[data-attachment-open]');click(links[0]);assert.equal(blobs.length,3);assert.equal(links[0].href,'blob:https://example.test/1');
w.closeFileModal();assert.equal(links[0].href,'blob:https://example.test/1');
console.log('PASS: filename opens PDF/image via native Blob link; download keeps original filename; other formats download; corrupt file reports error; rerender reuses open document');
