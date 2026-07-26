import { supabase } from './supabase';

type OrderItemInput = {
  menu_item_id: string;
  quantity: number;
  notes?: string | null;
  unit_price_cents: number;
  modifiers?: Array<{ id: string; name: string; price_cents: number }>;
};

export async function createOrder(
  tenantId: string,
  tableId: string,
  items: OrderItemInput[]
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_order', {
    p_tenant_id: tenantId,
    p_table_id: tableId,
    p_items: items as any,
  } as any);

  if (error) {
    console.error('createOrder error:', error);
    return null;
  }

  return data as string;
}

export async function transitionOrderStatus(
  orderId: string,
  newStatus: string,
  actorRole?: 'cameriere' | 'cucina' | 'admin'
): Promise<boolean> {
  const { error } = await supabase.rpc('transition_order_status', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_actor_role: actorRole ?? null,
  } as any);

  if (error) {
    console.error('transitionOrderStatus error:', error.message || JSON.stringify(error));
    return false;
  }

  return true;
}

export async function getMenuForTenant(tenantSlug: string) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return null;

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('tenant_id', (tenant as any).id)
    .order('sort_order');

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('tenant_id', (tenant as any).id)
    .eq('available', true);

  return {
    tenant,
    categories: categories ?? [],
    items: items ?? [],
  };
}

export async function getTableByToken(token: string) {
  const { data } = await supabase
    .from('tables')
    .select('*')
    .eq('qr_token', token)
    .single();

  return data;
}
