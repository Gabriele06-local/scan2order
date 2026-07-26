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
  let prevCount = 0;

  function notify() {
    // Sound
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 800; osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start(); osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.frequency.value = 1000; osc2.type = 'sine';
        gain2.gain.value = 0.3;
        osc2.start(); osc2.stop(ctx.currentTime + 0.2);
      }, 200);
    } catch {}
    // Vibration
    try { navigator.vibrate?.(200); } catch {}
  }

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
    const pendingNow = (data ?? []).filter((o: any) => o.status === 'submitted' || o.status === 'pending_waiter_review').length;
    if (pendingNow > prevCount && prevCount > 0) notify();
    prevCount = pendingNow;
    // Badge title
    document.title = pendingNow > 0 ? `(${pendingNow}) QR Menu` : 'QR Menu';
    // Favicon badge
    let bdg = document.getElementById('order-badge');
    if (!bdg && pendingNow > 0) {
      bdg = document.createElement('div');
      bdg.id = 'order-badge';
      bdg.style.cssText = 'position:fixed;top:0;right:0;background:red;color:white;font-size:10px;padding:2px 6px;border-radius:999px;z-index:9999;font-family:sans-serif';
      document.body.appendChild(bdg);
    }
    if (bdg) bdg.textContent = pendingNow > 0 ? String(pendingNow) : '';
    if (bdg && pendingNow === 0) bdg.remove();

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
