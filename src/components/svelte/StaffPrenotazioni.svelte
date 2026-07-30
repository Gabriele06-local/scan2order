<script lang="ts">
  import { t, getLocale } from '../../lib/i18n/index.svelte';
  import { supabase } from '../../lib/supabase';

  let reservations = $state<any[]>([]);
  let loading = $state(true);
  let selectedDate = $state(new Date().toISOString().slice(0, 10));
  let converting = $state<string | null>(null);
  let showAll = $state(false);

  async function load() {
    loading = true;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { loading = false; return; }
    const { data: staff } = await supabase.from('staff').select('tenant_id').eq('auth_user_id', user.id).single();
    if (!staff) { loading = false; return; }
    const tenantId = (staff as any).tenant_id;
    const start = showAll ? new Date(0).toISOString() : new Date(selectedDate + 'T00:00:00').toISOString();
    const end = showAll ? new Date('2099-12-31').toISOString() : new Date(selectedDate + 'T23:59:59').toISOString();
    const { data } = await supabase.from('reservations').select('*')
      .eq('tenant_id', tenantId).gte('reservation_time', start).lte('reservation_time', end)
      .order('reservation_time', { ascending: true });
    reservations = data ?? [];
    loading = false;
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    await load();
  }

  async function convertToOrder(id: string) {
    converting = id;
    const { error } = await supabase.rpc('convert_reservation_to_order', { p_reservation_id: id });
    converting = null;
    if (!error) await load();
  }

  function statusBadge(s: string) {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-600', confirmed: 'bg-green-600', cancelled: 'bg-red-600', no_show: 'bg-gray-600'
    };
    return colors[s] || 'bg-gray-600';
  }

  $effect(() => { load(); });
</script>

<div class="bg-gray-800 rounded-xl p-4">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-lg font-bold">{t('nav.reservations')}</h2>
    <button onclick={load} class="text-xs text-gray-400 hover:text-white underline">{t('common.refresh')}</button>
  </div>

  <div class="flex items-center gap-3 mb-4">
    <input type="date" bind:value={selectedDate} onchange={() => { showAll = false; load(); }}
      class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white" />
    <button onclick={() => { showAll = !showAll; load(); }}
      class="text-xs px-3 py-1.5 rounded-lg {showAll ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-300'}">
      {t('reservations.all_reservations')}
    </button>
  </div>

  {#if loading}
    <p class="text-gray-400 text-sm">{t('common.loading')}</p>
  {:else if reservations.length === 0}
    <p class="text-gray-500 text-sm">{t('reservations.no_reservations')}</p>
  {:else}
    <div class="space-y-3">
      {#each reservations as r}
        <div class="bg-gray-750 border border-gray-700 rounded-xl p-3">
          <div class="flex justify-between items-start">
            <div>
              <div class="font-medium flex items-center gap-2">
                {r.guest_name}
                <span class="text-xs px-2 py-0.5 rounded-full text-white {statusBadge(r.status)}">
                  {t('reservations.status_' + r.status)}
                </span>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                {new Date(r.reservation_time).toLocaleString(getLocale() === 'it' ? 'it-IT' : 'en-GB')}
                {' · '}{r.guest_count} {t('reservations.guests')}
              </div>
              {#if r.notes}<div class="text-xs text-gray-400 mt-1">📝 {r.notes}</div>{/if}
            </div>
            <div class="flex gap-1">
              {#if r.status === 'pending'}
                <button onclick={() => updateStatus(r.id, 'cancelled')}
                  class="text-xs px-2 py-1 rounded-lg bg-red-700 text-white hover:bg-red-600">
                  {t('reservations.cancel')}
                </button>
              {/if}
              {#if r.status === 'pending' || r.status === 'confirmed'}
                <button onclick={() => updateStatus(r.status === 'pending' ? 'confirmed' : 'no_show')}
                  class="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600">
                  {r.status === 'pending' ? t('reservations.confirm') : t('reservations.no_show')}
                </button>
              {/if}
            </div>
          </div>

          {#if r.pre_order?.length > 0}
            <div class="mt-2 pt-2 border-t border-gray-700">
              <div class="text-xs text-gray-400 mb-1">{t('reservations.pre_order')}:</div>
              <div class="space-y-1">
                {#each r.pre_order as p}
                  <div class="text-xs text-gray-300 flex justify-between">
                    <span>{p.quantity}x {p.name}</span>
                    <span class="text-emerald-400">{((p.unit_price_cents * p.quantity) / 100).toFixed(2)}€</span>
                  </div>
                {/each}
              </div>
              {#if r.status === 'pending' || r.status === 'confirmed'}
                <button onclick={() => convertToOrder(r.id)} disabled={converting === r.id}
                  class="mt-2 w-full text-xs bg-emerald-700 text-white rounded-lg py-1.5 font-bold hover:bg-emerald-600 disabled:opacity-50 active:scale-[0.97] transition-all">
                  {converting === r.id ? t('common.loading') : t('reservations.seat_guest')}
                </button>
              {/if}
            </div>
          {:else if r.status === 'pending'}
            <div class="mt-2">
              <button onclick={() => convertToOrder(r.id)} disabled={converting === r.id}
                class="w-full text-xs bg-emerald-700 text-white rounded-lg py-1.5 font-bold hover:bg-emerald-600 disabled:opacity-50 active:scale-[0.97] transition-all">
                {converting === r.id ? t('common.loading') : t('reservations.seat_table')}
              </button>
            </div>
          {/if}

          {#if r.guest_email || r.guest_phone}
            <div class="flex gap-3 mt-1 text-xs text-gray-500">
              {#if r.guest_email}<span>✉️ {r.guest_email}</span>{/if}
              {#if r.guest_phone}<span>📞 {r.guest_phone}</span>{/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
