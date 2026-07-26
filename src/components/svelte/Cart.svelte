<script lang="ts">
  import { createOrder } from '../../lib/orders';
  import { setCache } from '../../lib/cache';
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';

  let {
    tenantId,
    tableId,
    tenantName = 'Ristorante',
    tableLabel = 'Tavolo',
    categories,
    allItems,
    modifiers = [],
    operatingHours = {},
    showOrderHistory = false,
  }: {
    tenantId: string;
    tableId: string;
    tenantName?: string;
    tableLabel?: string;
    categories: Array<{ id: string; name: string; sort_order: number }>;
    allItems: Array<{
      id: string;
      category_id: string;
      name: string;
      description: string | null;
      price_cents: number;
      image_url: string | null;
      kcal: number | null;
      allergens: string | null;
    }>;
    modifiers?: Array<{
      id: string;
      menu_item_id: string;
      name: string;
      price_cents: number;
    }>;
    operatingHours?: Record<string, Array<{ open: string; close: string }>>;
    showOrderHistory?: boolean;
  } = $props();

  setCache('menu', { categories, allItems });

  let cartItems: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price_cents: number;
    notes: string;
    selectedModifiers: Array<{ id: string; name: string; price_cents: number }>;
  }> = $state([]);

  let submitting = $state(false);
  let done = $state(false);
  let error = $state('');
  let recentOrders: Array<{ id: string; total_cents: number; created_at: string; status: string }> = $state([]);
  let showHistory = $state(false);

  let total = $derived(cartItems.reduce((sum, i) => {
    const modTotal = i.selectedModifiers.reduce((m, mod) => m + mod.price_cents, 0);
    return sum + i.quantity * (i.unit_price_cents + modTotal);
  }, 0));
  let count = $derived(cartItems.reduce((sum, i) => sum + i.quantity, 0));

  onMount(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, total_cents, created_at, status')
      .eq('table_id', tableId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) recentOrders = data as any;
  });

  function addItem(id: string, name: string, priceCents: number) {
    const existing = cartItems.find((i) => i.id === id);
    if (existing) { existing.quantity += 1; }
    else { cartItems.push({ id, name, quantity: 1, unit_price_cents: priceCents, notes: '', selectedModifiers: [] }); }
  }

  function removeItem(idx: number) { cartItems.splice(idx, 1); }

  function toggleModifier(itemIdx: number, mod: { id: string; name: string; price_cents: number }) {
    const cartItem = cartItems[itemIdx];
    const idx = cartItem.selectedModifiers.findIndex((m) => m.id === mod.id);
    if (idx >= 0) cartItem.selectedModifiers.splice(idx, 1);
    else cartItem.selectedModifiers.push({ ...mod });
  }

  function getModifiersForItem(itemId: string) {
    return modifiers.filter((m) => m.menu_item_id === itemId);
  }

  function isModSelected(modId: string, itemIdx: number) {
    return cartItems[itemIdx]?.selectedModifiers.some((m) => m.id === modId) ?? false;
  }

  async function submitOrder() {
    if (cartItems.length === 0) return;
    submitting = true; error = '';
    const result = await createOrder(tenantId, tableId, cartItems.map((i) => ({
      menu_item_id: i.id,
      quantity: i.quantity,
      notes: i.notes || null,
      unit_price_cents: i.unit_price_cents,
      modifiers: i.selectedModifiers.map((m) => ({ id: m.id, name: m.name, price_cents: m.price_cents })),
    })));
    submitting = false;
    if (result) { done = true; cartItems = []; recentOrders = [{ id: result, total_cents: total, created_at: new Date().toISOString(), status: 'submitted' }, ...recentOrders]; }
    else { error = "Errore nell'invio. Riprova."; }
  }

  function isOpen(): boolean | null {
    if (!operatingHours || Object.keys(operatingHours).length === 0) return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const slots = operatingHours[today];
    if (!slots || slots.length === 0) return false;
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return slots.some((s: any) => hm >= s.open && hm < s.close);
  }

  let openStatus = $derived(isOpen());

  const statusConfig: Record<string, string> = {
    submitted: 'Inviato', pending_waiter_review: 'Da confermare', confirmed: 'Confermato',
    in_kitchen: 'In preparazione', ready: 'Pronto', served: 'Servito',
  };
</script>

