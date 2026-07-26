import type { APIRoute } from 'astro';
import { getAdminClient } from '../../lib/admin.server';

const RESET_SECRET = import.meta.env.RESET_SECRET || 'demo-reset-2026';

export const GET: APIRoute = async ({ request }) => {
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret !== RESET_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = getAdminClient();
  const tenantId = 'd0000000-0000-0000-0000-000000000001';
  const demoEmails = ['admin@demo.it', 'cameriere@demo.it', 'cucina@demo.it'];

  try {
    // Delete orders (clean slate)
    await admin.from('orders').delete().gte('created_at', '2020-01-01');
    // Reset menu items with fixed values
    await admin.from('menu_items').delete().eq('tenant_id', tenantId);
    await admin.from('menu_categories').delete().eq('tenant_id', tenantId);
    await admin.from('item_modifiers').delete().eq('tenant_id', tenantId);

    // Re-insert categories
    await admin.from('menu_categories').insert([
      { id: 'c0000000-0000-0000-0000-000000000001', tenant_id: tenantId, name: 'Pizze', sort_order: 1 },
      { id: 'c0000000-0000-0000-0000-000000000002', tenant_id: tenantId, name: 'Bevande', sort_order: 2 },
    ]);

    // Re-insert menu items
    await admin.from('menu_items').insert([
      { id: 'a0000000-0000-0000-0000-000000000001', category_id: 'c0000000-0000-0000-0000-000000000001', tenant_id: tenantId, name: 'Margherita', description: 'Pomodoro, mozzarella, basilico', price_cents: 800, kcal: 680, allergens: 'Glutine, Lattosio' },
      { id: 'a0000000-0000-0000-0000-000000000002', category_id: 'c0000000-0000-0000-0000-000000000001', tenant_id: tenantId, name: 'Diavola', description: 'Pomodoro, mozzarella, salame piccante', price_cents: 1000, kcal: 750, allergens: 'Glutine, Lattosio' },
      { id: 'a0000000-0000-0000-0000-000000000003', category_id: 'c0000000-0000-0000-0000-000000000001', tenant_id: tenantId, name: 'Quattro Stagioni', description: 'Pomodoro, mozzarella, funghi, carciofi, prosciutto', price_cents: 1100, kcal: 720, allergens: 'Glutine, Lattosio' },
      { id: 'a0000000-0000-0000-0000-000000000004', category_id: 'c0000000-0000-0000-0000-000000000002', tenant_id: tenantId, name: 'Acqua Naturale', description: '50cl', price_cents: 250, kcal: 0, allergens: null },
      { id: 'a0000000-0000-0000-0000-000000000005', category_id: 'c0000000-0000-0000-0000-000000000002', tenant_id: tenantId, name: 'Coca Cola', description: '33cl', price_cents: 350, kcal: 140, allergens: null },
    ]);

    // Reset tenant settings
    await admin.from('tenants').update({
      name: 'Ristorante Demo',
      waiter_confirmation_enabled: true,
      show_order_history: false,
      operating_hours: {
        monday: [{ open: '09:00', close: '23:00' }],
        tuesday: [{ open: '09:00', close: '23:00' }],
        wednesday: [{ open: '09:00', close: '23:00' }],
        thursday: [{ open: '09:00', close: '23:00' }],
        friday: [{ open: '09:00', close: '23:59' }],
        saturday: [{ open: '09:00', close: '23:59' }],
        sunday: [{ open: '10:00', close: '22:00' }],
      },
    }).eq('id', tenantId);

    return new Response(JSON.stringify({ ok: true, message: 'Demo resettata' }));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
