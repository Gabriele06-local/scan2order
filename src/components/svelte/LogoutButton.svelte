<script lang="ts">
  import { supabase } from '../../lib/supabase';

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/staff/login';
  }
</script>

<button onclick={logout} class="text-sm text-red-600 hover:text-red-800 underline">
  Esci
</button>
