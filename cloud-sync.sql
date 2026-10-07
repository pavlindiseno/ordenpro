-- Ejecutar después de ordenpro-nube.sql. No elimina registros.
begin;
create or replace function public.ordenpro_sync(changes jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  change jsonb; tab text; affected integer; result jsonb := '{}'::jsonb; rows jsonb;
begin
  if auth.uid() is null or lower(auth.jwt()->>'email') is distinct from 'pavlindiseno@gmail.com' then
    raise exception 'Acceso no autorizado';
  end if;
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 10000 then
    raise exception 'Cambios no válidos';
  end if;
  -- Serializa las operaciones de los dispositivos de esta cuenta.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
  for change in select value from jsonb_array_elements(changes) loop
    tab := change->>'table';
    if tab not in ('ordenpro_orders', 'ordenpro_quotes', 'ordenpro_invoices')
       or coalesce(change->>'id', '') = '' then
      raise exception 'Registro no válido';
    end if;
    if change->>'version' is null then
      if coalesce((change->>'deleted')::boolean, false) then raise exception 'Borrado no válido'; end if;
      execute pg_catalog.format('insert into public.%I (owner_id,id,data) values ($1,$2,$3)', tab)
        using auth.uid(), change->>'id', change->'data';
    else
      execute pg_catalog.format('update public.%I set data=$1, deleted_at=$2 where owner_id=$3 and id=$4 and version=$5', tab)
        using change->'data', case when coalesce((change->>'deleted')::boolean,false) then pg_catalog.now() else null end,
          auth.uid(), change->>'id', (change->>'version')::bigint;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception using errcode='40001', message='Otro dispositivo ha cambiado este trabajo. Recarga antes de guardar.'; end if;
    end if;
  end loop;
  for change in select value from jsonb_array_elements(changes) loop
    tab := change->>'table';
    -- No permitir que dos dispositivos creen trabajos activos con el mismo número.
    if not coalesce((change->>'deleted')::boolean,false)
       and coalesce(change->'data'->>'status','') <> 'Anulada'
       and coalesce(change->'data'->>'orderNum','') <> '' then
      execute pg_catalog.format('select count(*) from public.%I where owner_id=$1 and deleted_at is null and id<>$2 and data->>''orderNum''=$3 and coalesce(data->>''status'','''')<>''Anulada''', tab)
        into affected using auth.uid(), change->>'id', change->'data'->>'orderNum';
      if affected > 0 then raise exception using errcode='40001', message='Ese número ya existe en otro trabajo. Conserva tu respaldo y revisa la numeración.'; end if;
    end if;
  end loop;
  foreach tab in array array['ordenpro_orders','ordenpro_quotes','ordenpro_invoices'] loop
    execute pg_catalog.format('select coalesce(jsonb_agg(jsonb_build_object(''id'',id,''data'',data,''version'',version,''deleted_at'',deleted_at)),''[]''::jsonb) from public.%I where owner_id=$1', tab)
      into rows using auth.uid();
    result := result || jsonb_build_object(tab,rows);
  end loop;
  return result;
end $$;
revoke all on function public.ordenpro_sync(jsonb) from public, anon;
grant execute on function public.ordenpro_sync(jsonb) to authenticated;
commit;
