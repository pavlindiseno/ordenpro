const vm=require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict');
(async()=>{
  const nodes=new Map(), handlers={};let data={orders:[{id:'1',orderNum:'OT-0001',clientName:'Cliente'}],quotes:[],invoices:[]};
  const remote={ordenpro_orders:[],ordenpro_quotes:[],ordenpro_invoices:[]};
  let authHandler, rpcError=null, rpcCalls=0, stored, duringWrite=null, applied=0;
  const session={user:{id:'test-owner',email:'pavlindiseno@gmail.com'}};
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{textContent:'',value:'test-password',hidden:false,classList:{contains:()=>true},showModal(){this.open=true},close(){this.open=false}});
    return nodes.get(id);
  };
  const sdk={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(fn){authHandler=fn},signInWithPassword:async()=>{authHandler('SIGNED_IN',session);return {data:{session}}},signOut:async()=>authHandler('SIGNED_OUT',null)},rpc:async(_name,{changes})=>{
    rpcCalls++;if(rpcError)return {error:rpcError};
    for(const c of changes){const arr=remote[c.table],old=arr.find(r=>r.id===c.id);if(old){old.data=c.data;old.version++;old.deleted_at=c.deleted?'today':null}else arr.push({id:c.id,data:c.data,version:1,deleted_at:null});}
    return {data:JSON.parse(JSON.stringify(remote))};
  }};
  const context={console,Blob,setTimeout,clearTimeout,setInterval:()=>{},confirm:()=>true,navigator:{onLine:true},localStorage:{setItem(){}},indexedDB:{open(){const req={};setTimeout(()=>{req.result={transaction(){const tx={objectStore:()=>({get(){const r={result:stored};setTimeout(()=>tx.oncomplete(),0);return r},put(value){stored=JSON.parse(JSON.stringify(value));if(duringWrite){const fn=duringWrite;duringWrite=null;fn();}const r={};setTimeout(()=>tx.oncomplete(),0);return r}})};return tx}};req.onsuccess()},0);return req}},document:{getElementById:node,addEventListener:(name,fn)=>handlers[name]=fn},addEventListener(){},supabase:{createClient:()=>sdk},ordenproData:{read:()=>data,apply:value=>{applied++;data=value;}}};
  context.window=context;context.globalThis=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname+'/cloud-core.js','utf8'),context);
  vm.runInContext(fs.readFileSync(__dirname+'/cloud-sync.js','utf8'),context);
  await handlers.DOMContentLoaded();await context.ordenproCloud.open();
  await context.ordenproCloud.login({preventDefault(){}});
  assert.equal(node('cloudPassword').value,'');
  await context.ordenproCloud.upload();assert.equal(remote.ordenpro_orders.length,1);
  data.orders[0].clientName='Editado';await context.ordenproCloud.sync();assert.equal(remote.ordenpro_orders[0].version,2);
  duringWrite=()=>{data.orders[0].clientName='Editado durante IndexedDB'};
  await context.ordenproCloud.sync();assert.equal(data.orders[0].clientName,'Editado durante IndexedDB');
  await context.ordenproCloud.sync();assert.equal(remote.ordenpro_orders[0].data.clientName,'Editado durante IndexedDB');
  const idleApplied=applied;await context.ordenproCloud.sync();assert.equal(applied,idleApplied,'An unchanged sync must not rebuild status controls');
  context.document.activeElement={hasAttribute:name=>name==='data-order-status'};
  const beforePicker=rpcCalls;await context.ordenproCloud.sync();assert.equal(rpcCalls,beforePicker,'Do not refresh while choosing status');
  data.orders[0].invoiced=true;data.orders[0].status='Completada';
  context.document.activeElement=null;
  await context.ordenproCloud.sync();await context.ordenproCloud.sync();
  assert.equal(data.orders[0].status,'Completada');assert.equal(data.orders[0].invoiced,true);
  assert.equal(remote.ordenpro_orders[0].data.status,'Completada');
  rpcError={code:'40001',message:'Conflicto'};data.orders[0].clientName='Local pendiente';await context.ordenproCloud.sync();
  assert.equal(data.orders[0].clientName,'Local pendiente');assert.match(node('cloudStatus').textContent,/Conflicto/);
  const calls=rpcCalls;await context.ordenproCloud.sync();assert.equal(rpcCalls,calls);
  console.log('Acceso, subida inicial, edición, contraseña borrada y parada ante conflicto: correctos.');
})().catch(error=>{console.error(error);process.exitCode=1});
