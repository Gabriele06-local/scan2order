<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';

  let members = $state<Array<{ id: string; auth_user_id: string; role: string; email: string }>>([]);
  let loading = $state(true);
  let error = $state('');

  // invite form
  let showInvite = $state(false);
  let inviteEmail = $state('');
  let invitePassword = $state('');
  let inviteRole = $state('cameriere');
  let showInvitePw = $state(false);

  async function load() {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) { loading = false; error = 'Non autenticato'; return; }
    const res = await fetch('/api/staff', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { members = await res.json(); }
    else { const d = await res.json(); error = d.error || 'Errore caricamento staff'; }
    loading = false;
  }

  onMount(load);

  async function invite() {
    error = '';
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'invite', email: inviteEmail, password: invitePassword, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) { error = data.error; return; }
    showInvite = false; inviteEmail = ''; invitePassword = ''; inviteRole = 'cameriere';
    load();
  }

  async function updateRole(staffId: string, role: string) {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'update-role', staffId, role }),
    });
    load();
  }

  async function remove(staffId: string, authUserId: string, email: string) {
    if (!confirm(`Eliminare ${email}? L'utente auth verrà cancellato.`)) return;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete', staffId, authUserId }),
    });
    load();
  }

  const roleLabels: Record<string, string> = { cameriere: 'Cameriere', cucina: 'Cucina', admin: 'Admin' };
  const roleColors: Record<string, string> = { cameriere: 'bg-amber-100 text-amber-800', cucina: 'bg-blue-100 text-blue-800', admin: 'bg-purple-100 text-purple-800' };
</script>

<div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
  <div class="flex items-center justify-between mb-4">
    <h2 class="font-bold text-gray-800 flex items-center gap-2">
      <span class="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
      Staff
    </h2>
    <button onclick={() => showInvite = !showInvite} class="text-sm font-medium text-blue-600 hover:text-blue-800">
      {showInvite ? 'Annulla' : '+ Invita'}
    </button>
  </div>

  {#if showInvite}
    <div class="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
      <input bind:value={inviteEmail} type="email" placeholder="Email" class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm" />
      <div class="relative">
        <input bind:value={invitePassword} type={showInvitePw ? 'text' : 'password'} placeholder="Password temporanea" class="w-full border border-gray-200 rounded-xl px-4 py-2 pr-9 text-sm" />
        <button type="button" onclick={() => showInvitePw = !showInvitePw} class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {#if showInvitePw}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/></svg>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          {/if}
        </button>
      </div>
      <select bind:value={inviteRole} class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm">
        <option value="cameriere">Cameriere</option>
        <option value="cucina">Cucina</option>
        <option value="admin">Admin</option>
      </select>
      {#if error}<p class="text-red-600 text-sm">{error}</p>{/if}
      <button onclick={invite} class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Invita e crea account</button>
    </div>
  {/if}

  {#if error}
    <p class="text-red-600 text-sm text-center py-4">{error}</p>
  {/if}
  {#if loading}
    <p class="text-gray-400 text-sm text-center py-8">Caricamento...</p>
  {:else if members.length === 0}
    <p class="text-gray-400 text-sm text-center py-8">Nessun membro staff.</p>
  {:else}
    <div class="space-y-1">
      {#each members as m (m.id)}
        <div class="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg transition-colors">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-sm font-medium text-gray-700 truncate">{m.email}</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full {roleColors[m.role] ?? 'bg-gray-100'}">{roleLabels[m.role] ?? m.role}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <select
              value={m.role}
              onchange={(e) => updateRole(m.id, (e.target as HTMLSelectElement).value)}
              class="text-xs border border-gray-200 rounded-lg px-2 py-1"
            >
              <option value="cameriere" selected={m.role === 'cameriere'}>Cameriere</option>
              <option value="cucina" selected={m.role === 'cucina'}>Cucina</option>
              <option value="admin" selected={m.role === 'admin'}>Admin</option>
            </select>
            <button onclick={() => remove(m.id, m.auth_user_id, m.email)} class="text-xs text-red-400 hover:text-red-600">Elimina</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
