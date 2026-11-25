(function(root){
'use strict';
const products=[];
const add=(name,unit,price,size='')=>products.push({name,unit,price,size});
[['Vinilo monomérico',21],['Vinilo monomérico silueteado',30],['Vinilo monomérico silueteado pequeño',40],['Vinilo polimérico',27],['Vinilo polimérico + laminado',42],['Vinilo polimérico + laminado + silueteado pequeño',55],['Vinilo fundido + laminado fundido',55],['Vinilo transparente',27],['Vinilo microperforado',45],['Vinilo retroiluminado',42],['Vinilo + cartón pluma',50],['Vinilo + PVC 5 mm',60],['Vinilo + PVC 10 mm',70],['Vinilo + Alupanel + laminado',95],['Vinilo carbono corte 3M',75],['Vinilo carbono a metros 3M',65],['Vinilo corte',35],['Vinilo corte ácido',36],['Papel',18],['Lona',30],['Lienzo',40],['Imán bobina',35]].forEach(([n,p])=>add(n,'m²',p));
const sizes=['A4','A3','35×50 cm','50×50 cm','50×70 cm','60×60 cm','100×70 cm'];
[['PVC 5 mm · vinilo + laminado',[25,30,35,null,52,null,75]],['PVC 10 mm · vinilo + laminado',[30,35,40,null,60,null,87]],['Glaspack · vinilo + laminado',[15,20,25,null,35,null,42]],['Alupanel · vinilo + laminado',[30,40,45,null,55,null,100]],['Imán + vinilo laminado',[18,27,30,null,42,null,null]],['Lienzo · bastidor 5 cm',[33,50,54,69,90,90,105]],['Metacrilato 5 mm',[35,55,57,null,95,null,147]]].forEach(([n,ps])=>ps.forEach((p,i)=>add(n,'unidad',p,sizes[i])));
[['Roll Up · 2,04 × 0,85 m',90],['Roll Up · 2,04 × 1 m',110],['Grabado textil · 1 color pequeño',3],['Grabado textil · 1 color A4',8],['Grabado textil · impresión pequeño',4],['Grabado textil · impresión A4',10],['Nombre + número textil',12],['Camiseta',4],['Camiseta manga larga',5.5],['Polo',8.5],['Sudadera con capucha',17],['Sudadera sin capucha',12]].forEach(([n,p])=>add(n,'unidad',p));
for(const product of products){
 product.category=product.name.startsWith('Roll Up')?'rollup':product.size?'plates':'materials';
 product.family=product.name.startsWith('PVC')?'PVC':product.name.startsWith('Glaspack')?'Glaspack':product.name.startsWith('Alupanel')?'Alupanel':product.name.startsWith('Imán')?'Imán':product.name.startsWith('Metacrilato')?'Metacrilato':product.name.startsWith('Lienzo')?'Lienzo':'';
 product.retired=product.name==='Vinilo monomérico silueteado pequeño'||(!product.size&&product.unit==='unidad');
 if(product.category==='rollup')product.retired=false;
 if(product.size){const dims={'A4':[21,29.7],'A3':[29.7,42],'35×50 cm':[35,50],'50×50 cm':[50,50],'50×70 cm':[50,70],'60×60 cm':[60,60],'100×70 cm':[100,70]}[product.size];[product.width,product.height]=dims;}
 if(product.name.startsWith('Lienzo ·')) product.name='Lienzo sin bastidor';
}
add('Vinilo tintado de cristales','m²',36);
products.at(-1).category='materials';
const legacyCalculate=function(p){
const product=products[+p.product];if(!product)throw Error('Selecciona un producto.');
const qty=+p.qty,price=p.price===''?NaN:+p.price,width=+p.width,height=+p.height,lamPrice=+p.lamPrice,eyelets=+p.eyelets,eyeletPrice=+p.eyeletPrice,hangers=+p.hangers,hangerPrice=+p.hangerPrice,minimum=+p.minimum,discount=+p.discount;
if(!Number.isInteger(qty)||qty<1)throw Error('La cantidad debe ser entera y mayor que cero.');
if(!Number.isFinite(price)||price<0)throw Error('Introduce el precio: esta tarifa puede estar pendiente.');
if([lamPrice,eyelets,eyeletPrice,hangers,hangerPrice,minimum,discount].some(n=>!Number.isFinite(n)||n<0)||!Number.isInteger(eyelets)||!Number.isInteger(hangers)||discount>100)throw Error('Revisa extras, mínimo y descuento (0–100 %).');
if((product.unit==='m²'||p.laminate)&&(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0))throw Error('Introduce ancho y alto en milímetros.');
const area=width*height/10000*qty,base=(product.unit==='m²'?area:qty)*price,lamination=p.laminate?area*lamPrice:0,extras=eyelets*eyeletPrice+hangers*hangerPrice,subtotal=Math.max(minimum,base+lamination+extras),discountAmount=subtotal*discount/100,total=subtotal-discountAmount;
return {area,base,lamination,extras,subtotal,discountAmount,total,unit:total/qty};
}
function materialArea(p){
 const width=Number(p.width),height=Number(p.height),qty=Number(p.qty??1);
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||!Number.isInteger(qty)||qty<1)throw Error('Introduce medidas y cantidad válidas.');
 const area=width*height*qty/10000;
 if(p.billingBasis!=='consumed')return {area,billedArea:area,consumedArea:area,wasteArea:0};
 const rollWidth=Number(p.rollWidth);
 if(p.rollWidth===''||!Number.isFinite(rollWidth)||rollWidth<=0)throw Error('Indica el ancho de la bobina o plancha en milímetros.');
 const options=[[width,height],[height,width]].filter(([cross])=>cross<=rollWidth+1e-8);
 const source=p.stockSource==='sheet'?'sheet':'roll';
 let consumedArea,runLength=0,sheets=0;
 if(source==='sheet'){
  const stockHeight=Number(p.stockHeight);
  if(p.stockHeight===''||!Number.isFinite(stockHeight)||stockHeight<=0)throw Error('Indica el alto de la plancha en milímetros.');
  const capacity=Math.max(0,...options.map(([w,h])=>Math.floor((rollWidth+1e-8)/w)*Math.floor((stockHeight+1e-8)/h)));
  if(!capacity)throw Error('La pieza no cabe en la plancha indicada.');
  sheets=Math.ceil(qty/capacity);consumedArea=sheets*rollWidth*stockHeight/10000;
 }else{
  if(!options.length)throw Error('La pieza no cabe en el ancho de bobina. Para dividirla, utiliza Cristales por paños.');
  runLength=Math.min(...options.map(([cross,along])=>Math.ceil(qty/Math.floor((rollWidth+1e-8)/cross))*along));
  consumedArea=rollWidth*runLength/10000;
 }
 return {area,billedArea:Math.max(area,consumedArea),consumedArea:Math.max(area,consumedArea),wasteArea:Math.max(0,consumedArea-area),rollWidth,runLength,sheets,source};
}
function calculateTextile(p){
 const integer=(value,label)=>{const n=Number(value??0);if(!Number.isInteger(n)||n<0)throw Error('Revisa '+label+': debe ser un número entero sin negativos.');return n;};
 const price=(value,label)=>{if(value===''||value==null)throw Error('Indica '+label+'.');const n=Number(value);if(!Number.isFinite(n)||n<0)throw Error('Revisa '+label+'.');return n;};
 const garmentQty=integer(p.garmentQty,'la cantidad de prendas'),byGarment=p.textileMode==='garments';
 const smallPrice=price(p.smallPrice??4,'el precio del grabado pequeño'),largePrice=price(p.largePrice??6,'el precio del grabado grande');
 let smallQty,largeQty;
 if(byGarment){
  if(garmentQty<1)throw Error('Indica la cantidad de prendas.');
  if(!['none','small','large'].includes(p.front)||!['none','small','large'].includes(p.back))throw Error('Selecciona los grabados de delante y detrás.');
  smallQty=garmentQty*([p.front,p.back].filter(v=>v==='small').length);
  largeQty=garmentQty*([p.front,p.back].filter(v=>v==='large').length);
 }else{smallQty=integer(p.smallQty,'los grabados pequeños');largeQty=integer(p.largeQty,'los grabados grandes');}
 const garmentPrice=p.clothingSource==='ours'?price(p.garmentPrice===''?0:p.garmentPrice??0,'el precio de la prenda'):0;
 const garmentAmount=garmentQty*garmentPrice,smallAmount=smallQty*smallPrice,largeAmount=largeQty*largePrice,total=smallAmount+largeAmount+garmentAmount;
 if(smallQty+largeQty===0&&garmentAmount===0)throw Error('Añade al menos un grabado o una prenda con precio.');
 return {smallQty,largeQty,smallPrice,largePrice,smallAmount,largeAmount,garmentQty,garmentPrice,garmentAmount,total,subtotal:total,unit:total/(garmentQty||smallQty+largeQty),area:0,base:total};
}
function calculate(p){
 if(p.kind==='textile')return calculateTextile(p);
 const product=products[+p.product];if(!product||product.retired)throw Error('Selecciona un producto de la tarifa actual.');
 const qty=+p.qty,price=p.price===''||p.price==null?NaN:+p.price;
 if(!Number.isInteger(qty)||qty<1)throw Error('La cantidad debe ser entera y mayor que cero.');
 if(!Number.isFinite(price)||price<0)throw Error('Introduce un precio: este formato no tiene tarifa.');
 const width=product.width??+p.width,height=product.height??+p.height;
 const canvas=product.family==='Lienzo'||product.name==='Lienzo';
 if((product.unit==='m²'||(canvas&&p.frame))&&(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0))throw Error('Introduce ancho y alto en milímetros.');
 const material=product.unit==='m²'?materialArea({...p,width,height,qty}):{area:0,billedArea:0,wasteArea:0};
 const {area,billedArea,wasteArea}=material;
 const base=(product.unit==='m²'?billedArea:qty)*price;
 const frameMeters=canvas&&p.frame?2*(width+height)/100*qty:0,frame=frameMeters*10;
 const hangers=product.category==='plates'&&!canvas&&p.withHanger?+(p.hangers??qty):0;
 const eyelets=product.name==='Lona'&&p.withEyelets?+(p.eyelets??0):0;
 if(!Number.isInteger(hangers)||hangers<0||!Number.isInteger(eyelets)||eyelets<0)throw Error('Colgadores y ojales deben ser cantidades enteras sin negativos.');
 const laminate=product.category==='materials'&&p.laminate?billedArea*+(p.lamPrice??18):0;
 if(!Number.isFinite(laminate)||laminate<0)throw Error('Revisa el precio del laminado.');
 const total=base+frame+hangers*6+eyelets+laminate;
 return {...material,area,billedArea,wasteArea,base,frameMeters,frame,hangers,eyelets,lamination:laminate,total,subtotal:total,unit:total/qty};
}
function migrate(saved){
 if(!saved)return [];
 if(saved.version===2)return JSON.parse(JSON.stringify(saved.items||[]));
 // Retain historical amount verbatim until the user edits this line.
 const product=products[+saved.product];
 return [{...saved,legacy:true,label:(product?.name||'Partida anterior')+(product?.size?' · '+product.size:''),result:{...saved.result,total:+saved.result?.total||0}}];
}
root.OrdenProPlotter={products,calculate,calculateTextile,materialArea,legacyCalculate,migrate};if(typeof module!=='undefined')module.exports=root.OrdenProPlotter;
})(globalThis);
