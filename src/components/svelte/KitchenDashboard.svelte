<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';
  import { transitionOrderStatus } from '../../lib/orders';

  interface OrderRow {
    id: string; table_label: string; status: string;
    total_cents: number; created_at: string;
    items: Array<{ name: string; quantity: number; notes?: string; modifiers?: string }>;
  }

  let orders: OrderRow[] = $state([]);
  let prevConfirmed = 0;

  function notify() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 600; osc.type = 'triangle';
      gain.gain.value = 0.4;
      osc.start(); osc.stop(ctx.currentTime + 0.12);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.frequency.value = 900; osc2.type = 'triangle';
        gain2.gain.value = 0.4;
        osc2.start(); osc2.stop(ctx.currentTime + 0.2);
      }, 150);
    } catch {}
    try { navigator.vibrate?.(300); } catch {}
  }

  onMount(() => {
    loadOrders();
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  });

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total_cents, created_at, tables(label)')
      .in('status', ['confirmed', 'in_kitchen'])
      .order('created_at', { ascending: true });
    if (error) { console.error(error); return; }
    const confirmedNow = (data ?? []).filter((o: any) => o.status === 'confirmed').length;
    if (confirmedNow > prevConfirmed && prevConfirmed > 0) notify();
    prevConfirmed = confirmedNow;
    document.title = confirmedNow > 0 ? `(${confirmedNow}) QR Menu` : 'QR Menu';
    let oldBdg = document.getElementById('kitchen-badge');
    if (oldBdg && confirmedNow === 0) oldBdg.remove();
    if (confirmedNow > 0) {
      if (!oldBdg) {
        oldBdg = document.createElement('div');
        oldBdg.id = 'kitchen-badge';
        oldBdg.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#ef4444;color:white;font-size:14px;font-weight:700;padding:8px 20px;border-radius:999px;z-index:9999;font-family:sans-serif;box-shadow:0 4px 12px rgba(239,68,68,0.4);animation:pulse 2s infinite';
        const s = document.createElement('style');
        s.id = 'kitchen-badge-style';
        s.textContent = '@keyframes pulse{0%{opacity:1;transform:translateX(-50%) scale(1)}50%{opacity:0.85;transform:translateX(-50%) scale(1.05)}100%{opacity:1;transform:translateX(-50%) scale(1)}}';
        document.head.appendChild(s);
        document.body.appendChild(oldBdg);
      }
      oldBdg.textContent = confirmedNow === 1 ? '1 nuovo ordine' : `${confirmedNow} nuovi ordini`;
    }

    orders = await Promise.all((data ?? []).map(async (o: any) => {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, notes, menu_items(name), order_item_modifiers(name)')
        .eq('order_id', o.id);
      return {
        id: o.id, table_label: o.tables?.label ?? '?',
        status: o.status, total_cents: o.total_cents, created_at: o.created_at,
        items: (orderItems ?? []).map((i: any) => ({
          name: i.menu_items?.name ?? '?', quantity: i.quantity,
          notes: i.notes,
          modifiers: i.order_item_modifiers?.length > 0
            ? i.order_item_modifiers.map((m: any) => m.name).join(', ') : undefined,
        })),
      };
    }));
  }

  async function startCooking(id: string) {
    if (await transitionOrderStatus(id, 'in_kitchen', 'cucina')) loadOrders();
  }

  async function markReady(id: string) {
    if (await transitionOrderStatus(id, 'ready', 'cucina')) loadOrders();
  }

  function printOrders() {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`<html><head><title>Ordini</title><style>
      body{font-family:monospace;padding:20px;font-size:14px}
      h1{font-size:18px;margin-bottom:20px}
      .order{border-bottom:2px dashed #999;padding:12px 0;margin-bottom:12px}
      .order:last-child{border:0}
      .header{font-weight:bold;font-size:16px;margin-bottom:4px}
      .item{margin:2px 0;padding-left:12px}
      .mod{color:#666;font-size:12px;padding-left:24px}
      .time{color:#666;font-size:12px}
      @media print{body{padding:10px}.order{break-inside:avoid}}
    </style></head><body>
    <h1>Ordini in cucina</h1>
    ${orders.map((o: any) => `
      <div class="order">
        <div class="header">${o.table_label}</div>
        <div class="time">${new Date(o.created_at).toLocaleString('it-IT')}</div>
        ${o.items.map((i: any) => `
          <div class="item">×${i.quantity} ${i.name}</div>
          ${i.modifiers ? `<div class="mod">+ ${i.modifiers}</div>` : ''}
          ${i.notes ? `<div class="mod">Note: ${i.notes}</div>` : ''}
        `).join('')}
      </div>
    `).join('')}
    <script>window.print();window.close();<\/script>
    </body></html>`);
    printWin.document.close();
  }

  let confirmedOrders = $derived(orders.filter((o) => o.status === 'confirmed'));
  let cookingOrders = $derived(orders.filter((o) => o.status === 'in_kitchen'));
</script>

<div class="flex justify-end mb-4">
  <button onclick={printOrders} class="text-sm bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center gap-2">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
    Stampa ordini
  </button>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <section class="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm">
    <div class="flex items-center gap-2 mb-4">
      <span class="w-2 h-2 rounded-full bg-blue-500"></span>
      <h2 class="font-bold text-blue-800">Nuovi ordini</h2>
      <span class="ml-auto text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{confirmedOrders.length}</span>
    </div>
    {#if confirmedOrders.length === 0}
      <p class="text-gray-400 text-sm text-center py-8">Nessun nuovo ordine.</p>
    {:else}
      <div class="space-y-3">
        {#each confirmedOrders as o (o.id)}
          <div class="rounded-xl border-2 border-blue-100 bg-blue-50 p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold text-gray-900">{o.table_label}</span>
                <span class="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <button onclick={() => startCooking(o.id)}
                class="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm">
                In preparazione
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

  <section class="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm">
    <div class="flex items-center gap-2 mb-4">
      <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
      <h2 class="font-bold text-indigo-800">In preparazione</h2>
      <span class="ml-auto text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{cookingOrders.length}</span>
    </div>
    {#if cookingOrders.length === 0}
      <p class="text-gray-400 text-sm text-center py-8">Niente in preparazione.</p>
    {:else}
      <div class="space-y-3">
        {#each cookingOrders as o (o.id)}
          <div class="rounded-xl border-2 border-indigo-100 bg-indigo-50 p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold text-gray-900">{o.table_label}</span>
                <span class="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <button onclick={() => markReady(o.id)}
                class="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm">
                Pronto
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
