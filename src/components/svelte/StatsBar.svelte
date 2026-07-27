<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';
  import { t } from '../../lib/i18n/index.svelte.ts';

  let stats = $state({ today: 0, pending: 0, total: 0 });

  async function loadStats() {
    const today = new Date().toISOString().slice(0, 10);
    const { data: orders } = await supabase
      .from('orders')
      .select('status, total_cents')
      .gte('created_at', today);
    if (!orders) return;
    stats = {
      today: orders.length,
      pending: orders.filter((o: any) => o.status === 'submitted' || o.status === 'pending_waiter_review').length,
      total: orders.reduce((s: number, o: any) => s + (o.total_cents || 0), 0),
    };
  }

  onMount(() => {
    loadStats();
    const channel = supabase
      .channel('stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  });
</script>

<div class="grid grid-cols-3 gap-3">
  <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
    <p class="text-2xl font-bold text-gray-900 tabular-nums">{stats.today}</p>
    <p class="text-xs text-gray-400 mt-0.5">{t('stats.orders_today')}</p>
  </div>
  <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
    <p class="text-2xl font-bold text-amber-600 tabular-nums">{stats.pending}</p>
    <p class="text-xs text-gray-400 mt-0.5">{t('stats.pending')}</p>
  </div>
  <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
    <p class="text-2xl font-bold text-emerald-600 tabular-nums">{(stats.total / 100).toFixed(2)}€</p>
    <p class="text-xs text-gray-400 mt-0.5">{t('stats.revenue_today')}</p>
  </div>
</div>
