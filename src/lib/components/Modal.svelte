<script lang="ts">
  const {
    isOpen = false,
    title = "",
    onClose,
    children,
  }: {
    isOpen: boolean;
    title?: string;
    onClose: () => void;
    children: any;
  } = $props();
</script>

{#if isOpen}
  <div class="modal is-active">
    <div class="modal-background" onclick={onClose}></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{title}</p>
        <button class="delete" aria-label="close" onclick={onClose}></button>
      </header>
      <section class="modal-card-body">
        {@render children()}
      </section>
    </div>
  </div>
{/if}
