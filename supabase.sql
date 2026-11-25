-- Pegá todo esto en Supabase > SQL Editor > Run
create table productos(id uuid primary key default gen_random_uuid(), nombre text not null, categoria text not null check (categoria in ('celular','accesorio')), caracteristicas text, precio numeric not null, stock int default 0, imagen text, activo boolean default true, creado timestamptz default now());
create table admins(email text primary key);
create table pedidos(id uuid primary key default gen_random_uuid(), user_id uuid, email text, nombre text, telefono text, direccion text, items jsonb, total numeric, estado text default 'pendiente', enviado boolean default false, creado timestamptz default now());
create table reparaciones(id uuid primary key default gen_random_uuid(), nombre text, telefono text, equipo text, problema text, estado text default 'nueva', creado timestamptz default now());

create or replace function es_admin() returns boolean language sql security definer as $$ select exists(select 1 from admins where email = auth.jwt()->>'email') $$;

alter table productos enable row level security;
alter table admins enable row level security;
alter table pedidos enable row level security;
alter table reparaciones enable row level security;

create policy "ver productos" on productos for select using (activo or es_admin());
create policy "admin productos" on productos for all using (es_admin()) with check (es_admin());
create policy "admin pedidos ver" on pedidos for select using (es_admin());
create policy "admin pedidos editar" on pedidos for update using (es_admin());
create policy "pedir reparacion" on reparaciones for insert with check (true);
create policy "admin reparaciones ver" on reparaciones for select using (es_admin());
create policy "admin reparaciones editar" on reparaciones for update using (es_admin());

insert into storage.buckets(id,name,public) values('productos','productos',true) on conflict do nothing;
create policy "fotos publicas" on storage.objects for select using (bucket_id='productos');
create policy "fotos admin" on storage.objects for all using (bucket_id='productos' and es_admin()) with check (bucket_id='productos' and es_admin());
