<script lang="ts">
  let { id, name, description, priceCents }: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
  } = $props();

  function add() {
    const event = new CustomEvent('additem', {
      bubbles: true,
      detail: { id, name, priceCents },
    });
    this?.dispatchEvent(event);
  }

  function handleClick(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    const event = new CustomEvent('additem', {
      bubbles: true,
      detail: { id, name, priceCents },
    });
    target.dispatchEvent(event);
  }
</script>

<button
  onclick={handleClick}
  class="w-full flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-blue-400 text-left"
>
  <div>
    <span class="font-medium text-gray-900">{name}</span>
    {#if description}
      <p class="text-sm text-gray-500 mt-0.5">{description}</p>
    {/if}
  </div>
  <span class="text-blue-600 font-semibold whitespace-nowrap ml-2">
    {(priceCents / 100).toFixed(2)}€
  </span>
</button>
