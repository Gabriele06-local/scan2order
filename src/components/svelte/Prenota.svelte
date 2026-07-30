<script lang="ts">
  import { t } from '../../lib/i18n/index.svelte';
  import { supabase } from '../../lib/supabase';

  let { tenantId, tenantName, categories, allItems, modifiers, operatingHours }: {
    tenantId: string; tenantName: string; categories: any[]; allItems: any[];
    modifiers: any[]; operatingHours: any;
  } = $props();

  let step = $state<'info' | 'menu' | 'done'>('info');
  let guestName = $state('');
  let guestEmail = $state('');
  let guestPhone = $state('');
  let guestCount = $state(2);
  let dateStr = $state('');
  let timeStr = $state('');
  let notes = $state('');
  let submitting = $state(false);
  let error = $state('');

  let selectedItems = $state<Array<{ menu_item_id: string; name: string; quantity: number; unit_price_cents: number; notes: string; modifiers: any[] }>>([]);

  function openMenu() {
    if (!guestName || !dateStr || !timeStr) { error = 'Compila nome, data e ora'; return; }
    error = ''; step = 'menu';
  }

  function toggleItem(item: any) {
    const idx = selectedItems.findIndex(i => i.menu_item_id === item.id);
    if (idx >= 0) { selectedItems.splice(idx, 1); selectedItems = [...selectedItems]; }
    else { selectedItems = [...selectedItems, { menu_item_id: item.id, name: item.name, quantity: 1, unit_price_cents: item.price_cents, notes: '', modifiers: [] }]; }
  }

  function isSelected(itemId: string) { return selectedItems.some(i => i.menu_item_id === itemId); }

  function updateQty(itemId: string, delta: number) {
    selectedItems = selectedItems.map(i => i.menu_item_id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i);
  }

  function toggleMod(itemId: string, mod: any) {
    selectedItems = selectedItems.map(i => {
      if (i.menu_item_id !== itemId) return i;
      const has = i.modifiers.some(m => m.id === mod.id);
      return { ...i, modifiers: has ? i.modifiers.filter(m => m.id !== mod.id) : [...i.modifiers, { id: mod.id, name: mod.name, price_cents: mod.price_cents }] };
    });
  }

  function itemNote(itemId: string, val: string) {
    selectedItems = selectedItems.map(i => i.menu_item_id === itemId ? { ...i, notes: val } : i);
  }

  function total() {
    return selectedItems.reduce((sum, i) => {
      const modTotal = i.modifiers.reduce((mSum, m) => mSum + m.price_cents, 0);
      return sum + (i.unit_price_cents + modTotal) * i.quantity;
    }, 0);
  }

  function getMods(itemId: string) {
    return modifiers.filter((m: any) => m.menu_item_id === itemId);
  }

  async function submit() {
    if (!guestName || !dateStr || !timeStr) { error = 'Compila tutti i campi obbligatori'; return; }
    submitting = true; error = '';
    const reservationTime = new Date(`${dateStr}T${timeStr}`);
    const { error: err } = await supabase.from('reservations').insert({
      tenant_id: tenantId, guest_name: guestName, guest_email: guestEmail || null,
      guest_phone: guestPhone || null, guest_count: guestCount,
      reservation_time: reservationTime.toISOString(), notes: notes || null,
      pre_order: selectedItems.map(i => ({
        menu_item_id: i.menu_item_id, name: i.name, quantity: i.quantity,
        unit_price_cents: i.unit_price_cents, notes: i.notes,
        modifiers: i.modifiers,
      })),
    } as any);
    submitting = false;
    if (err) { error = err.message; return; }
    step = 'done';
  }

  function todayStr() {
    const d = new Date(); return d.toISOString().slice(0, 10);
  }

  function categoriesWithItems() {
    return categories.filter((c: any) => allItems.some((i: any) => i.category_id === c.id));
  }
</script>

<div class="text-center mb-6">
  <h1 class="text-2xl font-bold text-gray-900">{t('reservations.book_title')}</h1>
  <p class="text-gray-500 mt-1">{tenantName}</p>
</div>

