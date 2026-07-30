create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  waiter_confirmation_enabled boolean not null default true,
  operating_hours jsonb default '{}'::jsonb,
  timezone text default 'Europe/Rome',
  show_order_history boolean not null default false,
  created_at timestamptz not null default now()
);

create table tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  label text not null,
  qr_token text unique not null default encode(gen_random_bytes(16), 'hex')
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('cameriere', 'cucina', 'admin')),
  unique (tenant_id, auth_user_id)
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table menu_items (
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

create type order_status as enum (
  'submitted', 'pending_waiter_review', 'confirmed', 'in_kitchen', 'ready', 'served'
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  status order_status not null default 'submitted',
  total_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity int not null check (quantity > 0),
  notes text,
  unit_price_cents int not null
);

create table item_modifiers (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  price_cents int not null default 0,
  sort_order int not null default 0,
  available boolean not null default true
);

create table order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  modifier_id uuid references item_modifiers(id),
  name text not null,
  price_cents int not null
);

alter table orders enable row level security;
alter table order_items enable row level security;
alter table item_modifiers enable row level security;
alter table order_item_modifiers enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table tables enable row level security;
alter table staff enable row level security;
alter table tenants enable row level security;

-- RLS policies

create policy "tenants public select"
  on tenants for select
  using (true);

create policy "tables public select"
  on tables for select
  using (true);

create policy "menu_categories public select"
  on menu_categories for select
  using (true);

create policy "menu_items public select"
  on menu_items for select
  using (true);

create policy "staff select own"
  on staff for select
  using (auth.uid() = auth_user_id);
create policy "authenticated insert tenant"
  on tenants for insert
  with check (auth.role() = 'authenticated');

create policy "staff update tenant"
  on tenants for update
  using (exists (select 1 from staff where staff.tenant_id = tenants.id and staff.auth_user_id = auth.uid()));

create policy "staff insert menu_categories"
  on menu_categories for insert
  with check (exists (select 1 from staff where staff.tenant_id = menu_categories.tenant_id and staff.auth_user_id = auth.uid()));
create policy "staff update menu_categories"
  on menu_categories for update
  using (exists (select 1 from staff where staff.tenant_id = menu_categories.tenant_id and staff.auth_user_id = auth.uid()));
create policy "staff delete menu_categories"
  on menu_categories for delete
  using (exists (select 1 from staff where staff.tenant_id = menu_categories.tenant_id and staff.auth_user_id = auth.uid()));

create policy "staff insert menu_items"
  on menu_items for insert
  with check (exists (select 1 from staff where staff.tenant_id = menu_items.tenant_id and staff.auth_user_id = auth.uid()));
create policy "staff update menu_items"
  on menu_items for update
  using (exists (select 1 from staff where staff.tenant_id = menu_items.tenant_id and staff.auth_user_id = auth.uid()));
create policy "staff delete menu_items"
  on menu_items for delete
  using (exists (select 1 from staff where staff.tenant_id = menu_items.tenant_id and staff.auth_user_id = auth.uid()));

create policy "staff insert tables"
  on tables for insert
  with check (exists (select 1 from staff where staff.tenant_id = tables.tenant_id and staff.auth_user_id = auth.uid()));
create policy "staff update tables"
  on tables for update
  using (exists (select 1 from staff where staff.tenant_id = tables.tenant_id and staff.auth_user_id = auth.uid()));
create policy "staff delete tables"
  on tables for delete
  using (exists (select 1 from staff where staff.tenant_id = tables.tenant_id and staff.auth_user_id = auth.uid()));

create policy "orders insert with valid qr_token"
  on orders for insert
  with check (
    exists (
      select 1 from tables
      where tables.id = table_id
      and tables.tenant_id = tenant_id
    )
  );

create policy "order_items insert with valid order"
  on order_items for insert
  with check (
    exists (
      select 1 from orders
      where orders.id = order_id
      and orders.tenant_id = tenant_id
    )
  );

