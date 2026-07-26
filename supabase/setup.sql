-- ============================================================
-- QR Menu - Setup completo per Supabase Cloud
-- Esegui tutto questo SQL nel Supabase SQL Editor
-- ============================================================

-- 1. Schema tables

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  waiter_confirmation_enabled boolean not null default true,
  operating_hours jsonb default '{}'::jsonb,
  timezone text default 'Europe/Rome',
  created_at timestamptz not null default now()
);

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  label text not null,
  qr_token text unique not null default encode(gen_random_bytes(16), 'hex')
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('cameriere', 'cucina', 'admin')),
  unique (tenant_id, auth_user_id)
);

create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null,
  available boolean not null default true,
  image_url text,
  kcal int,
  allergens text
);

-- add columns if upgrading existing install
alter table menu_items add column if not exists kcal int;
alter table menu_items add column if not exists allergens text;
alter table tenants add column if not exists operating_hours jsonb default '{}'::jsonb;
alter table tenants add column if not exists timezone text default 'Europe/Rome';
alter table tenants add column if not exists show_order_history boolean not null default false;

do $$ begin
  create type order_status as enum (
    'submitted', 'pending_waiter_review', 'confirmed', 'in_kitchen', 'ready', 'served'
  );
exception when duplicate_object then null;
end $$;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  status order_status not null default 'submitted',
  total_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity int not null check (quantity > 0),
  notes text,
  unit_price_cents int not null
);

create table if not exists item_modifiers (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  price_cents int not null default 0,
  sort_order int not null default 0,
  available boolean not null default true
);

create table if not exists order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  modifier_id uuid references item_modifiers(id),
  name text not null,
  price_cents int not null
);

-- 2. Indexes

create index if not exists idx_tables_qr_token on tables (qr_token);
create index if not exists idx_orders_tenant_status on orders (tenant_id, status);

-- 3. RLS

alter table tenants enable row level security;
alter table tables enable row level security;
alter table staff enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table item_modifiers enable row level security;
alter table order_item_modifiers enable row level security;

-- Public read for tenants, tables, menu
drop policy if exists "tenants public select" on tenants;
create policy "tenants public select" on tenants
  for select using (true);

drop policy if exists "tables public select" on tables;
create policy "tables public select" on tables
  for select using (true);

drop policy if exists "menu_categories public select" on menu_categories;
create policy "menu_categories public select" on menu_categories
  for select using (true);

drop policy if exists "menu_items public select" on menu_items;
create policy "menu_items public select" on menu_items
  for select using (true);

drop policy if exists "staff select own" on staff;
create policy "staff select own" on staff
  for select using ((select auth.uid()) = auth_user_id);

drop policy if exists "staff update tenant" on tenants;
create policy "staff update tenant" on tenants
  for update using (exists (select 1 from staff where staff.tenant_id = tenants.id and staff.auth_user_id = (select auth.uid())));

-- Staff CRUD policies for menu & tables
drop policy if exists "staff insert menu_categories" on menu_categories;
create policy "staff insert menu_categories" on menu_categories
  for insert with check (exists (select 1 from staff where staff.tenant_id = menu_categories.tenant_id and staff.auth_user_id = (select auth.uid())));
drop policy if exists "staff update menu_categories" on menu_categories;
create policy "staff update menu_categories" on menu_categories
  for update using (exists (select 1 from staff where staff.tenant_id = menu_categories.tenant_id and staff.auth_user_id = (select auth.uid())));
drop policy if exists "staff delete menu_categories" on menu_categories;
create policy "staff delete menu_categories" on menu_categories
  for delete using (exists (select 1 from staff where staff.tenant_id = menu_categories.tenant_id and staff.auth_user_id = (select auth.uid())));

drop policy if exists "staff insert menu_items" on menu_items;
create policy "staff insert menu_items" on menu_items
  for insert with check (exists (select 1 from staff where staff.tenant_id = menu_items.tenant_id and staff.auth_user_id = (select auth.uid())));
drop policy if exists "staff update menu_items" on menu_items;
create policy "staff update menu_items" on menu_items
  for update using (exists (select 1 from staff where staff.tenant_id = menu_items.tenant_id and staff.auth_user_id = (select auth.uid())));
drop policy if exists "staff delete menu_items" on menu_items;
create policy "staff delete menu_items" on menu_items
  for delete using (exists (select 1 from staff where staff.tenant_id = menu_items.tenant_id and staff.auth_user_id = (select auth.uid())));

drop policy if exists "staff insert tables" on tables;
create policy "staff insert tables" on tables
  for insert with check (exists (select 1 from staff where staff.tenant_id = tables.tenant_id and staff.auth_user_id = (select auth.uid())));
