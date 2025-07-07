<script lang="ts">
  import Modal from "./Modal.svelte";

  const {
    isOpen = false,
    mode = "export",
    data = "",
    onClose,
    onImport,
    onExport,
    onCopyToClipboard,
    onDownload,
    hasDirectory = true,
  }: {
    isOpen: boolean;
    mode: "import" | "export";
    data?: string;
    onClose: () => void;
    onImport?: (data: string) => void;
    onExport?: () => void;
    onCopyToClipboard?: (data: string) => void;
    onDownload?: (data: string) => void;
    hasDirectory?: boolean;
  } = $props();

  let textareaValue = $state("");

  $effect(() => {
    if (mode === "export" && data) {
      textareaValue = data;
    } else if (mode === "import") {
      textareaValue = "";
    }
  });

  function handleImport() {
    if (onImport && textareaValue.trim()) {
      onImport(textareaValue.trim());
      onClose();
    }
  }

  function handleCopyToClipboard() {
    if (onCopyToClipboard) {
      onCopyToClipboard(textareaValue);
    }
  }

  function handleDownload() {
    if (onDownload) {
      onDownload(textareaValue);
    }
  }
</script>

<Modal
  {isOpen}
  title={mode === "import" ? "Import Board" : "Export Board"}
  {onClose}
>
  {#snippet children()}
    <div class="field">
      <label class="label">
        {mode === "import" ? "Paste JSON Data" : "Board JSON Data"}
      </label>
      <div class="control">
        <textarea
          class="textarea"
          rows="10"
          placeholder={mode === "import"
            ? "Paste exported board JSON here"
            : ""}
          readonly={mode === "export"}
          bind:value={textareaValue}
        ></textarea>
      </div>
      {#if mode === "export"}
        <p class="help">Copy this JSON or use the download button below.</p>
      {:else if mode === "import" && !hasDirectory}
        <p class="help has-text-danger">
          Please open an audio directory first to properly import cues.
        </p>
      {/if}
    </div>

    <div class="field is-grouped">
      {#if mode === "import"}
        <div class="control">
          <button
            class="button is-success"
            disabled={!textareaValue.trim() || !hasDirectory}
            onclick={handleImport}
          >
            Import
          </button>
        </div>
      {:else}
        <div class="control">
          <button class="button is-primary" onclick={handleCopyToClipboard}>
            Copy to Clipboard
          </button>
        </div>
        <div class="control">
          <button class="button is-info" onclick={handleDownload}>
            Download JSON
          </button>
        </div>
      {/if}
      <div class="control">
        <button class="button" onclick={onClose}>
          {mode === "import" ? "Cancel" : "Close"}
        </button>
      </div>
    </div>
  {/snippet}
</Modal>
