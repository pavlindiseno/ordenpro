(function(root) {
'use strict';
const color = [[50,1.5],[100,1],[200,.825],[400,.66],[600,.45],[750,.34],[1000,.23],[3000,.17],[5000,.145],[7000,.132],[10000,.11],[12500,.10],[15000,.094],[20000,.089],[Infinity,.083]];
const bw = [[1000,.15],[2500,.13],[5000,.11],[10000,.083],[15000,.078],[25000,.055],[50000,.05],[75000,.039],[Infinity,.028]];
const formats = {A5:{w:45,h:32,pages:4,covers:2,parentW:45,parentH:64,price:26.7},'16x22':{w:46,h:33,pages:4,covers:1,parentW:52,parentH:70,price:33.7},A4:{w:45,h:32,pages:2,covers:1,parentW:45,parentH:64,price:26.7}};
const rate=(n,t)=>t.find(r=>n<=r[0])[1];
function yieldSheets(w,h,x,y) {
 // Guillotine rows; permits rotating individual rows, without assuming area alone guarantees fit.
 let best=0;
 for(let a=0;a<=Math.floor(h/y);a++) best=Math.max(best,a*Math.floor(w/x)+Math.floor((h-a*y)/x)*Math.floor(w/y));
 for(let a=0;a<=Math.floor(w/x);a++) best=Math.max(best,a*Math.floor(h/y)+Math.floor((w-a*x)/y)*Math.floor(h/x));
 return best;
}
function calculate(p) {
 const f=formats[p.format]; if(!f) throw Error('Elige un formato válido.');
 const positive=['copies','pages','innerW','innerH','coverW','coverH','innerPrice','coverPrice','covers'];
 for(const k of positive) if(!Number.isFinite(+p[k])||+p[k]<=0) throw Error('Revisa cantidades, medidas y precios: deben ser mayores que cero.');
 if(!Number.isInteger(+p.copies)||!Number.isInteger(+p.pages)||+p.pages%2!==0) throw Error('La tirada debe ser entera y las páginas interiores deben ser pares.');
 if(![1,2].includes(+p.covers)) throw Error('Elige una o dos portadas por pliego.');
 for(const k of ['innerMarkup','coverMarkup','waste']) if(!Number.isFinite(+p[k])||+p[k]<0) throw Error('Los recargos y la merma no pueden ser negativos.');
 if(!['color','bw'].includes(p.innerMode)||!['color','bw'].includes(p.coverMode)) throw Error('Elige color o blanco y negro.');
 const iy=yieldSheets(+p.innerW,+p.innerH,f.w,f.h),cy=yieldSheets(+p.coverW,+p.coverH,45,32);
 if(!iy||!cy) throw Error('El tamaño de compra no permite obtener el pliego de impresión.');
 const innerPerCopy=Math.ceil(+p.pages/(f.pages*2));
 const innerSheets=+p.copies*innerPerCopy,coverSheets=Math.ceil(+p.copies/+p.covers);
 const innerHits=innerSheets*2,coverHits=coverSheets*2,hits=innerHits+coverHits;
 const colorHits=(p.innerMode==='color'?innerHits:0)+(p.coverMode==='color'?coverHits:0);
 const bwHits=hits-colorHits;
 const innerParents=Math.ceil(Math.ceil(innerSheets*(1 + +p.waste/100))/iy);
 const coverParents=Math.ceil(Math.ceil(coverSheets*(1 + +p.waste/100))/cy);
 const innerCost=innerParents*(+p.innerPrice/500),coverCost=coverParents*(+p.coverPrice/500);
 const innerSale=innerCost*(1 + +p.innerMarkup/100),coverSale=coverCost*(1 + +p.coverMarkup/100);
 let binding=0;
 if(p.binding) binding=+p.copies===1?20:+p.copies>500?Math.max(270,+p.copies*.5):[[10,30],[25,60],[50,90],[100,120],[200,180],[300,220],[400,250],[500,270]].find(r=>+p.copies<=r[0])[1];
 const lamination=p.lamination?45:0;
 const colorRate=rate(hits,color),bwRate=rate(hits,bw);
 const total=colorHits*colorRate+bwHits*bwRate+innerSale+coverSale+binding+lamination;
 return {innerSheets,coverSheets,innerHits,coverHits,hits,colorHits,bwHits,colorRate,bwRate,innerParents,coverParents,innerCost,coverCost,innerSale,coverSale,binding,lamination,total,unit:total/+p.copies,blankPages:innerPerCopy*f.pages*2-+p.pages,iy,cy};
}
root.OrdenProMagazine={calculate,formats,yieldSheets};
if(typeof module!=='undefined') module.exports=root.OrdenProMagazine;
})(globalThis);
