<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';
  import { transitionOrderStatus } from '../../lib/orders';
  import OrderCard from './OrderCard.svelte';

  interface OrderRow {
    id: string;
    table_label: string;
    status: string;
    total_cents: number;
    created_at: string;
  }

  let orders: OrderRow[] = $state([]);

  onMount(() => {
    loadOrders();
    const channel = supabase
      .channel('waiter-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  });

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total_cents, created_at, tables(label)')
      .in('status', ['submitted', 'pending_waiter_review', 'ready'])
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    orders = (data ?? []).map((o: any) => ({
      id: o.id, table_label: o.tables?.label ?? '?',
      status: o.status, total_cents: o.total_cents, created_at: o.created_at,
    }));
  }

  async function confirmOrder(o: OrderRow) {
    if (o.status === 'submitted') {
      if (!await transitionOrderStatus(o.id, 'pending_waiter_review')) return;
    }
    if (await transitionOrderStatus(o.id, 'confirmed', 'cameriere')) loadOrders();
  }

  async function markServed(id: string) {
    if (await transitionOrderStatus(id, 'served', 'cameriere')) loadOrders();
  }

  let pendingOrders = $derived(orders.filter((o) => o.status === 'submitted' || o.status === 'pending_waiter_review'));
  let readyOrders = $derived(orders.filter((o) => o.status === 'ready'));
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <section class="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
    <div class="flex items-center gap-2 mb-4">
      <span class="w-2 h-2 rounded-full bg-amber-400"></span>
      <h2 class="font-bold text-amber-800">Da confermare</h2>
      <span class="ml-auto text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
    </div>
    {#if pendingOrders.length === 0}
      <p class="text-gray-400 text-sm text-center py-8">Nessun ordine in attesa.</p>
    {:else}
      <div class="space-y-3">
        {#each pendingOrders as o (o.id)}
          <OrderCard order={o} actions={[{ label: 'Conferma', status: 'confirmed', action: () => confirmOrder(o) }]} />
        {/each}
      </div>
    {/if}
  </section>

  <section class="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
    <div class="flex items-center gap-2 mb-4">
      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
      <h2 class="font-bold text-emerald-800">Da servire</h2>
      <span class="ml-auto text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">{readyOrders.length}</span>
    </div>
    {#if readyOrders.length === 0}
      <p class="text-gray-400 text-sm text-center py-8">Nessun ordine pronto.</p>
    {:else}
      <div class="space-y-3">
        {#each readyOrders as o (o.id)}
          <OrderCard order={o} actions={[{ label: 'Servito', status: 'served', action: () => markServed(o.id) }]} />
        {/each}
      </div>
    {/if}
  </section>
</div>
