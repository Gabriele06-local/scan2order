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
      <div class="relative">
        <input type={showPw ? 'text' : 'password'} placeholder="Password" bind:value={password} required
          class="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        <button type="button" onclick={() => showPw = !showPw} class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {#if showPw}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/></svg>
          {:else}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
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
