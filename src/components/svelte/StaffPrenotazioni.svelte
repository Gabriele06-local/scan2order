<script lang="ts">
  import { t, getLocale } from '../../lib/i18n/index.svelte';
  import { supabase } from '../../lib/supabase';

  let reservations = $state<any[]>([]);
  let tables = $state<any[]>([]);
  let loading = $state(true);
  let selectedDate = $state(new Date().toISOString().slice(0, 10));
  let converting = $state<string | null>(null);
  let showAll = $state(false);
  let tenantId = $state('');
  let pickTable = $state<{ reservationId: string; tableId: string } | null>(null);

  async function load() {
    loading = true;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { loading = false; return; }
    const { data: staff } = await supabase.from('staff').select('tenant_id').eq('auth_user_id', user.id).single();
    if (!staff) { loading = false; return; }
    tenantId = (staff as any).tenant_id;
    const start = showAll ? new Date(0).toISOString() : new Date(selectedDate + 'T00:00:00').toISOString();
    const end = showAll ? new Date('2099-12-31').toISOString() : new Date(selectedDate + 'T23:59:59').toISOString();
    const { data: reservationsData } = await supabase.from('reservations').select('*')
      .eq('tenant_id', tenantId).gte('reservation_time', start).lte('reservation_time', end)
      .order('reservation_time', { ascending: true });
    reservations = reservationsData ?? [];
    const { data: tablesData } = await supabase.from('tables').select('id, label').eq('tenant_id', tenantId);
    tables = tablesData ?? [];
    loading = false;
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    await load();
  }

  function askTable(id: string) {
    pickTable = { reservationId: id, tableId: tables[0]?.id || '' };
  }

  async function doConvert() {
    if (!pickTable) return;
    converting = pickTable.reservationId;
    const { error } = await supabase.rpc('convert_reservation_to_order', {
      p_reservation_id: pickTable.reservationId,
      p_table_id: pickTable.tableId,
    });
    converting = null;
    pickTable = null;
    if (!error) await load();
  }

  function statusBadge(s: string) {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      no_show: 'bg-gray-100 text-gray-500'
    };
    return colors[s] || 'bg-gray-100 text-gray-500';
  }

  $effect(() => { load(); });
</script>

<div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
      <span class="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
      {t('nav.reservations')}
    </h2>
    <button onclick={load} class="text-xs text-blue-600 hover:text-blue-700 underline">{t('common.refresh')}</button>
  </div>

  <div class="flex items-center gap-3 mb-4">
    <input type="date" bind:value={selectedDate} onchange={() => { showAll = false; load(); }}
      class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
    <button onclick={() => { showAll = !showAll; load(); }}
      class="text-xs px-3 py-1.5 rounded-lg font-medium {showAll ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
      {t('reservations.all_reservations')}
    </button>
  </div>

  {#if loading}
    <p class="text-gray-400 text-sm">{t('common.loading')}</p>
  {:else if reservations.length === 0}
    <p class="text-gray-400 text-sm">{t('reservations.no_reservations')}</p>
  {:else}
    <div class="space-y-3">
      {#each reservations as r}
        <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div class="flex justify-between items-start">
            <div>
              <div class="font-medium text-gray-900 flex items-center gap-2">
                {r.guest_name}
                <span class="text-xs px-2 py-0.5 rounded-full font-medium {statusBadge(r.status)}">
                  {t('reservations.status_' + r.status)}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {new Date(r.reservation_time).toLocaleString(getLocale() === 'it' ? 'it-IT' : 'en-GB')}
                {' · '}{r.guest_count} {t('reservations.guests')}
              </div>
              {#if r.notes}<div class="text-xs text-gray-400 mt-1">📝 {r.notes}</div>{/if}
            </div>
            <div class="flex gap-1">
              {#if r.status === 'pending'}
                <button onclick={() => updateStatus(r.id, 'cancelled')}
                  class="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 font-medium hover:bg-red-200">
                  {t('reservations.cancel')}
                </button>
              {/if}
              {#if r.status === 'pending' || r.status === 'confirmed'}
                <button onclick={() => updateStatus(r.id, r.status === 'pending' ? 'confirmed' : 'no_show')}
                  class="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium hover:bg-gray-200">
                  {r.status === 'pending' ? t('reservations.confirm') : t('reservations.no_show')}
                </button>
              {/if}
            </div>
          </div>

          {#if r.pre_order?.length > 0}
            <div class="mt-3 pt-3 border-t border-gray-200">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('reservations.pre_order')}:</div>
              <div class="space-y-1">
                {#each r.pre_order as p}
                  <div class="text-sm text-gray-700 flex justify-between">
                    <span>{p.quantity}x {p.name}</span>
                    <span class="text-blue-600 font-medium">{((p.unit_price_cents * p.quantity) / 100).toFixed(2)}€</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if r.status === 'pending' || r.status === 'confirmed'}
            <div class="mt-3">
              {#if r.pre_order?.length > 0}
                {#if pickTable?.reservationId === r.id}
                  <div class="flex items-center gap-2">
                    <select bind:value={pickTable.tableId} class="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none flex-1">
                      {#each tables as t}
                        <option value={t.id}>{t.label}</option>
                      {/each}
                    </select>
                    <button onclick={doConvert} disabled={converting === r.id}
                      class="text-sm bg-blue-600 text-white rounded-xl px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50 active:scale-[0.97] transition-all whitespace-nowrap">
                      {converting === r.id ? t('common.loading') : t('reservations.seat_guest')}
                    </button>
                    <button onclick={() => pickTable = null} class="text-xs text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                {:else}
                  <button onclick={() => askTable(r.id)}
                    class="w-full text-sm bg-blue-600 text-white rounded-xl py-2 font-semibold hover:bg-blue-700 active:scale-[0.97] transition-all">
                    {t('reservations.seat_guest')}
                  </button>
                {/if}
              {:else}
                <button onclick={() => updateStatus(r.id, 'confirmed')}
                  class="w-full text-sm bg-green-100 text-green-700 rounded-xl py-2 font-semibold hover:bg-green-200 active:scale-[0.97] transition-all">
                  {t('reservations.seat_table')}
                </button>
              {/if}
            </div>
          {/if}

          {#if r.guest_email || r.guest_phone}
            <div class="flex gap-3 mt-2 text-xs text-gray-400">
              {#if r.guest_email}<span>✉️ {r.guest_email}</span>{/if}
              {#if r.guest_phone}<span>📞 {r.guest_phone}</span>{/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
