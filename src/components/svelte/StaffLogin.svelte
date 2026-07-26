<script lang="ts">
  import { supabase } from '../../lib/supabase';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  let showPw = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { error = authError.message; loading = false; return; }
    if (!data.user) { error = 'Login fallito'; loading = false; return; }

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch(
      `${import.meta.env.PUBLIC_SUPABASE_URL}/rest/v1/staff?auth_user_id=eq.${data.user.id}&select=role`,
      { headers: { apikey: import.meta.env.PUBLIC_SUPABASE_KEY, Authorization: `Bearer ${token}` } }
    );

    loading = false;
    if (!res.ok) { const t = await res.text(); error = `Errore (${res.status})`; await supabase.auth.signOut(); return; }

    const rows = await res.json();
    if (!rows?.length) { error = 'Utente non autorizzato'; await supabase.auth.signOut(); return; }

    const role = rows[0].role;
    const target = role === 'cameriere' ? '/staff/cameriere' : role === 'cucina' ? '/staff/cucina' : role === 'admin' ? '/staff/admin' : '/staff/login';
    window.location.href = target;
  }
</script>

<div class="w-full max-w-sm">
  <div class="bg-white rounded-2xl border border-gray-100 p-8 shadow-lg">
    <h1 class="text-xl font-bold text-gray-900 mb-6 text-center">Accesso Staff</h1>
    <form onsubmit={handleSubmit} class="space-y-4">
      <input type="email" placeholder="Email" bind:value={email} required
        class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
      <div class="flex gap-2 items-start">
        <input type={showPw ? 'text' : 'password'} placeholder="Password" bind:value={password} required
          class="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        <button type="button" onclick={() => showPw = !showPw} class="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500 shrink-0" title={showPw ? 'Nascondi password' : 'Mostra password'}>
          {#if showPw}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
          {:else}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          {/if}
        </button>
      </div>
      {#if error}
        <p class="text-red-600 text-sm text-center">{error}</p>
      {/if}
      <button type="submit" disabled={loading}
        class="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20">
        {loading ? 'Accesso in corso…' : 'Accedi'}
      </button>
    </form>
  </div>
</div>
