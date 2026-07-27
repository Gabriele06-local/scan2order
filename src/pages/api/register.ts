import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.PRIVATE_SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await request.json();
    const { restaurantName, slug, email, password, fullName } = body;

    if (!restaurantName || !slug || !email || !password || !fullName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const { data: existing } = await supabase.from('tenants').select('id').eq('slug', cleanSlug).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: 'Slug already taken' }), { status: 409 });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: authError?.message || 'Failed to create user' }), { status: 500 });
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: restaurantName, slug: cleanSlug })
      .select()
      .single();

    if (tenantError || !tenant) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: tenantError?.message || 'Failed to create tenant' }), { status: 500 });
    }

    const { error: staffError } = await supabase
      .from('staff')
      .insert({ tenant_id: (tenant as any).id, auth_user_id: authData.user.id, role: 'admin' });

    if (staffError) {
      await supabase.from('tenants').delete().eq('id', (tenant as any).id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: staffError.message }), { status: 500 });
    }

    await supabase.from('menu_categories').insert([
      { tenant_id: (tenant as any).id, name: 'Antipasti', sort_order: 1 },
      { tenant_id: (tenant as any).id, name: 'Primi', sort_order: 2 },
      { tenant_id: (tenant as any).id, name: 'Secondi', sort_order: 3 },
      { tenant_id: (tenant as any).id, name: 'Dolci', sort_order: 4 },
    ]);

    await supabase.from('tables').insert([
      { tenant_id: (tenant as any).id, label: 'Tavolo 1' },
      { tenant_id: (tenant as any).id, label: 'Tavolo 2' },
      { tenant_id: (tenant as any).id, label: 'Tavolo 3' },
      { tenant_id: (tenant as any).id, label: 'Tavolo 4' },
    ]);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), { status: 500 });
  }
};