{#if step === 'done'}
  <div class="text-center py-12">
    <div class="text-5xl mb-4">✅</div>
    <h2 class="text-xl font-bold text-gray-900 mb-2">{t('reservations.confirmed')}</h2>
    <p class="text-gray-500">{t('reservations.confirm_msg', { name: guestName, date: dateStr, time: timeStr })}</p>
  </div>

{:else if step === 'info'}
  <form onsubmit={(e) => { e.preventDefault(); openMenu(); }} class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-600 mb-1">{t('reservations.guest_name')} *</label>
      <input type="text" bind:value={guestName} required class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">{t('reservations.email')}</label>
        <input type="email" bind:value={guestEmail} class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">{t('reservations.phone')}</label>
        <input type="tel" bind:value={guestPhone} class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">{t('reservations.date')} *</label>
        <input type="date" bind:value={dateStr} min={todayStr()} required class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-600 mb-1">{t('reservations.time')} *</label>
        <input type="time" bind:value={timeStr} required class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-600 mb-1">{t('reservations.guests')} *</label>
      <input type="number" bind:value={guestCount} min="1" max="50" required class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-600 mb-1">{t('reservations.notes')}</label>
      <textarea bind:value={notes} rows="2" class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
    </div>
    {#if error}<p class="text-red-500 text-sm">{error}</p>{/if}
    <button type="submit" class="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 active:scale-[0.97] transition-all">
      {t('reservations.choose_menu')}
    </button>
  </form>

{:else if step === 'menu'}
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-lg font-bold text-gray-900">{t('reservations.preview_title')}</h2>
    <button onclick={() => step = 'info'} class="text-sm text-blue-600 hover:text-blue-700 underline">{t('common.back')}</button>
  </div>

  {#each categoriesWithItems() as cat}
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">{cat.name}</h3>
      {#each allItems.filter((i: any) => i.category_id === cat.id) as item}
        {@const sel = isSelected(item.id)}
        {@const imods = getMods(item.id)}
        <div class="bg-white border border-gray-100 rounded-xl p-3 mb-2 {sel ? 'ring-2 ring-blue-500' : ''}">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-medium text-gray-900">{item.name}</div>
              {#if item.description}<div class="text-xs text-gray-400">{item.description}</div>{/if}
              <div class="text-sm text-blue-600 mt-1">{(item.price_cents / 100).toFixed(2)}€</div>
            </div>
            <button onclick={() => toggleItem(item)} class="px-3 py-1 rounded-lg text-sm font-semibold {sel ? 'bg-gray-100 text-gray-500' : 'bg-blue-600 text-white'}">
              {sel ? t('common.remove') : '+'}
            </button>
          </div>
          {#if sel}
            <div class="flex items-center gap-2 mt-2">
              <button onclick={() => updateQty(item.id, -1)} class="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-sm">-</button>
              <span class="text-sm font-bold text-gray-900">{selectedItems.find(i => i.menu_item_id === item.id)?.quantity}</span>
              <button onclick={() => updateQty(item.id, 1)} class="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-sm">+</button>
              <span class="text-xs text-gray-400 ml-2">{t('reservations.notes')}</span>
              <input type="text" value={selectedItems.find(i => i.menu_item_id === item.id)?.notes || ''}
                oninput={(e) => itemNote(item.id, (e.target as HTMLInputElement).value)}
                class="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none" />
            </div>
            {#if imods.length > 0}
              <div class="flex flex-wrap gap-1 mt-2">
                {#each imods as mod}
                  {@const isModSel = selectedItems.find(i => i.menu_item_id === item.id)?.modifiers.some(m => m.id === mod.id)}
                  <button onclick={() => toggleMod(item.id, mod)}
                    class="text-xs px-2 py-0.5 rounded-full {isModSel ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}">
                    {mod.name} +{(mod.price_cents / 100).toFixed(2)}€
                  </button>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {/each}

  {#if selectedItems.length > 0}
    <div class="sticky bottom-4 bg-white border border-gray-100 rounded-xl p-4 flex justify-between items-center shadow-lg">
      <div>
        <span class="text-sm text-gray-500">{t('reservations.total')}: </span>
        <span class="text-lg font-bold text-blue-600">{(total() / 100).toFixed(2)}€</span>
      </div>
      <button onclick={submit} disabled={submitting}
        class="bg-blue-600 text-white rounded-xl px-6 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50 active:scale-[0.97] transition-all">
        {submitting ? t('common.loading') : t('reservations.submit')}
      </button>
    </div>
  {:else}
    <div class="text-center py-6">
      <p class="text-gray-400 text-sm mb-3">{t('reservations.skip_menu')}</p>
      <button onclick={submit} disabled={submitting}
        class="bg-gray-100 text-gray-600 rounded-xl px-6 py-2 font-semibold hover:bg-gray-200 disabled:opacity-50 active:scale-[0.97] transition-all">
        {submitting ? t('common.loading') : t('reservations.book_only')}
      </button>
    </div>
  {/if}
{/if}
