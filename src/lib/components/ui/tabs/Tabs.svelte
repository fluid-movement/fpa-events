<script lang="ts">
  interface Tab {
    id: string;
    label: string;
  }

  interface Props {
    tabs: Tab[];
    active: string;
  }

  let { tabs, active = $bindable() }: Props = $props();
</script>

<div class="flex w-fit gap-1 rounded-lg border bg-muted/40 p-1">
  {#each tabs as tab (tab.id)}
    <button
      onclick={() => (active = tab.id)}
      class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {active === tab.id
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'}"
    >
      {tab.label}
    </button>
  {/each}
</div>
