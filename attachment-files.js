(function(root){
'use strict';
const raster={'pdf':'application/pdf','jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','gif':'image/gif','webp':'image/webp','bmp':'image/bmp','avif':'image/avif'};
const previewTypes=new Set(Object.values(raster));
// Keep opened documents available for the lifetime of the page (PDF viewers use range reads).
const urls=new WeakMap();
function decode(file){
 const data=file?.dataUrl;
 if(typeof data!=='string'||!data.startsWith('data:')||data.indexOf(',')<0)throw Error('El archivo no contiene datos válidos. Vuelve a adjuntarlo.');
 const comma=data.indexOf(','),header=data.slice(5,comma),body=data.slice(comma+1);
 let bytes;
 try {bytes=/;base64(?:;|$)/i.test(header)?Uint8Array.from(atob(body),c=>c.charCodeAt(0)):new TextEncoder().encode(decodeURIComponent(body));}
 catch(e){throw Error('No se pudo leer el archivo guardado. Vuelve a adjuntarlo.');}
 const ext=String(file.name||'').split('.').pop().toLowerCase();
 let type=raster[ext]||String(file.type||header.split(';')[0]||'application/octet-stream').toLowerCase();
 // Recover missing MIME types from older mobile uploads. Never preview active HTML/SVG.
 if(!raster[ext]&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-')type='application/pdf';
 return {blob:new Blob([bytes],{type}),previewable:previewTypes.has(type),type};
}
function prepare(link,file,download=false){
 let entry=urls.get(file);
 if(!entry){entry=decode(file);entry.url=URL.createObjectURL(entry.blob);urls.set(file,entry);}
 link.href=entry.url;
 if(download||!entry.previewable){link.download=file.name||'archivo';link.removeAttribute('target');}
 else {link.removeAttribute('download');link.target='_blank';link.rel='noopener noreferrer';}
 return entry;
}
root.OrdenProAttachments={decode,prepare};
if(typeof module!=='undefined')module.exports=root.OrdenProAttachments;
})(globalThis);
