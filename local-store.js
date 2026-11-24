(function(root){
'use strict';
const keys=['work_orders_app_data','work_quotes_app_data','work_invoices_app_data'],marker='__ordenpro_large_data__',cache=new Map();
let dbPromise,queue=Promise.resolve(),failure=null;
function database(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('ordenpro-local-data',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));}
async function io(key,value){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('data',value===undefined?'readonly':'readwrite'),s=tx.objectStore('data'),r=value===undefined?s.get(key):s.put(value,key);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('No se pudo guardar en este dispositivo.'));});}
function getItem(key){if(cache.has(key))return cache.get(key);try{return localStorage.getItem(key);}catch(e){return null;}}
function setItem(key,value){
 cache.set(key,value);
 try{localStorage.setItem(key,value);return;}catch(error){/* Large jobs fall back to IndexedDB, retaining the full cloud snapshot. */}
 queue=queue.then(async()=>{await io(key,value);if(cache.get(key)!==value)return;try{localStorage.setItem(key,marker);}catch(e){try{localStorage.removeItem(key);}catch(ignore){}}}).catch(error=>{failure=error;});
}
const ready=(async()=>{for(const key of keys){let value,blocked=false;try{value=localStorage.getItem(key);}catch(e){blocked=true;}if(value===marker||blocked||value==null){try{const stored=await io(key);if(stored!=null)cache.set(key,stored);}catch(e){if(value===marker)throw e;}}}})();
ready.catch(()=>{});
root.OrdenProStorage={getItem,setItem,ready,async flush(){await queue;if(failure){const e=failure;failure=null;throw e;}}};
})(globalThis);