create policy "staff can read orders for their tenant"
  on orders for select
  using (
    exists (
      select 1 from staff
      where staff.tenant_id = orders.tenant_id
      and staff.auth_user_id = auth.uid()
    )
  );

-- Modifier policies
create policy "item_modifiers public select"
  on item_modifiers for select
  using (true);

create policy "staff insert item_modifiers"
  on item_modifiers for insert
  with check (exists (select 1 from staff where staff.tenant_id = item_modifiers.tenant_id and staff.auth_user_id = auth.uid()));

create policy "staff update item_modifiers"
  on item_modifiers for update
  using (exists (select 1 from staff where staff.tenant_id = item_modifiers.tenant_id and staff.auth_user_id = auth.uid()));

create policy "staff delete item_modifiers"
  on item_modifiers for delete
  using (exists (select 1 from staff where staff.tenant_id = item_modifiers.tenant_id and staff.auth_user_id = auth.uid()));

create policy "order_item_modifiers anon insert"
  on order_item_modifiers for insert
  with check (true);

create policy "staff can update orders for their tenant"
  on orders for update
  using (
    exists (
      select 1 from staff
      where staff.tenant_id = orders.tenant_id
      and staff.auth_user_id = auth.uid()
    )
  );

-- Storage bucket for dish images
insert into storage.buckets (id, name, public)
values ('dish-images', 'dish-images', true)
on conflict (id) do nothing;

create policy "Dish images public select"
  on storage.objects for select
  using (bucket_id = 'dish-images');

create policy "Staff upload dish images"
  on storage.objects for insert
  with check (
    bucket_id = 'dish-images'
    and exists (select 1 from staff where staff.auth_user_id = auth.uid())
  );

create policy "Staff delete dish images"
  on storage.objects for delete
  using (
    bucket_id = 'dish-images'
    and exists (select 1 from staff where staff.auth_user_id = auth.uid())
  );

-- Function: transition_order_status

create or replace function transition_order_status(
  p_order_id uuid,
  p_new_status order_status,
  p_actor_role text default null
) returns void as $$
declare
  v_current_status order_status;
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

  -- Validate transitions
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
$$ language plpgsql security definer;

-- Trigger: rate limit orders per table
create or replace function check_order_rate_limit() returns trigger
  language plpgsql security definer set search_path = 'public'
