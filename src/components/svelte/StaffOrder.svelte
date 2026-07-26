<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';

  let tables: Array<{ id: string; label: string }> = $state([]);
  let categories: Array<{ id: string; name: string; sort_order: number }> = $state([]);
  let allItems: Array<any> = $state([]);
  let modifiers: Array<any> = $state([]);
  let tenantId = $state('');
  let selectedTable = $state('');
  let loading = $state(true);

  let cartItems: Array<{
    id: string; name: string; quantity: number; unit_price_cents: number;
    notes: string; selectedModifiers: Array<{ id: string; name: string; price_cents: number }>;
  }> = $state([]);
  let submitting = $state(false);
  let done = $state(false);
  let error = $state('');

  let total = $derived(cartItems.reduce((s, i) => {
    const mod = i.selectedModifiers.reduce((m, x) => m + x.price_cents, 0);
    return s + i.quantity * (i.unit_price_cents + mod);
  }, 0));
  let count = $derived(cartItems.reduce((s, i) => s + i.quantity, 0));

  onMount(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: st } = await supabase.from('staff').select('tenant_id').eq('auth_user_id', user.id).maybeSingle();
    if (!st) return;
    tenantId = (st as any).tenant_id;
    const [t, c, i, m] = await Promise.all([
      supabase.from('tables').select('id, label').eq('tenant_id', tenantId),
      supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('menu_items').select('*').eq('tenant_id', tenantId).eq('available', true),
      supabase.from('item_modifiers').select('*').eq('tenant_id', tenantId).eq('available', true).order('sort_order'),
    ]);
    if (t.data) tables = t.data as any;
    if (c.data) categories = c.data as any;
    if (i.data) allItems = i.data as any;
    if (m.data) modifiers = m.data as any;
    if (tables.length > 0) selectedTable = tables[0].id;
    loading = false;
  });

  function addItem(id: string, name: string, priceCents: number) {
    const ex = cartItems.find((i) => i.id === id);
    if (ex) { ex.quantity += 1; }
    else { cartItems.push({ id, name, quantity: 1, unit_price_cents: priceCents, notes: '', selectedModifiers: [] }); }
  }

  function removeItem(i: number) { cartItems.splice(i, 1); }

  function toggleModifier(itemIdx: number, mod: { id: string; name: string; price_cents: number }) {
    const ci = cartItems[itemIdx];
    const idx = ci.selectedModifiers.findIndex((m) => m.id === mod.id);
    if (idx >= 0) ci.selectedModifiers.splice(idx, 1);
    else ci.selectedModifiers.push({ ...mod });
  }

  function getMods(itemId: string) { return modifiers.filter((m) => m.menu_item_id === itemId); }

  function isModSelected(modId: string, itemIdx: number) {
    return cartItems[itemIdx]?.selectedModifiers.some((m) => m.id === modId) ?? false;
  }

  async function submitOrder() {
    if (!selectedTable || cartItems.length === 0) return;
    submitting = true; error = '';
    const { error: rpcErr } = await supabase.rpc('create_staff_order', {
      p_tenant_id: tenantId,
      p_table_id: selectedTable,
      p_items: cartItems.map((i) => ({
        menu_item_id: i.id, quantity: i.quantity, notes: i.notes || null,
        unit_price_cents: i.unit_price_cents,
        modifiers: i.selectedModifiers.map((m) => ({ id: m.id, name: m.name, price_cents: m.price_cents })),
      })),
    } as any);
    submitting = false;
    if (rpcErr) { error = rpcErr.message; }
    else { done = true; cartItems = []; }
  }
</script>

{#if loading}
  <p class="text-gray-400 text-sm text-center py-12">Caricamento...</p>
{:else}
  {#if done}
    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm font-medium text-center mb-6">
      Ordine inviato direttamente in cucina!
      <button onclick={() => done = false} class="block text-emerald-600 underline mt-1">Nuovo ordine</button>
    </div>
  {/if}

  <div class="mb-6">
    <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Tavolo</label>
    <select bind:value={selectedTable} class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm">
      {#each tables as t}
        <option value={t.id}>{t.label}</option>
      {/each}
    </select>
  </div>

  {#each categories as cat (cat.id)}
    {@const catItems = allItems.filter((i: any) => i.category_id === cat.id)}
    {#if catItems.length > 0}
      <section class="mb-10">
        <div class="flex items-center gap-3 mb-5">
          <span class="h-px flex-1 bg-gray-100"></span>
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest">{cat.name}</h2>
          <span class="h-px flex-1 bg-gray-100"></span>
        </div>
        {#each catItems as item (item.id)}
          <button onclick={() => addItem(item.id, item.name, item.price_cents)}
            class="w-full text-left px-4 py-3.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-start gap-3">
            {#if item.image_url}
              <img src={item.image_url} alt={item.name} class="w-14 h-14 rounded-xl object-cover shrink-0" />
            {/if}
            <div class="min-w-0 flex-1">
              <span class="font-semibold text-gray-900">{item.name}</span>
              {#if item.description}
                <p class="text-sm text-gray-400 mt-0.5">{item.description}</p>
              {/if}
              {#if item.kcal || item.allergens}
                <p class="text-xs text-gray-300 mt-1">{item.kcal ? `${item.kcal} kcal` : ''}{item.kcal && item.allergens ? ' · ' : ''}{item.allergens ?? ''}</p>
              {/if}
            </div>
            <span class="text-gray-700 font-semibold tabular-nums shrink-0">{(item.price_cents / 100).toFixed(2)}€</span>
          </button>
        {/each}
      </section>
    {/if}
  {/each}

  {#if cartItems.length > 0}
    <div class="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-50" style="animation: slideUp 0.25s ease-out">
      <button onclick={submitOrder} disabled={submitting}
        class="w-full bg-blue-600 text-white rounded-2xl py-4 px-6 font-bold shadow-2xl hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-between">
        <span>{count} {count === 1 ? 'piatto' : 'piatti'}</span>
        <span>{(total / 100).toFixed(2)}€</span>
      </button>
    </div>

    <div class="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-40" style="animation: slideUp 0.2s ease-out">
      <div class="space-y-3 text-sm max-h-60 overflow-y-auto">
        {#each cartItems as item, i}
          <div class="border-b border-gray-50 pb-3 last:border-0">
            <div class="flex justify-between items-start">
              <div class="flex-1 min-w-0">
                <span class="font-medium text-gray-800">{item.name} × {item.quantity}</span>
                {#if item.selectedModifiers.length > 0}
                  <p class="text-xs text-gray-400">{item.selectedModifiers.map((m) => m.name).join(', ')}</p>
                {/if}
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-gray-600">{(item.unit_price_cents * item.quantity / 100).toFixed(2)}€</span>
                <button onclick={() => removeItem(i)} class="text-gray-300 hover:text-red-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
            <input bind:value={item.notes} placeholder="Note" class="w-full mt-2 border border-gray-200 rounded-lg px-3 py-1.5 text-xs" />
            {@const itemMods = getMods(item.id)}
            {#if itemMods.length > 0}
              <div class="flex flex-wrap gap-1.5 mt-2">
                {#each itemMods as mod}
                  <button onclick={() => toggleModifier(i, mod)}
                    class="text-xs px-2 py-1 rounded-full border {isModSelected(mod.id, i) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500'}">
                    {mod.name}{mod.price_cents > 0 ? ` +${(mod.price_cents / 100).toFixed(2)}€` : ''}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      {#if error}<p class="text-red-500 text-xs mt-2">{error}</p>{/if}
    </div>
  {/if}
{/if}

<style>
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
