<script lang="ts">
  import { FileService } from "../services/FileService.svelte.js";
  import { BoardService } from "../services/BoardService.svelte.js";
  import CueButton from "./CueButton.svelte";
  import CueSettings from "./CueSettings.svelte";
  import ImportExportModal from "./ImportExportModal.svelte";

  // Props
  const { rows = 4, cols = 4 } = $props();

  // Services
  const fileService = new FileService();
  const boardService = new BoardService(rows, cols, fileService);

  // State
  let audioFiles = $state<string[]>([]);
  let showImportModal = $state(false);
  let showExportModal = $state(false);
  let exportData = $state("");
  let selectedCue: { row: number; col: number } | null = $state(null);
  let autoImportAttempted = $state(false);
  let cuesJsonAvailable = $state(false);

  // Reactive board reference
  let board = $state(boardService.getBoard());

  // Re-assign board when it changes
  function updateBoard() {
    board = boardService.getBoard();
  }

  async function openDirectory() {
    const success = await fileService.openDirectory();
    if (success) {
      audioFiles = fileService.getAudioFiles();

      // Check for cues.json and auto-import if found
      if (fileService.hasCuesJson()) {
        cuesJsonAvailable = true;

        if (!autoImportAttempted) {
          autoImportAttempted = true;
          const cuesJson = await fileService.loadCuesJson();
          if (cuesJson) {
            // Auto-import without confirmation
            await handleImport(cuesJson);
          }
        }
      } else {
        cuesJsonAvailable = false;
      }
    } else {
      alert("Directory access was cancelled or failed.");
    }
  }

  async function handleFileSelect(row: number, col: number, fileName: string) {
    await boardService.createCue(row, col, fileName);
  }

  function handleExport() {
    exportData = boardService.exportBoard();
    showExportModal = true;
  }

  async function handleImport(jsonData: string) {
    const success = await boardService.importBoard(jsonData);
    if (success) {
      updateBoard(); // Update the board reference after successful import
    } else {
      alert("Failed to import board. Invalid data format.");
    }
  }

  function handleClearBoard() {
    boardService.clearBoard();
    updateBoard(); // Update the board reference after clearing
  }

  function handleSettingsClick(row: number, col: number) {
    selectedCue = { row, col };
  }

  function handleSettingsClose() {
    selectedCue = null;
  }

  async function handleCopyToClipboard(data: string) {
    const success = await boardService.copyToClipboard(data);
    if (success) {
      alert("Copied to clipboard!");
    } else {
      alert("Failed to copy to clipboard.");
    }
  }

  function handleDownload(data: string) {
    boardService.downloadExport(data);
  }
</script>

<nav class="buttons">
  <button class="button is-primary" onclick={openDirectory}>
    Open Directory
  </button>
  <button class="button is-info" onclick={handleExport}> Export Board </button>
  <button
    class="button is-success"
    onclick={() => (showImportModal = true)}
    disabled={!fileService.hasDirectory()}
  >
    Import {cuesJsonAvailable ? "📄" : ""}
  </button>
  <button
    class="button is-warning"
    onclick={handleClearBoard}
    disabled={!board.grid.some((row) => row.some((cell) => cell !== null))}
  >
    Clear
  </button>
  <button
    class="button is-danger"
    onclick={async () => {
      // Save without confirmation
      const json = boardService.exportBoard();
      const blob = new Blob([json], { type: "application/json" });
      const file = new File([blob], "cues.json", {
        type: "application/json",
      });
      try {
        await fileService.saveCuesJson(file);
        // Optional notification that can be closed
        // No alert needed
      } catch (e) {
        alert("Failed to save cues.json: " + e);
      }
    }}
    disabled={!fileService.hasDirectory()}
  >
    Save
  </button>
</nav>

{#if !fileService.hasDirectory()}
  <div class="notification is-warning is-light">
    Please open a directory to load audio files.
  </div>
{:else if cuesJsonAvailable && !autoImportAttempted}
  <div class="notification is-info is-light">
    <button class="delete" onclick={() => (autoImportAttempted = true)}
    ></button>
    Board configuration loaded from this directory.
  </div>
{/if}

<div class="board" style="--cols: {cols}">
  {#each Array(rows) as _, row}
    {#each Array(cols) as _, col}
      {@const cue = board.getCue(row, col)}
      <section class="board-cell">
        {#if !cue}
          <div class="control is-expanded">
            <div class="select is-fullwidth">
              <select
                disabled={!fileService.hasDirectory}
                onchange={(e) =>
                  handleFileSelect(
                    row,
                    col,
                    (e.target as HTMLSelectElement).value,
                  )}
              >
                <option value="">Select file</option>
                {#each audioFiles as file}
                  <option value={file}>{file}</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="cue-placeholder box">Empty</div>
        {:else}
          <CueButton
            {cue}
            {board}
            {row}
            {col}
            onSettingsClick={() => handleSettingsClick(row, col)}
          />
        {/if}
      </section>
    {/each}
  {/each}
</div>

<!-- Import Modal -->
<ImportExportModal
  isOpen={showImportModal}
  mode="import"
  onClose={() => (showImportModal = false)}
  onImport={handleImport}
  hasDirectory={fileService.hasDirectory}
/>

<!-- Export Modal -->
<ImportExportModal
  isOpen={showExportModal}
  mode="export"
  data={exportData}
  onClose={() => (showExportModal = false)}
  onCopyToClipboard={handleCopyToClipboard}
  onDownload={handleDownload}
/>

<!-- Cue Settings Modal -->
{#if selectedCue && board.getCue(selectedCue.row, selectedCue.col)}
  <CueSettings
    isOpen={true}
    cue={board.getCue(selectedCue.row, selectedCue.col)!}
    {board}
    row={selectedCue.row}
    col={selectedCue.col}
    onClose={handleSettingsClose}
    {fileService}
  />
{/if}

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    width: 100%;
    height: calc(100vh - 10rem);
    gap: 0.5rem;
  }

  .board-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 120px;
  }

  .cue-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed #bbb;
    padding: 1rem;
    width: 100%;
    height: 100%;
  }

  .board-cell select {
    margin-bottom: 0.5rem;
  }

  .buttons {
    margin-bottom: 1rem;
  }
</style>
