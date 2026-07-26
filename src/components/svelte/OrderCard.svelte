<script lang="ts">
  let {
    order,
    actions,
  }: {
    order: {
      id: string;
      table_label: string;
      status: string;
      total_cents: number;
      created_at: string;
    };
    actions: Array<{
      label: string;
      status: string;
      action: () => void;
    }>;
  } = $props();

  const statusConfig: Record<string, { label: string; bg: string; dot: string }> = {
    submitted:            { label: 'Inviato',          bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
    pending_waiter_review: { label: 'Da confermare',    bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
    confirmed:            { label: 'Confermato',       bg: 'bg-blue-50 border-blue-200',    dot: 'bg-blue-500' },
    in_kitchen:           { label: 'In preparazione',  bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' },
    ready:                { label: 'Pronto',           bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    served:               { label: 'Servito',          bg: 'bg-gray-50 border-gray-200',    dot: 'bg-gray-400' },
  };

  const cfg = statusConfig[order.status] ?? { label: order.status, bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' };

  const time = new Date(order.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
</script>

<div class="rounded-xl border-2 {cfg.bg} p-4 transition-shadow hover:shadow-md">
  <div class="flex items-start justify-between mb-3">
    <div>
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-gray-900">Tavolo {order.table_label}</span>
        <span class="text-xs text-gray-400">{time}</span>
      </div>
    </div>
    <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full {cfg.bg} border {cfg.bg.replace('bg-', 'border-').replace('50', '300')}">
      <span class="w-1.5 h-1.5 rounded-full {cfg.dot}"></span>
      {cfg.label}
    </span>
  </div>

  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-gray-600">
      {(order.total_cents / 100).toFixed(2)}€
    </span>
    {#if actions.length > 0}
      <div class="flex gap-2">
        {#each actions as act}
          <button
            onclick={act.action}
            class="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
          >
            {act.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