{#if done}
  <div class="fixed top-4 left-4 right-4 max-w-lg mx-auto bg-emerald-600 text-white rounded-2xl py-3 px-5 text-center font-semibold z-50 shadow-lg" style="animation: fadeIn 0.3s ease-out">
    ✓ Ordine inviato! Il cameriere lo riceverà a breve.
    <button onclick={() => done = false} class="block text-emerald-200 text-xs mt-1 underline">Continua a ordinare</button>
  </div>
{/if}

<!-- Restaurant header -->
<div class="text-center mb-6 pb-6 border-b border-gray-100">
  <h1 class="text-2xl font-bold text-gray-900">{tenantName}</h1>
  <p class="text-sm text-gray-400 mt-1">{tableLabel}</p>
  {#if openStatus === false}
    <p class="text-xs text-red-500 mt-2 font-medium">Ristorante chiuso — non è possibile ordinare</p>
  {:else if openStatus === true}
    <p class="text-xs text-emerald-600 mt-2 font-medium">Aperto ora</p>
  {/if}
</div>

{#if showOrderHistory && recentOrders.length > 0}
  <button onclick={() => showHistory = !showHistory} class="text-xs text-blue-600 hover:text-blue-800 font-medium mb-6 block">
    {showHistory ? 'Nascondi' : 'Mostra'} ultimi ordini ({recentOrders.length})
  </button>
  {#if showHistory}
    <div class="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
      {#each recentOrders as o}
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">{(o.total_cents / 100).toFixed(2)}€</span>
          <span class="text-gray-400 text-xs self-center">{new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{statusConfig[o.status] ?? o.status}</span>
        </div>
      {/each}
    </div>
  {/if}
{/if}

{#each categories as cat (cat.id)}
  {@const catItems = allItems.filter((i) => i.category_id === cat.id)}
  {#if catItems.length > 0}
    <section class="mb-10">
      <div class="flex items-center gap-3 mb-5">
        <span class="h-px flex-1 bg-gray-100"></span>
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest">{cat.name}</h2>
        <span class="h-px flex-1 bg-gray-100"></span>
      </div>
      <div class="space-y-1">
        {#each catItems as item (item.id)}
          <button
            onclick={() => addItem(item.id, item.name, item.price_cents)}
            class="menu-item w-full text-left px-4 py-3.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-start gap-3"
          >
            {#if item.image_url}
              <img src={item.image_url} alt={item.name} class="w-14 h-14 rounded-xl object-cover shrink-0" />
            {/if}
            <div class="min-w-0 flex-1">
              <span class="font-semibold text-gray-900">{item.name}</span>
              {#if item.description}
                <p class="text-sm text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>
              {/if}
              <div class="flex items-center gap-2 mt-1 text-xs text-gray-300">
                {#if item.kcal}<span>{item.kcal} kcal</span>{/if}
                {#if item.allergens}<span class={item.kcal ? 'before:content-["·"] before:mr-2' : ''}>{item.allergens}</span>{/if}
              </div>
            </div>
            <span class="text-gray-700 font-semibold whitespace-nowrap tabular-nums shrink-0">
              {(item.price_cents / 100).toFixed(2)}€
            </span>
          </button>
        {/each}
      </div>
    </section>
  {/if}
{/each}

<!-- Cart FAB -->
{#if cartItems.length > 0}
  <div class="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-50" style="animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)">
    <button
      onclick={submitOrder}
      disabled={submitting || openStatus === false}
      class="w-full bg-gray-900 text-white rounded-2xl py-4 px-6 font-bold text-base shadow-2xl hover:bg-gray-800 active:scale-[0.97] disabled:opacity-60 transition-all duration-150 flex items-center justify-between"
    >
      <span class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>
        <span>{count} {count === 1 ? 'piatto' : 'piatti'}</span>
      </span>
      <span>{(total / 100).toFixed(2)}€</span>
    </button>
  </div>

  <!-- Cart summary sheet -->
  <div class="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-4 z-40 space-y-3" style="animation: slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)">
    <div class="space-y-3 text-sm max-h-60 overflow-y-auto">
      {#each cartItems as item, i}
        <div class="border-b border-gray-50 pb-3 last:border-0">
          <div class="flex justify-between items-start">
            <div class="flex-1 min-w-0">
              <span class="font-medium text-gray-800">{item.name}</span>
              <span class="text-gray-400"> × {item.quantity}</span>
              {#if item.selectedModifiers.length > 0}
                <p class="text-xs text-gray-400 mt-0.5">
                  {item.selectedModifiers.map((m) => m.name).join(', ')}
                </p>
              {/if}
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-gray-600">{(item.unit_price_cents * item.quantity / 100).toFixed(2)}€</span>
              <button onclick={() => removeItem(i)} class="text-gray-300 hover:text-red-400 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
          <!-- Notes -->
          <input bind:value={item.notes} placeholder="Note (es. senza cipolla)" class="w-full mt-2 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          <!-- Modifiers -->
          {#if getModifiersForItem(item.id).length > 0}
            <div class="flex flex-wrap gap-1.5 mt-2">
              {#each getModifiersForItem(item.id) as mod}
                <button
                  onclick={() => toggleModifier(i, mod)}
                  class="text-xs px-2 py-1 rounded-full border transition-colors {isModSelected(mod.id, i) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}"
                >
                  {mod.name} {mod.price_cents > 0 ? `+${(mod.price_cents / 100).toFixed(2)}€` : ''}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    {#if error}
      <p class="text-red-500 text-xs">{error}</p>
    {/if}
    {#if openStatus === false}
      <p class="text-amber-600 text-xs font-medium">Il ristorante è chiuso</p>
    {/if}
  </div>
{/if}

<style>
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(0.95); } 100% { transform: scale(1); } }
  @keyframes highlight { 0% { background-color: transparent; } 50% { background-color: rgb(239 246 255); } 100% { background-color: transparent; } }
  :global(.menu-item) { transition: all 0.15s ease; }
  :global(.menu-item:active) { transform: scale(0.98); background-color: rgb(249 250 251); }
  :global(.cart-item-enter) { animation: highlight 0.6s ease; }
</style>
