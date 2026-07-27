<script lang="ts">
  import { t } from '../../lib/i18n/index.svelte.ts';

  let step = $state(1);
  let restaurantName = $state('');
  let slug = $state('');
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  let done = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!restaurantName.trim() || !slug.trim() || !email.trim() || !password.trim() || !name.trim()) {
      error = 'Compila tutti i campi';
      return;
    }
    loading = true;
    error = '';

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: restaurantName.trim(),
          slug: slug.trim(),
          email: email.trim(),
          password: password,
          fullName: name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error = data.error || t('register.error_generic');
        loading = false;
        return;
      }

      done = true;
    } catch (e: any) {
      error = e?.message || t('register.error_generic');
    }
    loading = false;
  }
</script>

<div class="w-full max-w-md">
  {#if done}
    <div class="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
      <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">{t('register.success_title')}</h2>
      <p class="text-sm text-gray-500 mb-6">{t('register.success_desc')}</p>
      <a href="/staff/login" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
        {t('register.go_to_login')}
      </a>
    </div>
  {:else}
    <form onsubmit={handleSubmit} class="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
      <div class="flex items-center gap-2 mb-6">
        <div class="flex items-center gap-1.5">
          {#each [1, 2] as s}
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold {s <= step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}">
              {s}
            </div>
            {#if s < 2}
              <div class="w-6 h-px {s < step ? 'bg-blue-600' : 'bg-gray-200'}"></div>
            {/if}
          {/each}
        </div>
        <span class="text-xs text-gray-400 ml-auto">{t('register.step')} {step} / 2</span>
      </div>

      {#if step === 1}
        <h2 class="text-lg font-bold text-gray-900 mb-4">{t('register.step_restaurant')}</h2>
        <div class="space-y-4">
          <label class="block">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('register.restaurant_name')}</span>
            <input bind:value={restaurantName} required class="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label class="block">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('register.restaurant_slug')}</span>
            <input bind:value={slug} placeholder="il-mio-ristorante" required class="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
        </div>
      {:else if step === 2}
        <h2 class="text-lg font-bold text-gray-900 mb-4">{t('register.step_account')}</h2>
        <div class="space-y-4">
          <label class="block">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('register.your_name')}</span>
            <input bind:value={name} required class="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label class="block">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('register.email')}</span>
            <input type="email" bind:value={email} required class="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label class="block">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('register.password')}</span>
            <input type="password" bind:value={password} minlength="6" required class="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
        </div>
      {/if}

      {#if error}
        <p class="text-red-500 text-xs mt-4">{error}</p>
      {/if}

      <div class="flex items-center gap-3 mt-6">
        {#if step > 1}
          <button type="button" onclick={() => step--} class="flex-1 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            {t('common.back')}
          </button>
        {/if}
        {#if step < 2}
          <button type="button" onclick={() => step++} class="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            {t('common.confirm')}
          </button>
        {:else}
          <button type="submit" disabled={loading} class="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {loading ? t('register.creating') : t('register.create_btn')}
          </button>
        {/if}
      </div>
    </form>

    <p class="text-xs text-gray-400 text-center mt-4">
      {t('register.already_have_account')}
      <a href="/staff/login" class="text-blue-600 hover:underline">{t('nav.login')}</a>
    </p>
  {/if}
</div>
