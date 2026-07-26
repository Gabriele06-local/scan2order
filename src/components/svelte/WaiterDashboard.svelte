<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';
  import { transitionOrderStatus } from '../../lib/orders';

  interface OrderItem {
    name: string; quantity: number; notes?: string; modifiers?: string;
  }

  interface OrderRow {
    id: string; table_label: string; status: string;
    total_cents: number; created_at: string; items: OrderItem[];
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
    orders = await Promise.all((data ?? []).map(async (o: any) => {
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, notes, menu_items(name), order_item_modifiers(name)')
        .eq('order_id', o.id);
      return {
        id: o.id, table_label: o.tables?.label ?? '?',
        status: o.status, total_cents: o.total_cents, created_at: o.created_at,
        items: (items ?? []).map((i: any) => ({
          name: i.menu_items?.name ?? '?', quantity: i.quantity,
          notes: i.notes,
          modifiers: i.order_item_modifiers?.length > 0
            ? i.order_item_modifiers.map((m: any) => m.name).join(', ') : undefined,
        })),
      };
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
          <div class="rounded-xl border-2 border-amber-100 bg-amber-50 p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold text-gray-900">{o.table_label}</span>
                <span class="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <button onclick={() => confirmOrder(o)}
                class="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm whitespace-nowrap">
                Conferma
              </button>
            </div>
            <div class="space-y-1 mb-2">
              {#each o.items as item}
                <div class="text-sm text-gray-700">
                  <span class="font-medium">×{item.quantity}</span> {item.name}
                  {#if item.modifiers}
                    <span class="text-xs text-gray-400 ml-2">+{item.modifiers}</span>
                  {/if}
                  {#if item.notes}
                    <p class="text-xs text-gray-400 ml-4">Note: {item.notes}</p>
                  {/if}
                </div>
              {/each}
            </div>
            <div class="text-sm font-medium text-gray-600">{(o.total_cents / 100).toFixed(2)}€</div>
          </div>
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
          <div class="rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold text-gray-900">{o.table_label}</span>
                <span class="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <button onclick={() => markServed(o.id)}
                class="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm whitespace-nowrap">
                Servito
              </button>
            </div>
            <div class="space-y-1 mb-2">
              {#each o.items as item}
                <div class="text-sm text-gray-700">
                  <span class="font-medium">×{item.quantity}</span> {item.name}
                  {#if item.modifiers}
                    <span class="text-xs text-gray-400 ml-2">+{item.modifiers}</span>
                  {/if}
                  {#if item.notes}
                    <p class="text-xs text-gray-400 ml-4">Note: {item.notes}</p>
                  {/if}
                </div>
              {/each}
            </div>
            <div class="text-sm font-medium text-gray-600">{(o.total_cents / 100).toFixed(2)}€</div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
