<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../lib/supabase';

  let categories = $state<Array<{ id: string; name: string; sort_order: number }>>([]);
  let items = $state<Array<{ id: string; category_id: string; name: string; description: string | null; price_cents: number; available: boolean; image_url: string | null; kcal: number | null; allergens: string | null }>>([]);
  let tables = $state<Array<{ id: string; label: string; qr_token: string }>>([]);
  let modifiers = $state<Array<{ id: string; menu_item_id: string; name: string; price_cents: number; sort_order: number; available: boolean }>>([]);

  let tenantId = $state('');
  let tenantName = $state('');
  let waiterConfirm = $state(true);
  let showHistory = $state(false);
  let hoursData: Record<string, Array<{ open: string; close: string }>> = $state({});
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: Record<string, string> = { monday: 'Lunedì', tuesday: 'Martedì', wednesday: 'Mercoledì', thursday: 'Giovedì', friday: 'Venerdì', saturday: 'Sabato', sunday: 'Domenica' };

  // form state
  let editingCat = $state<{ id?: string; name: string }>({ name: '' });
  let editingItem = $state<{ id?: string; category_id: string; name: string; description: string; price_cents: number; available: boolean; image_url: string; kcal: number | null; allergens: string }>({ category_id: '', name: '', description: '', price_cents: 0, available: true, image_url: '', kcal: null, allergens: '' });
  let editingTable = $state<{ id?: string; label: string }>({ label: '' });
  let editingMod = $state<{ id?: string; menu_item_id: string; name: string; price_cents: number }>({ menu_item_id: '', name: '', price_cents: 0 });
  let showCatForm = $state(false);
  let showItemForm = $state(false);
  let showTableForm = $state(false);
  let showModForm = $state(false);
  let tenantSlug = $state('');
  let tenantSaved = $state(false);
  function toggleDay(day: string) {
    if (hoursData[day] && hoursData[day].length > 0) hoursData[day] = [];
    else hoursData[day] = [{ open: '09:00', close: '23:00' }];
  }

  function addSlot(day: string) {
    if (!hoursData[day]) hoursData[day] = [];
    hoursData[day] = [...hoursData[day], { open: '09:00', close: '23:00' }];
  }

  function removeSlot(day: string, idx: number) {
    hoursData[day].splice(idx, 1);
    hoursData[day] = [...hoursData[day]];
  }

  onMount(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: st } = await supabase.from('staff').select('tenant_id').eq('auth_user_id', user.id).maybeSingle();
    if (!st) return;
    tenantId = (st as any).tenant_id;
    loadAll();
  });

  async function loadAll() {
    if (!tenantId) return;
    const [c, i, t, mods, ten] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('menu_items').select('*').eq('tenant_id', tenantId),
      supabase.from('tables').select('*').eq('tenant_id', tenantId),
      supabase.from('item_modifiers').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('tenants').select('name, waiter_confirmation_enabled, slug, operating_hours, show_order_history').eq('id', tenantId).single(),
    ]);
    if (c.data) categories = c.data as any;
    if (i.data) items = i.data as any;
    if (t.data) tables = t.data as any;
    if (mods.data) modifiers = mods.data as any;
    if (ten.data) {
      const t = ten.data as any;
      tenantName = t.name; waiterConfirm = t.waiter_confirmation_enabled; tenantSlug = t.slug; showHistory = t.show_order_history ?? false;
      hoursData = { ...(t.operating_hours ?? {}) };
      // ensure all days exist
      for (const d of days) { if (!hoursData[d]) hoursData[d] = []; }
    }
  }

  async function saveTenant() {
    if (!tenantName.trim() || !tenantSlug.trim()) return;
    const clean: Record<string, Array<{ open: string; close: string }>> = {};
    for (const d of days) {
      const slots = hoursData[d]?.filter((s: any) => s.open && s.close);
      if (slots?.length) clean[d] = slots;
    }
    await supabase.from('tenants').update({ name: tenantName, slug: tenantSlug, waiter_confirmation_enabled: waiterConfirm, operating_hours: clean, show_order_history: showHistory }).eq('id', tenantId);
    tenantSaved = true;
    setTimeout(() => tenantSaved = false, 2000);
  }

  // Categories
  async function saveCategory() {
    if (!editingCat.name.trim()) return;
    if (editingCat.id) {
      await supabase.from('menu_categories').update({ name: editingCat.name }).eq('id', editingCat.id);
    } else {
      const max = Math.max(0, ...categories.map((c: any) => c.sort_order));
      await supabase.from('menu_categories').insert({ tenant_id: tenantId, name: editingCat.name, sort_order: max + 1 });
    }
    editingCat = { name: '' }; showCatForm = false; loadAll();
  }

  async function deleteCategory(id: string) {
    if (!confirm('Eliminare categoria e tutti i piatti associati?')) return;
    await supabase.from('menu_categories').delete().eq('id', id);
    loadAll();
  }

  // Items
  function editItem(item: any) {
    editingItem = {
      id: item.id, category_id: item.category_id, name: item.name, description: item.description ?? '',
      price_cents: item.price_cents, available: item.available,
      image_url: item.image_url ?? '', kcal: item.kcal ?? null, allergens: item.allergens ?? '',
    };
    showItemForm = true;
  }

  async function saveItem() {
    if (!editingItem.name.trim() || !editingItem.category_id) return;
    const payload: Record<string, any> = {
      name: editingItem.name, description: editingItem.description || null, price_cents: editingItem.price_cents,
      available: editingItem.available, category_id: editingItem.category_id,
      image_url: editingItem.image_url || null, kcal: editingItem.kcal || null, allergens: editingItem.allergens || null,
    };
    if (editingItem.id) {
      await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.from('menu_items').insert({ ...payload, tenant_id: tenantId });
    }
    editingItem = { category_id: '', name: '', description: '', price_cents: 0, available: true, image_url: '', kcal: null, allergens: '' };
    showItemForm = false; loadAll();
  }

  async function toggleItem(id: string, available: boolean) {
    await supabase.from('menu_items').update({ available }).eq('id', id);
    loadAll();
  }

  async function deleteItem(id: string) {
    if (!confirm('Eliminare questo piatto?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    loadAll();
  }

  // Tables
  async function saveTable() {
    if (!editingTable.label.trim()) return;
    if (editingTable.id) {
      await supabase.from('tables').update({ label: editingTable.label }).eq('id', editingTable.id);
    } else {
      await supabase.from('tables').insert({ tenant_id: tenantId, label: editingTable.label });
    }
    editingTable = { label: '' }; showTableForm = false; loadAll();
  }

  async function deleteTable(id: string) {
    if (!confirm('Eliminare questo tavolo?')) return;
    await supabase.from('tables').delete().eq('id', id);
    loadAll();
  }

  // Modifiers
  async function saveModifier() {
    if (!editingMod.name.trim() || !editingMod.menu_item_id) return;
    if (editingMod.id) {
      await supabase.from('item_modifiers').update({ name: editingMod.name, price_cents: editingMod.price_cents, menu_item_id: editingMod.menu_item_id }).eq('id', editingMod.id);
    } else {
      const max = Math.max(0, ...modifiers.filter((m: any) => m.menu_item_id === editingMod.menu_item_id).map((m: any) => m.sort_order));
      await supabase.from('item_modifiers').insert({ tenant_id: tenantId, menu_item_id: editingMod.menu_item_id, name: editingMod.name, price_cents: editingMod.price_cents, sort_order: max + 1 });
    }
    editingMod = { menu_item_id: '', name: '', price_cents: 0 }; showModForm = false; loadAll();
  }

  async function deleteModifier(id: string) {
    if (!confirm('Eliminare questa modifica?')) return;
    await supabase.from('item_modifiers').delete().eq('id', id);
    loadAll();
  }

  function copyToken(token: string) {
    navigator.clipboard?.writeText(`${window.location.origin}/${tenantSlug}?table=${token}`);
  }

  // Export menu as JSON
  function exportMenu() {
    const menu = { categories: categories.map((c) => ({ name: c.name, sort_order: c.sort_order })), items: [] as any[], modifiers: [] as any[] };
    for (const item of items) {
      const cat = categories.find((c) => c.id === item.category_id);
      menu.items.push({ category: cat?.name ?? '', name: item.name, description: item.description, price_cents: item.price_cents, available: item.available, image_url: item.image_url, kcal: item.kcal, allergens: item.allergens });
    }
    for (const mod of modifiers) {
      const item = items.find((i) => i.id === mod.menu_item_id);
      menu.modifiers.push({ item_name: item?.name ?? '', name: mod.name, price_cents: mod.price_cents, sort_order: mod.sort_order, available: mod.available });
    }
    const blob = new Blob([JSON.stringify(menu, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `menu-${tenantSlug}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Import menu from JSON
  async function importMenu(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    let data: any;
    try { data = JSON.parse(text); } catch { alert('File JSON non valido'); return; }
    if (!data.categories?.length) { alert('Nessuna categoria trovata nel file'); return; }
    if (!confirm('Importare il menu? Le categorie, piatti e personalizzazioni esistenti verranno SOSTITUITI.')) return;

    // Delete existing
    await supabase.from('item_modifiers').delete().eq('tenant_id', tenantId);
    await supabase.from('menu_items').delete().eq('tenant_id', tenantId);
    await supabase.from('menu_categories').delete().eq('tenant_id', tenantId);

    // Insert categories
    for (let i = 0; i < data.categories.length; i++) {
      const cat = data.categories[i];
      await supabase.from('menu_categories').insert({ tenant_id: tenantId, name: cat.name, sort_order: cat.sort_order ?? i + 1 });
    }
    // Reload to get new IDs
    await loadAll();
    // Match items to categories
    for (const item of (data.items ?? [])) {
      const cat = categories.find((c) => c.name === item.category);
      if (!cat) continue;
      await supabase.from('menu_items').insert({ tenant_id: tenantId, category_id: cat.id, name: item.name, description: item.description || null, price_cents: item.price_cents, available: item.available ?? true, image_url: item.image_url || null, kcal: item.kcal || null, allergens: item.allergens || null });
    }
    // Match modifiers to items
    await loadAll();
    for (const mod of (data.modifiers ?? [])) {
      const item = items.find((i: any) => i.name === mod.item_name);
      if (!item) continue;
      await supabase.from('item_modifiers').insert({ tenant_id: tenantId, menu_item_id: item.id, name: mod.name, price_cents: mod.price_cents, sort_order: mod.sort_order ?? 0, available: mod.available ?? true });
    }
    await loadAll();
    alert('Menu importato con successo!');
  }
</script>

<div class="space-y-8">
  <!-- TENANT SETTINGS -->
  <section class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-bold text-gray-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
        Ristorante
      </h2>
    </div>
    <div class="space-y-3">
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide block">
        Nome ristorante
        <input bind:value={tenantName} placeholder="es. Ristorante Gabriele" class="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-normal not-italic text-gray-900" />
      </label>
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wide block">
        Slug (parte dell'URL)
        <input bind:value={tenantSlug} placeholder="es. ristorante-gabriele" class="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs font-normal not-italic text-gray-900" />
      </label>
      <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Orari apertura</span>
      <div class="space-y-2">
        {#each days as day}
          <div class="flex items-center gap-2">
            <button onclick={() => toggleDay(day)} class="text-xs px-2 py-1 rounded-lg border {hoursData[day]?.length > 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-400'} transition-colors shrink-0">
              {hoursData[day]?.length > 0 ? '✓' : '+'}
            </button>
            <span class="text-xs text-gray-600 w-20 shrink-0">{dayLabels[day]}</span>
            {#if hoursData[day]?.length > 0}
              <div class="flex flex-wrap gap-1 flex-1">
                {#each hoursData[day] as slot, si}
                  <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
                    <input type="time" bind:value={slot.open} class="text-xs w-16 border-0 p-0 focus:outline-none" />
                    <span class="text-xs text-gray-300">–</span>
                    <input type="time" bind:value={slot.close} class="text-xs w-16 border-0 p-0 focus:outline-none" />
                    <button onclick={() => removeSlot(day, si)} class="text-xs text-red-300 hover:text-red-500 ml-0.5">×</button>
                  </div>
                {/each}
                <button onclick={() => addSlot(day)} class="text-xs text-blue-500 hover:text-blue-700 px-2">+ fascia</button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" bind:checked={showHistory} class="rounded" />
        Mostra storico ordini al cliente
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" bind:checked={waiterConfirm} class="rounded" />
        Conferma cameriere obbligatoria
      </label>
      <div class="flex items-center gap-2">
        <button onclick={saveTenant} class="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Salva</button>
        {#if tenantSaved}<span class="text-xs text-emerald-600">Salvato!</span>{/if}
      </div>
    </div>
  </section>

  <!-- CATEGORIES -->
  <section class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-bold text-gray-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
        Categorie
      </h2>
      <button onclick={() => { editingCat = { name: '' }; showCatForm = !showCatForm; }} class="text-sm font-medium text-blue-600 hover:text-blue-800">
        {showCatForm ? 'Annulla' : '+ Aggiungi'}
      </button>
    </div>
    {#if showCatForm}
      <div class="flex gap-2 mb-4">
        <input bind:value={editingCat.name} placeholder="Nome categoria" class="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <button onclick={saveCategory} class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Salva</button>
      </div>
    {/if}
    <div class="space-y-2">
      {#each categories as cat (cat.id)}
        <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <span class="text-sm font-medium text-gray-700">{cat.name}</span>
          <div class="flex items-center gap-2">
            <button onclick={() => { editingCat = { id: cat.id, name: cat.name }; showCatForm = true; }} class="text-xs text-blue-500 hover:text-blue-700">Modifica</button>
            <button onclick={() => deleteCategory(cat.id)} class="text-xs text-red-400 hover:text-red-600">Elimina</button>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- ITEMS -->
  <section class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-bold text-gray-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
        Piatti
      </h2>
      <button onclick={() => { editingItem = { category_id: categories[0]?.id ?? '', name: '', description: '', price_cents: 0, available: true, image_url: '', kcal: null, allergens: '' }; showItemForm = !showItemForm; }} class="text-sm font-medium text-blue-600 hover:text-blue-800">
        {showItemForm ? 'Annulla' : '+ Aggiungi'}
      </button>
    </div>
    {#if showItemForm}
      <div class="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
        <select bind:value={editingItem.category_id} class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm">
          <option value="">Seleziona categoria</option>
          {#each categories as cat}
            <option value={cat.id}>{cat.name}</option>
          {/each}
        </select>
        <input bind:value={editingItem.name} placeholder="Nome piatto" class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm" />
        <textarea bind:value={editingItem.description} placeholder="Descrizione" rows="2" class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm"></textarea>
        <div class="flex gap-2">
          <input type="number" bind:value={editingItem.price_cents} placeholder="Prezzo in centesimi" class="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm" />
          <span class="text-sm text-gray-400 self-center">= {(editingItem.price_cents / 100).toFixed(2)}€</span>
        </div>
        <input type="number" bind:value={editingItem.kcal} placeholder="Kcal (opzionale)" class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm" />
        <input bind:value={editingItem.allergens} placeholder="Allergeni (es. Glutine, Lattosio)" class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm" />
        <input bind:value={editingItem.image_url} placeholder="URL immagine (opzionale)" class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm" />
        {#if editingItem.image_url}
          <img src={editingItem.image_url} alt="anteprima" class="w-20 h-20 rounded-xl object-cover" />
        {/if}
        <button onclick={saveItem} class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Salva</button>
      </div>
    {/if}
    <div class="space-y-1">
      {#each categories as cat}
        {@const catItems = items.filter((i: any) => i.category_id === cat.id)}
        {#if catItems.length > 0}
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1">{cat.name}</p>
          {#each catItems as item (item.id)}
            <div class="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                {#if item.image_url}
                  <img src={item.image_url} alt={item.name} class="w-8 h-8 rounded-lg object-cover shrink-0" />
                {/if}
                <div class="min-w-0">
                  <span class="text-sm font-medium text-gray-700">{item.name}</span>
                  <span class="text-xs text-gray-400 ml-2">{(item.price_cents / 100).toFixed(2)}€</span>
                  {#if item.kcal}<span class="text-xs text-gray-400 ml-1">{item.kcal} kcal</span>{/if}
                  {#if !item.available}
                    <span class="text-xs text-red-400 ml-2">(non disp.)</span>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button onclick={() => toggleItem(item.id, !item.available)} class="text-xs {item.available ? 'text-amber-500 hover:text-amber-700' : 'text-emerald-500 hover:text-emerald-700'}">
                  {item.available ? 'Nascondi' : 'Mostra'}
                </button>
                <button onclick={() => editItem(item)} class="text-xs text-blue-500 hover:text-blue-700">Modifica</button>
                <button onclick={() => deleteItem(item.id)} class="text-xs text-red-400 hover:text-red-600">Elimina</button>
              </div>
            </div>
          {/each}
        {/if}
      {/each}
    </div>
  </section>

  <!-- MODIFIERS -->
  <section class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-bold text-gray-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
        Personalizzazioni
      </h2>
      <button onclick={() => { editingMod = { menu_item_id: items[0]?.id ?? '', name: '', price_cents: 0 }; showModForm = !showModForm; }} class="text-sm font-medium text-blue-600 hover:text-blue-800">
        {showModForm ? 'Annulla' : '+ Aggiungi'}
      </button>
    </div>
    {#if showModForm}
      <div class="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
        <select bind:value={editingMod.menu_item_id} class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm">
          <option value="">Seleziona piatto</option>
          {#each items as item}
            <option value={item.id}>{item.name}</option>
          {/each}
        </select>
        <input bind:value={editingMod.name} placeholder="Nome (es. Mozzarella extra)" class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm" />
        <div class="flex gap-2">
          <input type="number" bind:value={editingMod.price_cents} placeholder="Prezzo in centesimi" class="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm" />
          <span class="text-sm text-gray-400 self-center">= {(editingMod.price_cents / 100).toFixed(2)}€</span>
        </div>
        <button onclick={saveModifier} class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Salva</button>
      </div>
    {/if}
    <div class="space-y-1">
      {#each items as item}
        {@const itemMods = modifiers.filter((m: any) => m.menu_item_id === item.id)}
        {#if itemMods.length > 0}
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-1">{item.name}</p>
          {#each itemMods as mod}
            <div class="flex items-center justify-between py-2 px-2 rounded-lg">
              <span class="text-sm text-gray-700">{mod.name} <span class="text-xs text-gray-400">+{(mod.price_cents / 100).toFixed(2)}€</span></span>
              <button onclick={() => deleteModifier(mod.id)} class="text-xs text-red-400 hover:text-red-600">Elimina</button>
            </div>
          {/each}
        {/if}
      {/each}
      {#if modifiers.length === 0}
        <p class="text-gray-400 text-sm text-center py-4">Nessuna personalizzazione. Aggiungine una per i tuoi piatti.</p>
      {/if}
    </div>
  </section>

  <!-- TABLES -->
  <section class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-bold text-gray-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
        Tavoli
      </h2>
      <button onclick={() => { editingTable = { label: '' }; showTableForm = !showTableForm; }} class="text-sm font-medium text-blue-600 hover:text-blue-800">
        {showTableForm ? 'Annulla' : '+ Aggiungi'}
      </button>
    </div>
    {#if showTableForm}
      <div class="flex gap-2 mb-4">
        <input bind:value={editingTable.label} placeholder="Es. Tavolo 3" class="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <button onclick={saveTable} class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Salva</button>
      </div>
    {/if}
    <div class="space-y-2">
      {#each tables as t (t.id)}
        <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div>
            <span class="text-sm font-medium text-gray-700">{t.label}</span>
            <button onclick={() => copyToken(t.qr_token)} class="text-xs text-gray-400 hover:text-blue-600 ml-3 underline underline-offset-2">Copia link QR</button>
          </div>
          <div class="flex items-center gap-2">
            <button onclick={() => { editingTable = { id: t.id, label: t.label }; showTableForm = true; }} class="text-xs text-blue-500 hover:text-blue-700">Modifica</button>
            <button onclick={() => deleteTable(t.id)} class="text-xs text-red-400 hover:text-red-600">Elimina</button>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- EXPORT / IMPORT -->
  <section class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-bold text-gray-800 flex items-center gap-2">
        <span class="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
        Esporta / Importa Menu
      </h2>
    </div>
    <p class="text-xs text-gray-400 mb-4">Esporta il menu come JSON per salvarlo o trasferirlo. Importa un file JSON per sostituire tutto il menu (categorie, piatti e personalizzazioni).</p>
    <div class="flex items-center gap-3">
      <button onclick={exportMenu} class="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Scarica JSON</button>
      <label class="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 cursor-pointer">
        Carica JSON
        <input type="file" accept=".json" onchange={importMenu} class="hidden" />
      </label>
    </div>
  </section>
</div>
