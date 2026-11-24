// Requires jsdom and fake-indexeddb: npm install --no-save jsdom fake-indexeddb
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb'),root=__dirname+'/';
const html=fs.readFileSync(root+'index.html','utf8'),storageSource=fs.readFileSync(root+'local-store.js','utf8');
const ids=['work_orders_app_data','work_quotes_app_data','work_invoices_app_data'];
async function storageCheck(){
 const indexedDB=new IDBFactory(),data=new Map();let rejectLarge=true;
 const localStorage={getItem:k=>data.get(k)||null,removeItem:k=>data.delete(k),setItem(k,v){if(rejectLarge&&v.length>100)throw Object.assign(Error('Full'),{name:'QuotaExceededError'});data.set(k,v);}};
 const create=()=>{const w=new JSDOM('',{runScripts:'outside-only'}).window;w.indexedDB=indexedDB;Object.defineProperty(w,'localStorage',{value:localStorage});w.eval(storageSource);return w;};
 const w=create();await w.OrdenProStorage.ready;const payload=JSON.stringify([{id:'large',attachedFiles:[{dataUrl:'data:application/pdf;base64,'+'A'.repeat(10000)}]}]);
 w.OrdenProStorage.setItem(ids[0],payload);await w.OrdenProStorage.flush();assert.equal(data.get(ids[0]),'__ordenpro_large_data__');
 const reloaded=create();await reloaded.OrdenProStorage.ready;assert.equal(reloaded.OrdenProStorage.getItem(ids[0]),payload);
 w.OrdenProStorage.setItem(ids[1],payload);rejectLarge=false;w.OrdenProStorage.setItem(ids[1],'[]');await w.OrdenProStorage.flush();assert.equal(data.get(ids[1]),'[]');
 const fresh=create();await fresh.OrdenProStorage.ready;assert.equal(fresh.OrdenProStorage.getItem(ids[1]),'[]');
 console.log('PASS: large files persist in IndexedDB, reload safely and pending older saves cannot replace newer data');
}
async function uploadCheck(){
 const dom=new JSDOM(html,{url:'https://example.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
 const orders=[{id:'a',orderNum:1,attachedFiles:[]},{id:'b',orderNum:2,attachedFiles:[]}],quotes=[{id:'q',orderNum:3,attachedFiles:[]}];w.orders=orders;w.quotes=quotes;
 const saved={};let fail=false;
 w.saveOrders=()=>saved.orders=JSON.stringify(orders);w.saveQuotes=()=>saved.quotes=JSON.stringify(quotes);w.OrdenProStorage={async flush(){if(fail)throw Error('Disk full');}};
 w.escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));w.confirm=()=>true;w.console={...console,error(){}};
 w.eval(html.slice(html.indexOf('let currentFileOrderId ='),html.indexOf('        function formatDate(dateStr)')));
 w.setupFileUpload();w.openFileModal('a');
 assert.equal(d.getElementById('attachmentInput').accept,'');assert.equal(d.getElementById('attachmentInput').multiple,true);
 assert.equal(d.getElementById('attachmentPhotos').accept,'image/*');assert.equal(d.getElementById('attachmentPhotos').hasAttribute('capture'),false);
 const pdf=new w.File(['%PDF-1.4 test'],'arte.pdf',{type:'application/pdf'}),jpg=new w.File(['image'],'foto.jpg',{type:'image/jpeg'}),bin=new w.File([new Uint8Array([0,1,2,255])],'diseño.ai',{type:''});
 await w.handleFileAdd({target:{files:[pdf,jpg,bin],type:'file',value:'fakepath'}});
 assert.equal(orders[0].attachedFiles.length,3);assert.equal(orders[0].attachedFiles[2].type,'application/octet-stream');assert.equal(orders[0].attachedFiles[0].name,'arte.pdf');
 assert.ok(saved.orders.includes('base64'));assert.equal(d.getElementById('fileList').children.length,3);
 const input={files:[pdf],type:'file',value:'fakepath'};await w.handleFileAdd({target:input});assert.equal(input.value,'');assert.equal(orders[0].attachedFiles.length,4);
 const over=new w.Event('dragover',{cancelable:true,bubbles:true});Object.defineProperty(over,'dataTransfer',{value:{}});d.getElementById('fileDropZone').dispatchEvent(over);assert.equal(over.defaultPrevented,true);
 const drop=new w.Event('drop',{cancelable:true,bubbles:true});Object.defineProperty(drop,'dataTransfer',{value:{files:[bin]}});d.getElementById('fileDropZone').dispatchEvent(drop);
 while(w.ordenproFileUploadBusy)await new Promise(r=>setTimeout(r,5));
 assert.equal(drop.defaultPrevented,true);assert.equal(orders[0].attachedFiles.length,5);
 w.openFileModal('q','quotes');await w.handleFileAdd({target:{files:[pdf],type:'file'}});assert.equal(quotes[0].attachedFiles.length,1);assert.ok(saved.quotes);
 // Capture target before an asynchronous read; switching to another order must not move the file.
 w.openFileModal('a');let finish;const realRead=w.readFileAsDataUrl;w.readFileAsDataUrl=()=>new Promise(r=>finish=r);
 const pending=w.handleFileAdd({target:{files:[pdf],type:'file'}});w.closeFileModal();w.openFileModal('b');finish('data:application/pdf;base64,QQ==');await pending;
 assert.equal(orders[0].attachedFiles.length,6);assert.equal(orders[1].attachedFiles.length,0);w.readFileAsDataUrl=realRead;
 w.readFileAsDataUrl=()=>Promise.reject(Error('Unreadable'));await w.handleFileAdd({target:{files:[pdf],type:'file'}});assert.ok(d.getElementById('fileUploadStatus').textContent.includes('arte.pdf'));assert.equal(orders[1].attachedFiles.length,0);
 w.readFileAsDataUrl=realRead;fail=true;await w.handleFileAdd({target:{files:[pdf],type:'file'}});assert.equal(orders[1].attachedFiles.length,0);assert.ok(d.getElementById('fileUploadStatus').textContent.includes('No se pudieron guardar'));assert.equal(d.getElementById('attachmentInput').disabled,false);
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new (require('vm').Script)(m[1]);
 console.log('PASS: PDFs/JPG/arbitrary files, repeated input, drop prevention/upload, gallery input, quote storage, target switching, read errors and storage failure rollback');
}
(async()=>{await storageCheck();await uploadCheck();})().catch(e=>{console.error(e);process.exitCode=1;});