as $$ begin
  if exists (select 1 from staff where staff.auth_user_id = (select auth.uid())) then return new; end if;
  if (select count(*) from orders where table_id = new.table_id and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Troppi ordini da questo tavolo. Attendi qualche minuto.';
  end if;
  return new;
end; $$;

create or replace function update_order_total() returns trigger
  language plpgsql security definer set search_path = 'public'
as $$ declare v uuid; begin
  v := case when TG_TABLE_NAME = 'order_items' then new.order_id else (select order_id from order_items where id = new.order_item_id) end;
  update orders set total_cents = (select coalesce(sum(item_total+mod_total),0) from (select oi.unit_price_cents*oi.quantity as item_total, coalesce((select sum(oim.price_cents*oi.quantity) from order_item_modifiers oim where oim.order_item_id=oi.id),0) as mod_total from order_items oi where oi.order_id=v) t) where id=v;
  return new;
end; $$;

create trigger trg_check_order_rate_limit before insert on orders for each row execute function check_order_rate_limit();
create trigger trg_update_order_total_on_order_items after insert on order_items for each row execute function update_order_total();
create trigger trg_update_order_total_on_order_item_modifiers after insert on order_item_modifiers for each row execute function update_order_total();

revoke execute on function check_order_rate_limit from public, anon, authenticated;
revoke execute on function update_order_total from public, anon, authenticated;

-- Function: create_order (single transaction, SECURITY INVOKER — RLS handles auth)

create or replace function create_order(
  p_tenant_id uuid,
  p_table_id uuid,
  p_items jsonb
) returns uuid
  language plpgsql security invoker set search_path = 'public'
as $$
declare
  v_order_id uuid;
  item jsonb; v_order_item_id uuid; mod jsonb;
begin
  insert into orders (tenant_id, table_id, status, total_cents)
  values (p_tenant_id, p_table_id, 'submitted', 0) returning id into v_order_id;
  for item in select * from jsonb_array_elements(p_items) loop
    insert into order_items (order_id, menu_item_id, quantity, notes, unit_price_cents)
    values (v_order_id, (item->>'menu_item_id')::uuid, (item->>'quantity')::int, item->>'notes', (item->>'unit_price_cents')::int)
    returning id into v_order_item_id;
    if item ? 'modifiers' then
      for mod in select * from jsonb_array_elements(item->'modifiers') loop
        insert into order_item_modifiers (order_item_id, modifier_id, name, price_cents)
        values (v_order_item_id, (mod->>'id')::uuid, mod->>'name', (mod->>'price_cents')::int);
      end loop;
    end if;
  end loop;
  return v_order_id;
end;
$$;

-- Reservations

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  table_id uuid references tables(id) on delete set null,
  guest_name text not null,
  guest_email text,
  guest_phone text,
  guest_count int not null,
  reservation_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','no_show')),
  notes text,
  pre_order jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table reservations enable row level security;

create index if not exists idx_reservations_tenant_time on reservations (tenant_id, reservation_time);

do $$ begin alter publication supabase_realtime add table reservations; exception when unique_violation then null; end; $$;

drop policy if exists "reservations public insert" on reservations;
create policy "reservations public insert" on reservations
  for insert with check (
    exists (select 1 from tenants where tenants.id = tenant_id)
    and guest_name is not null and guest_name <> ''
    and guest_count > 0 and guest_count <= 50
    and reservation_time > now() - interval '1 hour'
  );

drop policy if exists "reservations staff select" on reservations;
create policy "reservations staff select" on reservations
  for select using (exists (select 1 from staff where staff.tenant_id = reservations.tenant_id and staff.auth_user_id = (select auth.uid())));

drop policy if exists "reservations staff update" on reservations;
create policy "reservations staff update" on reservations
  for update using (exists (select 1 from staff where staff.tenant_id = reservations.tenant_id and staff.auth_user_id = (select auth.uid())));

create or replace function convert_reservation_to_order(
  p_reservation_id uuid, p_table_id uuid default null
) returns uuid
  language plpgsql security invoker set search_path = 'public'
as $$
declare
  v reservations%rowtype;
  v_oid uuid; v_tid uuid; v_wc boolean; v_os public.order_status;
  item jsonb; v_oiid uuid; mod jsonb;
begin
  select * into v from reservations where id = p_reservation_id;
  if not found then raise exception 'Reservation not found'; end if;
  v_tid := v.tenant_id;
  if p_table_id is null and v.table_id is not null then p_table_id := v.table_id; end if;
  select waiter_confirmation_enabled into v_wc from tenants where id = v_tid;
  v_os := case when v_wc then 'submitted'::public.order_status else 'confirmed'::public.order_status end;
  insert into orders (tenant_id, table_id, status, total_cents) values (v_tid, p_table_id, v_os, 0) returning id into v_oid;
  for item in select * from jsonb_array_elements(v.pre_order) loop
    insert into order_items (order_id, menu_item_id, quantity, notes, unit_price_cents)
    values (v_oid, (item->>'menu_item_id')::uuid, (item->>'quantity')::int, item->>'notes', (item->>'unit_price_cents')::int)
    returning id into v_oiid;
    if item ? 'modifiers' then
      for mod in select * from jsonb_array_elements(item->'modifiers') loop
        insert into order_item_modifiers (order_item_id, modifier_id, name, price_cents)
        values (v_oiid, (mod->>'id')::uuid, mod->>'name', (mod->>'price_cents')::int);
      end loop;
    end if;
  end loop;
  update reservations set status = 'confirmed', table_id = coalesce(p_table_id, table_id), updated_at = now() where id = p_reservation_id;
  return v_oid;
end;
$$;

revoke execute on function convert_reservation_to_order from public;
grant execute on function convert_reservation_to_order to authenticated;
