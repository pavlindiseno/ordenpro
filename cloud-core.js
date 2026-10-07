/* Comparación de registros sin depender del orden de las propiedades JSON. */
(function (root) {
  const names = ['orders', 'quotes', 'invoices'];
  const canonical = value => Array.isArray(value) ? value.map(canonical) :
    value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
  const equal = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const key = id => String(id);
  function index(records) {
    const map = new Map();
    for (const record of records) {
      if (!record || record.id == null || !key(record.id) || map.has(key(record.id))) throw new Error('Hay registros sin identificador o duplicados.');
      map.set(key(record.id), record);
    }
    return map;
  }
  function diff(local, baseline) {
    const changes = [];
    for (const name of names) {
      const current = index(local[name]);
      const previous = new Map((baseline['ordenpro_'+name] || []).map(r => [r.id,r]));
      for (const [id, data] of current) {
        const old = previous.get(id);
        if (!old || old.deleted_at || !equal(data, old.data)) changes.push({table:'ordenpro_'+name,id,data,version:old ? old.version : null,deleted:false});
      }
      for (const [id,old] of previous) if (!old.deleted_at && !current.has(id)) changes.push({table:'ordenpro_'+name,id,data:old.data,version:old.version,deleted:true});
    }
    return changes;
  }
  function unpack(remote) {
    return Object.fromEntries(names.map(name => [name,(remote['ordenpro_'+name] || []).filter(r=>!r.deleted_at).map(r=>r.data)]));
  }
  // Mantiene ediciones que el usuario haya hecho mientras la petición viajaba.
  function reconcile(sent, current, remote) {
    const result = unpack(remote);
    for (const name of names) {
      const before=index(sent[name]), now=index(current[name]), merged=index(result[name]);
      for(const [id,data] of now) if(!before.has(id) || !equal(data,before.get(id))) merged.set(id,data);
      for(const id of before.keys()) if(!now.has(id)) merged.delete(id);
      result[name]=[...merged.values()];
    }
    return result;
  }
  root.OrdenProCloudCore={names,equal,index,diff,unpack,reconcile};
})(typeof window === 'undefined' ? globalThis : window);
