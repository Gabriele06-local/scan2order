<script lang="ts">
  import { getLocale, setLocale, t } from '../../lib/i18n/index.svelte.ts';
  import type { Locale } from '../../lib/i18n/index.svelte.ts';

  let current = $derived(getLocale());

  function toggle() {
    setLocale(current === 'it' ? 'en' : 'it');
  }
</script>

<button
  onclick={toggle}
  class="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 flex items-center gap-1.5"
  title={t(`lang.${current}`)}
>
  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  {current === 'it' ? 'EN' : 'IT'}
</button>
