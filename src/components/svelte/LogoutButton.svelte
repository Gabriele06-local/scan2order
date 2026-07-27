<script lang="ts">
  import { supabase } from '../../lib/supabase';
  import { t } from '../../lib/i18n/index.svelte.ts';

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/staff/login';
  }
</script>

<button onclick={logout} class="text-sm text-red-600 hover:text-red-800 underline">
  {t('nav.logout')}
</button>
