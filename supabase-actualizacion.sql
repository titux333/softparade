-- Ejecutar UNA vez en Supabase > SQL Editor (después de supabase.sql)

-- 1) Cada cliente puede ver sus propios pedidos
create policy "ver mis pedidos" on pedidos for select using (user_id = auth.uid());

-- 2) Marca el pedido como pagado y descuenta el stock, una sola vez (solo la usa el servidor)
create or replace function marcar_pagado(p_id uuid) returns boolean language plpgsql security definer as $$
declare it jsonb; ok boolean;
begin
  update pedidos set estado = 'pagado' where id = p_id and estado <> 'pagado' returning true into ok;
  if ok then
    for it in select * from jsonb_array_elements((select items from pedidos where id = p_id)) loop
      update productos set stock = greatest(stock - (it->>'qty')::int, 0) where id = (it->>'id')::uuid;
    end loop;
    return true;
  end if;
  return false;
end $$;
revoke execute on function marcar_pagado(uuid) from public, anon, authenticated;
grant execute on function marcar_pagado(uuid) to service_role;
