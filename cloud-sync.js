/* Sincronización de OrdenPro. La contraseña nunca se guarda por esta aplicación. */
(() => {
  'use strict';
  const URL='https://rpdyovvgaqgodjexjplt.supabase.co';
  const KEY='sb_publishable_UHxRnG5A8THu4ceGPV5xDA_fY74jjNK';
  const EMAIL='pavlindiseno@gmail.com';
  const STATE='ordenpro_cloud_state_v1';
  const core=window.OrdenProCloudCore;
  let client, session, busy=false, blocked=false, timer;
  let state=null;
  const database=new Promise((resolve,reject)=>{
    const request=indexedDB.open('ordenpro-cloud',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  async function stateIO(write) {
    const db=await database;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('state',write?'readwrite':'readonly');
      const store=tx.objectStore('state');
      const request=write?store.put(state,STATE):store.get(STATE);
      tx.oncomplete=()=>resolve(request.result);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error || new Error('No se pudo guardar la sincronización.'));
    });
  }
  const snapshot=()=>JSON.parse(JSON.stringify(window.ordenproData.read()));
  const count=data=>core.names.reduce((n,k)=>n+data[k].length,0);
  const el=id=>document.getElementById(id);
  function status(message) { el('cloudStatus').textContent=message; el('cloudBadge').textContent=message; }
  function modalOpen() { return ['orderModal','photoModal','fileModal'].some(id=>el(id)&&!el(id).classList.contains('hidden')); }
  async function saveState() { await stateIO(true); localStorage.setItem(STATE,String(Date.now())); }
  function backup(data) {
    const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
    const url=window.URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='ordenpro-antes-de-cargar-nube-'+Date.now()+'.json'; a.click();
    setTimeout(()=>window.URL.revokeObjectURL(url),1000);
  }
  async function request(changes=[]) {
    const {data,error}=await client.rpc('ordenpro_sync',{changes});
    if(error) throw error;
    for(const name of core.names) if(!Array.isArray(data?.['ordenpro_'+name])) throw new Error('Respuesta de la nube no válida.');
    return data;
  }
  function report(error) {
    if(['40001','23505'].includes(error.code)) { blocked=true; status('Conflicto: conserva una copia y carga la nube antes de continuar.'); }
    else if(error.code==='PGRST202' || error.message?.includes('ordenpro_sync')) status('Falta ejecutar cloud-sync.sql en Supabase.');
    else status(navigator.onLine?'No se pudo sincronizar. Tus cambios siguen en este dispositivo.':'Sin conexión: cambios guardados en este dispositivo.');
    el('cloudError').textContent=error.message || 'Error de conexión';
  }
  async function sync() {
    if(busy || blocked || !session || !state?.ready || modalOpen()) return;
    if(!navigator.onLine) {status('Sin conexión: cambios pendientes.');return;}
    busy=true;
    try {
      const sent=snapshot(), changes=core.diff(sent,state.baseline);
      status(changes.length?'Subiendo cambios…':'Comprobando nube…');
      const remote=await request(changes);
      const current=snapshot();
      // Si se abrió un formulario durante la petición, aplaza aplicar la descarga.
      // Los cambios enviados ya están confirmados; la siguiente consulta traerá los demás.
      if(modalOpen()) {
        const acknowledged=JSON.parse(JSON.stringify(state.baseline));
        for(const change of changes) {
          const rows=acknowledged[change.table] || (acknowledged[change.table]=[]);
          const row=remote[change.table].find(r=>r.id===change.id), i=rows.findIndex(r=>r.id===change.id);
          if(i<0) rows.push(row); else rows[i]=row;
        }
        state.baseline=acknowledged; await saveState(); status('Cambios enviados. Descarga pendiente al cerrar el formulario.');
      } else {
        const merged=core.reconcile(sent,current,remote);
        // Journal para recuperar una actualización local interrumpida.
        state={...state,baseline:remote,journal:merged}; await saveState();
        window.ordenproData.apply(merged);
        delete state.journal; await saveState();
        status(core.diff(snapshot(),state.baseline).length?'Cambios pendientes de subir.':'Sincronizado');
      }
      el('cloudError').textContent='';
    } catch(error) {report(error);} finally {busy=false;}
  }
  async function initialize(mode) {
    if(busy || !session) return;
    if(modalOpen()) {status('Cierra el formulario del trabajo antes de conectar.');return;}
    busy=true;
    try {
      const remote=await request(), local=snapshot(), remoteData=core.unpack(remote);
      if(mode==='upload') {
        // Incluso los borrados cuentan: no recrear una nube existente por accidente.
        if(core.names.some(n=>remote['ordenpro_'+n].length)) throw new Error('La nube ya tiene datos. Usa «Cargar desde la nube»; conserva primero tu respaldo.');
        if(!confirm('¿Subir las órdenes, presupuestos y cobros de este dispositivo a la nube?')) return;
        const saved=await request(core.diff(local,remote));
        state={owner:session.user.id,ready:true,baseline:saved}; await saveState();
      } else {
        if(!confirm('Se cargarán '+count(remoteData)+' registros de la nube y se sustituirán los de este dispositivo. Se descargará antes una copia de los datos actuales. ¿Continuar?')) return;
        backup(local);
        state={owner:session.user.id,ready:true,baseline:remote,journal:remoteData}; await saveState();
        window.ordenproData.apply(remoteData); delete state.journal; await saveState();
      }
      blocked=false; status('Conectado. Sincronización automática activa.');
      el('cloudError').textContent='';
    } catch(error) {report(error);} finally {busy=false;}
  }
  async function start() {
    if(client) return;
    if(!window.supabase) {
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js';
        script.onload=resolve; script.onerror=()=>reject(new Error('No se pudo cargar la conexión. Comprueba Internet.'));
        document.head.appendChild(script);
      });
    }
    client=window.supabase.createClient(URL,KEY);
    const {data,error}=await client.auth.getSession(); if(error) throw error;
    session=data.session;
    if(session && session.user.email?.toLowerCase()!==EMAIL) {await client.auth.signOut();session=null;}
    if(session && state?.owner!==session.user.id) state=null;
    el('cloudLogin').hidden=!!session; el('cloudActions').hidden=!session;
    client.auth.onAuthStateChange((_event,next)=>{session=next; el('cloudLogin').hidden=!!next;el('cloudActions').hidden=!next;});
    status(session?(state?.ready?'Conectado: comprobando cambios…':'Elige subir este dispositivo o cargar la nube.'):'Nube sin sesión');
    await sync();
  }
  window.ordenproCloud={
    changed() {clearTimeout(timer);timer=setTimeout(sync,800);},
    async open() {el('cloudDialog').showModal();try{await start();}catch(error){report(error);}},
    close() {el('cloudDialog').close();},
    async login(event) {
      event.preventDefault();
      try {
        await start(); const password=el('cloudPassword').value;
        const {data,error}=await client.auth.signInWithPassword({email:EMAIL,password});
        el('cloudPassword').value=''; if(error) throw error;
        session=data.session; if(state?.owner!==session.user.id) state=null;
        status(state?.ready?'Sesión iniciada.':'Sesión iniciada. Elige cómo conectar los datos.'); await sync();
      } catch(error) {el('cloudPassword').value='';el('cloudError').textContent=error.message;}
    },
    upload:()=>initialize('upload'), download:()=>initialize('download'), sync,
    async logout() {
      if(busy) return;
      if(state?.ready && core.diff(snapshot(),state.baseline).length) {status('Hay cambios pendientes. Sincroniza o guarda un respaldo antes de salir.');return;}
      if(client) await client.auth.signOut(); session=null;status('Sesión cerrada. Los datos locales siguen en este dispositivo.');
    }
  };
  document.addEventListener('DOMContentLoaded',async ()=>{
    try {state=await stateIO(false);} catch(error){blocked=true;report(error);return;}
    if(state?.journal) {
      try {window.ordenproData.apply(state.journal);delete state.journal;await saveState();} catch(error){blocked=true;report(error);}
    }
    if(state?.ready) start().catch(report);
    setInterval(sync,15000);
    window.addEventListener('online',()=>start().then(sync).catch(report));
    window.addEventListener('storage',event=>{
      if([STATE,'work_orders_app_data','work_quotes_app_data','work_invoices_app_data'].includes(event.key)) {
        blocked=true;status('OrdenPro cambió en otra pestaña. Cierra esta pestaña y usa la otra.');
      }
    });
  });
})();
