(function(root){
'use strict';
const products=[];
const add=(name,unit,price,size='')=>products.push({name,unit,price,size});
[['Vinilo monomérico',21],['Vinilo monomérico silueteado',30],['Vinilo monomérico silueteado pequeño',40],['Vinilo polimérico',27],['Vinilo polimérico + laminado',42],['Vinilo polimérico + laminado + silueteado pequeño',55],['Vinilo fundido + laminado fundido',55],['Vinilo transparente',27],['Vinilo microperforado',45],['Vinilo retroiluminado',42],['Vinilo + cartón pluma',50],['Vinilo + PVC 5 mm',60],['Vinilo + PVC 10 mm',70],['Vinilo + Alupanel + laminado',95],['Vinilo carbono corte 3M',75],['Vinilo carbono a metros 3M',65],['Vinilo corte',35],['Vinilo corte ácido',36],['Papel',18],['Lona',30],['Lienzo',40],['Imán bobina',35]].forEach(([n,p])=>add(n,'m²',p));
const sizes=['A4','A3','35×50 cm','50×50 cm','50×70 cm','60×60 cm','100×70 cm'];
[['PVC 5 mm · vinilo + laminado',[25,30,35,null,52,null,75]],['PVC 10 mm · vinilo + laminado',[30,35,40,null,60,null,87]],['Glaspack · vinilo + laminado',[15,20,25,null,35,null,42]],['Alupanel · vinilo + laminado',[30,40,45,null,55,null,100]],['Imán + vinilo laminado',[18,27,30,null,42,null,null]],['Lienzo · bastidor 5 cm',[33,50,54,69,90,90,105]],['Metacrilato 5 mm',[35,55,57,null,95,null,147]]].forEach(([n,ps])=>ps.forEach((p,i)=>add(n,'unidad',p,sizes[i])));
[['Roll Up · 2,04 × 0,85 m',90],['Roll Up · 2,04 × 1 m',110],['Grabado textil · 1 color pequeño',3],['Grabado textil · 1 color A4',8],['Grabado textil · impresión pequeño',4],['Grabado textil · impresión A4',10],['Nombre + número textil',12],['Camiseta',4],['Camiseta manga larga',5.5],['Polo',8.5],['Sudadera con capucha',17],['Sudadera sin capucha',12]].forEach(([n,p])=>add(n,'unidad',p));
function calculate(p){
const product=products[+p.product];if(!product)throw Error('Selecciona un producto.');
const qty=+p.qty,price=p.price===''?NaN:+p.price,width=+p.width,height=+p.height,lamPrice=+p.lamPrice,eyelets=+p.eyelets,eyeletPrice=+p.eyeletPrice,hangers=+p.hangers,hangerPrice=+p.hangerPrice,minimum=+p.minimum,discount=+p.discount;
if(!Number.isInteger(qty)||qty<1)throw Error('La cantidad debe ser entera y mayor que cero.');
if(!Number.isFinite(price)||price<0)throw Error('Introduce el precio: esta tarifa puede estar pendiente.');
if([lamPrice,eyelets,eyeletPrice,hangers,hangerPrice,minimum,discount].some(n=>!Number.isFinite(n)||n<0)||!Number.isInteger(eyelets)||!Number.isInteger(hangers)||discount>100)throw Error('Revisa extras, mínimo y descuento (0–100 %).');
if((product.unit==='m²'||p.laminate)&&(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0))throw Error('Introduce ancho y alto en centímetros.');
const area=width*height/10000*qty,base=(product.unit==='m²'?area:qty)*price,lamination=p.laminate?area*lamPrice:0,extras=eyelets*eyeletPrice+hangers*hangerPrice,subtotal=Math.max(minimum,base+lamination+extras),discountAmount=subtotal*discount/100,total=subtotal-discountAmount;
return {area,base,lamination,extras,subtotal,discountAmount,total,unit:total/qty};
}
root.OrdenProPlotter={products,calculate};if(typeof module!=='undefined')module.exports=root.OrdenProPlotter;
})(globalThis);
