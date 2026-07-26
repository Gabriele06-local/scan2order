<script lang="ts">
  import { onMount } from 'svelte';

  let now = $state(new Date());

  onMount(() => {
    const id = setInterval(() => now = new Date(), 1000);
    return () => clearInterval(id);
  });

  let timeStr = $derived(now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
  let dateStr = $derived(now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }));
</script>

<span class="tabular-nums text-sm font-medium text-gray-700 bg-gray-100 rounded-xl px-3 py-1.5">{dateStr}, {timeStr}</span>
