(function(root){
'use strict';
const POINTS_PER_MM=72/25.4;
function geometry(result){
 if(!result||!Array.isArray(result.placed)||!result.placed.length)throw Error('Calcula primero la distribución.');
 const width=Number(result.roll)*10,height=Number(result.length)*1000;
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Las medidas de la bobina no son válidas.');
 const contours=result.placed.map(p=>{
  const bleed=result.mode==='pieces'?Number(p.bleed??result.bleed??0)*10:0;
  const c={shape:result.mode==='pieces'&&p.shape==='round'?'ellipse':'rect',x:Number(p.x)*10-bleed,y:Number(p.y)*10-bleed,width:Number(p.width)*10+2*bleed,height:Number(p.height)*10+2*bleed};
  if(!Object.values(c).slice(1).every(Number.isFinite)||c.width<=0||c.height<=0||c.x<-.001||c.y<-.001||c.x+c.width>width+.001||c.y+c.height>height+.001)throw Error('Un contorno queda fuera de la bobina. Vuelve a calcular la distribución.');
  return c;
 });
 return {width,height,contours};
}
function build(result){
 const g=geometry(result),unit=Math.max(1,Math.ceil(Math.max(g.width,g.height)*POINTS_PER_MM/14400));
 if(unit>75000)throw Error('El tamaño del trabajo supera el límite del PDF.');
 const scale=POINTS_PER_MM/unit,n=v=>Number(v.toFixed(7)).toString(),ops=['0 G',n(.1/unit)+' w','[] 0 d'];
 for(const c of g.contours){
  const x=c.x*scale,y=(g.height-c.y-c.height)*scale,w=c.width*scale,h=c.height*scale;
  if(c.shape==='rect')ops.push([x,y,w,h].map(n).join(' ')+' re S');
  else {
   const k=.5522847498307936,cx=x+w/2,cy=y+h/2,rx=w/2,ry=h/2;
   ops.push(n(cx+rx)+' '+n(cy)+' m',
    [cx+rx,cy+k*ry,cx+k*rx,cy+ry,cx,cy+ry].map(n).join(' ')+' c',
    [cx-k*rx,cy+ry,cx-rx,cy+k*ry,cx-rx,cy].map(n).join(' ')+' c',
    [cx-rx,cy-k*ry,cx-k*rx,cy-ry,cx,cy-ry].map(n).join(' ')+' c',
    [cx+k*rx,cy-ry,cx+rx,cy-k*ry,cx+rx,cy].map(n).join(' ')+' c','h S');
  }
 }
 const stream=ops.join('\n')+'\n',objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+n(g.width*scale)+' '+n(g.height*scale)+']'+(unit>1?' /UserUnit '+unit:'')+' /Resources << >> /Contents 4 0 R >>',
  '<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream'
 ];
 let pdf='%PDF-1.6\n',offsets=[0];
 objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';});
 const xref=pdf.length;pdf+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 return {bytes:new TextEncoder().encode(pdf),...g,userUnit:unit};
}
function download(result,name='corte-bobina'){
 const pdf=build(result),url=URL.createObjectURL(new Blob([pdf.bytes],{type:'application/pdf'})),a=document.createElement('a');
 a.href=url;a.download=String(name).replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 return pdf;
}
root.OrdenProCutPDF={geometry,build,download};if(typeof module!=='undefined')module.exports=root.OrdenProCutPDF;
})(globalThis);