drop policy if exists "staff update tables" on tables;
create policy "staff update tables" on tables
  for update using (exists (select 1 from staff where staff.tenant_id = tables.tenant_id and staff.auth_user_id = (select auth.uid())));
drop policy if exists "staff delete tables" on tables;
create policy "staff delete tables" on tables
  for delete using (exists (select 1 from staff where staff.tenant_id = tables.tenant_id and staff.auth_user_id = (select auth.uid())));

-- Orders: insert allowed for anon with valid table
drop policy if exists "orders anon insert" on orders;
create policy "orders anon insert" on orders
  for insert with check (
    exists (select 1 from tables where tables.id = table_id and tables.tenant_id = tenant_id)
  );

drop policy if exists "order_items anon insert" on order_items;
create policy "order_items anon insert" on order_items
  for insert with check (
    exists (select 1 from orders where orders.id = order_id)
  );

drop policy if exists "order_item_modifiers anon insert" on order_item_modifiers;
create policy "order_item_modifiers anon insert" on order_item_modifiers
  for insert with check (
    exists (select 1 from order_items where order_items.id = order_item_id)
  );

-- Modifiers: public select, staff CRUD
drop policy if exists "item_modifiers public select" on item_modifiers;
create policy "item_modifiers public select" on item_modifiers
  for select using (true);

drop policy if exists "staff insert item_modifiers" on item_modifiers;
create policy "staff insert item_modifiers" on item_modifiers
  for insert with check (exists (select 1 from staff where staff.tenant_id = item_modifiers.tenant_id and staff.auth_user_id = (select auth.uid())));
drop policy if exists "staff update item_modifiers" on item_modifiers;
create policy "staff update item_modifiers" on item_modifiers
  for update using (exists (select 1 from staff where staff.tenant_id = item_modifiers.tenant_id and staff.auth_user_id = (select auth.uid())));
drop policy if exists "staff delete item_modifiers" on item_modifiers;
create policy "staff delete item_modifiers" on item_modifiers
  for delete using (exists (select 1 from staff where staff.tenant_id = item_modifiers.tenant_id and staff.auth_user_id = (select auth.uid())));

-- Order item modifiers: anon insert for customer orders
drop policy if exists "order_item_modifiers anon insert" on order_item_modifiers;
create policy "order_item_modifiers anon insert" on order_item_modifiers
  for insert with check (true);

