import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '../../lib/admin.server';

const anonKey = import.meta.env.PUBLIC_SUPABASE_KEY;
const url = import.meta.env.PUBLIC_SUPABASE_URL;

async function getUserFromRequest(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const sb = createClient(url, anonKey);
  const { data } = await sb.auth.getUser(token);
  return data.user;
}

async function getAdminStaffRecord(userId: string) {
  try {
    const admin = getAdminClient();
    const { data } = await admin.from('staff').select('tenant_id, role').eq('auth_user_id', userId).single();
    return data as { tenant_id: string; role: string } | null;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { action } = body;

  const user = await getUserFromRequest(request);
  if (!user) return new Response(JSON.stringify({ error: 'Non autenticato' }), { status: 401 });

  const staff = await getAdminStaffRecord(user.id);
  if (!staff || staff.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 403 });
  }

  const tenantId = staff.tenant_id;
  const admin = getAdminClient();

  try {
    switch (action) {
      case 'invite': {
        const { email, password, role } = body;
        const { data: authUser, error } = await admin.auth.admin.createUser({
          email, password, email_confirm: true,
        });
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        await admin.from('staff').insert({ tenant_id: tenantId, auth_user_id: authUser.user.id, role });
        return new Response(JSON.stringify({ ok: true }));
      }
      case 'update-role': {
        const { staffId, role } = body;
        await admin.from('staff').update({ role }).eq('id', staffId).eq('tenant_id', tenantId);
        return new Response(JSON.stringify({ ok: true }));
      }
      case 'delete': {
        const { staffId, authUserId } = body;
        await admin.from('staff').delete().eq('id', staffId).eq('tenant_id', tenantId);
        try { await admin.auth.admin.deleteUser(authUserId); } catch {}
        return new Response(JSON.stringify({ ok: true }));
      }
      default:
        return new Response(JSON.stringify({ error: 'Azione sconosciuta' }), { status: 400 });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user) return new Response(JSON.stringify({ error: 'Non autenticato' }), { status: 401 });

  const staff = await getAdminStaffRecord(user.id);
  if (!staff || staff.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 403 });
  }

  const tenantId = staff.tenant_id;
  const admin = getAdminClient();

  const { data: members } = await admin.from('staff').select('id, auth_user_id, role').eq('tenant_id', tenantId);
  const list = await Promise.all((members ?? []).map(async (m: any) => {
    try {
      const { data: u } = await admin.auth.admin.getUserById(m.auth_user_id);
      return { id: m.id, auth_user_id: m.auth_user_id, role: m.role, email: (u as any)?.user?.email ?? '?' };
    } catch {
      return { id: m.id, auth_user_id: m.auth_user_id, role: m.role, email: '?' };
    }
  }));

  return new Response(JSON.stringify(list));
};