-- Staff read/update
drop policy if exists "staff select orders" on orders;
create policy "staff select orders" on orders
  for select using (
    exists (
      select 1 from staff
      where staff.tenant_id = orders.tenant_id
      and staff.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "staff update orders" on orders;
create policy "staff update orders" on orders
  for update using (
    exists (
      select 1 from staff
      where staff.tenant_id = orders.tenant_id
      and staff.auth_user_id = (select auth.uid())
    )
  );

-- 4. Functions

create or replace function transition_order_status(
  p_order_id uuid,
  p_new_status public.order_status,
  p_actor_role text default null
) returns void
  language plpgsql
  security definer
  set search_path = 'public'
as $$
declare
  v_current_status public.order_status;
  v_tenant_id uuid;
  v_waiter_confirmed boolean;
begin
  select status, tenant_id into v_current_status, v_tenant_id
  from orders where id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  select waiter_confirmation_enabled into v_waiter_confirmed
  from tenants where id = v_tenant_id;

  if v_current_status = 'submitted' and p_new_status = 'pending_waiter_review' then
    if not v_waiter_confirmed then
      raise exception 'Waiter confirmation is disabled for this tenant';
    end if;
  elsif v_current_status = 'submitted' and p_new_status = 'confirmed' then
    if v_waiter_confirmed then
      raise exception 'Waiter confirmation is enabled; must go through pending_waiter_review';
    end if;
  elsif v_current_status = 'pending_waiter_review' and p_new_status = 'confirmed' then
    if p_actor_role is null or p_actor_role != 'cameriere' then
      raise exception 'Only cameriere can confirm orders';
    end if;
  elsif v_current_status = 'confirmed' and p_new_status = 'in_kitchen' then
    if p_actor_role is null or p_actor_role != 'cucina' then
      raise exception 'Only cucina can move orders to in_kitchen';
    end if;
  elsif v_current_status = 'in_kitchen' and p_new_status = 'ready' then
    if p_actor_role is null or p_actor_role != 'cucina' then
      raise exception 'Only cucina can mark orders as ready';
    end if;
  elsif v_current_status = 'ready' and p_new_status = 'served' then
    if p_actor_role is null or p_actor_role != 'cameriere' then
      raise exception 'Only cameriere can mark orders as served';
    end if;
  else
    raise exception 'Invalid status transition from % to %', v_current_status, p_new_status;
  end if;

  update orders set status = p_new_status, updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function create_order(
  p_tenant_id uuid,
  p_table_id uuid,
  p_items jsonb
) returns uuid
  language plpgsql
  security definer
  set search_path = 'public'
as $$
declare
  v_order_id uuid;
  v_total int := 0;
  item jsonb;
  v_order_item_id uuid;
  mod jsonb;
begin
  insert into orders (tenant_id, table_id, status, total_cents)
  values (p_tenant_id, p_table_id, 'submitted', 0)
  returning id into v_order_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, menu_item_id, quantity, notes, unit_price_cents)
    values (
      v_order_id,
      (item->>'menu_item_id')::uuid,
      (item->>'quantity')::int,
      item->>'notes',
      (item->>'unit_price_cents')::int
    )
    returning id into v_order_item_id;

    v_total := v_total + ((item->>'quantity')::int * (item->>'unit_price_cents')::int);

    -- insert modifiers if present
    if item ? 'modifiers' then
      for mod in select * from jsonb_array_elements(item->'modifiers')
      loop
        insert into order_item_modifiers (order_item_id, modifier_id, name, price_cents)
        values (
          v_order_item_id,
          (mod->>'id')::uuid,
          mod->>'name',
          (mod->>'price_cents')::int
        );
        v_total := v_total + ((item->>'quantity')::int * (mod->>'price_cents')::int);
      end loop;
    end if;
  end loop;

  update orders set total_cents = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

-- 5. Seed data

insert into tenants (id, slug, name, operating_hours) values
  ('d0000000-0000-0000-0000-000000000001', 'demo', 'Ristorante Demo',
   '{"monday":[{"open":"09:00","close":"23:00"}],"tuesday":[{"open":"09:00","close":"23:00"}],"wednesday":[{"open":"09:00","close":"23:00"}],"thursday":[{"open":"09:00","close":"23:00"}],"friday":[{"open":"09:00","close":"23:59"}],"saturday":[{"open":"09:00","close":"23:59"}],"sunday":[{"open":"10:00","close":"22:00"}]}')
on conflict (id) do nothing;

insert into tables (id, tenant_id, label, qr_token) values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Tavolo 1', 'demo-tavolo-1')
on conflict (id) do nothing;

insert into menu_categories (id, tenant_id, name, sort_order) values
  ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Pizze', 1),
  ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Bevande', 2)
on conflict (id) do nothing;

insert into menu_items (id, category_id, tenant_id, name, description, price_cents, kcal, allergens) values
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Margherita', 'Pomodoro, mozzarella, basilico', 800, 680, 'Glutine, Lattosio'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Diavola', 'Pomodoro, mozzarella, salame piccante', 1000, 750, 'Glutine, Lattosio'),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Quattro Stagioni', 'Pomodoro, mozzarella, funghi, carciofi, prosciutto', 1100, 720, 'Glutine, Lattosio'),
  ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Acqua Naturale', '50cl', 250, 0, null),
  ('a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Coca Cola', '33cl', 350, 140, null)
on conflict (id) do nothing;

-- Cleanup old/named policies (from earlier migrations)
drop policy if exists "menu_categories are public for tenant" on menu_categories;
drop policy if exists "menu_items are public for tenant" on menu_items;
drop policy if exists "orders insert with valid qr_token" on orders;
drop policy if exists "staff can read orders for their tenant" on orders;
drop policy if exists "staff can update orders for their tenant" on orders;
drop policy if exists "order_items insert with valid order" on order_items;

-- Revoke EXECUTE on transition_order_status from anon (only staff should call it)
revoke execute on function public.transition_order_status from anon;

-- 6. Demo staff accounts
-- Crea gli utenti auth su Supabase Dashboard -> Authentication -> Users:
--   - admin@demo.it  (password: demo1234)
--   - cameriere@demo.it (password: demo1234)
--   - cucina@demo.it (password: demo1234)
-- Poi sostituisci gli UUID qui sotto con quelli generati da Supabase.
-- Oppure usa questo comando via API:
--   curl -X POST https://<project>.supabase.co/auth/v1/admin/users \
--     -H "apikey: <service_role_key>" \
--     -H "Authorization: Bearer <service_role_key>" \
--     -H "Content-Type: application/json" \
--     -d '{"email":"admin@demo.it","password":"demo1234","email_confirm":true}'
insert into staff (tenant_id, auth_user_id, role) values
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'cameriere'),
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'cucina')
on conflict (tenant_id, auth_user_id) do nothing;
