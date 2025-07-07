<script lang="ts">
  import { CueEvent } from "../models/CueEvent.svelte.js";
  import type { Cue } from "../models/Cue.svelte.js";
  import type { Board } from "../models/Board.svelte.js";
  import Modal from "./Modal.svelte";
  import { FileService } from "../services/FileService.svelte.js";

  const {
    isOpen = false,
    cue,
    board,
    row,
    col,
    onClose,
    fileService,
  }: {
    isOpen: boolean;
    cue: Cue;
    board: Board;
    row: number;
    col: number;
    onClose: () => void;
    fileService: FileService;
  } = $props();

  let newOnStartEvent = $state({ row: 0, col: 0, action: "play" as const });
  let newOnEndEvent = $state({ row: 0, col: 0, action: "play" as const });
  let availableFiles = $derived(fileService.getAudioFiles());
  let selectedFile = $state(cue.fileName || "");

  // Generate cue options for dropdowns
  let cueOptions = $derived(
    (() => {
      const options = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const targetCue = board.getCue(r, c);
          if (targetCue) {
            options.push({
              row: r,
              col: c,
              label: `[${r},${c}] ${targetCue.displayName || "Untitled"}`,
            });
          } else {
            options.push({
              row: r,
              col: c,
              label: `[${r},${c}] Empty`,
            });
          }
        }
      }
      return options;
    })(),
  );

  const { rows, cols } = board.dimensions;

  function setCurrentAsStartTime() {
    // Placeholder function - preview functionality removed
    alert("Preview functionality has been removed");
  }

  function addEvent(type: "onStart" | "onEnd") {
    if (type === "onStart") {
      cue.onStart = [...cue.onStart, new CueEvent(newOnStartEvent)];
      newOnStartEvent = { row: 0, col: 0, action: "play" };
    } else {
      cue.onEnd = [...cue.onEnd, new CueEvent(newOnEndEvent)];
      newOnEndEvent = { row: 0, col: 0, action: "play" };
    }
  }

  function removeEvent(type: "onStart" | "onEnd", index: number) {
    if (type === "onStart") {
      cue.onStart = cue.onStart.filter((_, i) => i !== index);
    } else {
      cue.onEnd = cue.onEnd.filter((_, i) => i !== index);
    }
  }

  async function updateFileAssociation() {
    if (selectedFile === cue.fileName) {
      return; // No change needed
    }

    if (!selectedFile) {
      // Clear file association
      cue.fileName = "";
      cue.path = "";
      cue.isAvailable = false;
      cue.audio = null;
      return;
    }

    // Get a fresh URL for the selected file
    const url = await fileService.getFileUrl(selectedFile);
    if (url) {
      cue.fileName = selectedFile;
      cue.path = url;
      cue.isAvailable = true;
      cue.initializeAudio();

      // Update display name if it's the same as the old filename without extension
      const oldNameWithoutExt = cue.fileName.replace(/\.(mp3|wav|ogg)$/i, "");
      if (cue.displayName === oldNameWithoutExt || !cue.displayName) {
        cue.displayName = selectedFile.replace(/\.(mp3|wav|ogg)$/i, "");
      }
    }
  }
</script>

<Modal {isOpen} title="Cue Settings" {onClose}>
  {#snippet children()}
    <div class="settings-content">
      <!-- Basic Settings -->
      <div class="box">
        <h4 class="title is-5">Basic Settings</h4>

        <!-- File Association -->
        <div class="field">
          <label class="label" for="file-{row}-{col}">
            Audio File {!cue.isAvailable ? "⚠️ Current file not found" : ""}
          </label>
          <div class="control">
            <div
              class="select is-fullwidth {!cue.isAvailable ? 'is-danger' : ''}"
            >
              <select
                id="file-{row}-{col}"
                bind:value={selectedFile}
                onchange={updateFileAssociation}
              >
                <option value="">Select file</option>
                {#each availableFiles as file}
                  <option value={file} selected={file === cue.fileName}
                    >{file}</option
                  >
                {/each}
              </select>
            </div>
          </div>
          {#if !cue.isAvailable}
            <p class="help is-danger">
              File "{cue.fileName}" not found in current directory. Please
              select a replacement file from the dropdown above.
            </p>
          {/if}
        </div>

        <div class="field">
          <label class="label" for="displayname-{row}-{col}">
            Display Name
          </label>
          <div class="control">
            <input
              class="input"
              type="text"
              id="displayname-{row}-{col}"
              bind:value={cue.displayName}
              placeholder="Enter display name"
            />
          </div>
        </div>

        <div class="field">
          <label class="label" for="volume-{row}-{col}">
            Volume: {cue.volume.toFixed(2)}
          </label>
          <div class="control">
            <input
              class="slider is-fullwidth"
              type="range"
              id="volume-{row}-{col}"
              min="0"
              max="1"
              step="0.01"
              bind:value={cue.volume}
            />
          </div>
        </div>

        <div class="field">
          <label class="label" for="fadein-{row}-{col}"> Fade In (ms) </label>
          <div class="control">
            <input
              class="input"
              type="number"
              id="fadein-{row}-{col}"
              min="0"
              bind:value={cue.fadeIn}
              placeholder="0"
            />
          </div>
        </div>

        <div class="field">
          <label class="label" for="fadeout-{row}-{col}"> Fade Out (ms) </label>
          <div class="control">
            <input
              class="input"
              type="number"
              id="fadeout-{row}-{col}"
              min="0"
              bind:value={cue.fadeOut}
              placeholder="0"
            />
          </div>
        </div>

        <div class="field">
          <label class="checkbox">
            <input type="checkbox" bind:checked={cue.loop} />
            Loop
          </label>
        </div>

        <div class="field">
          <label class="label" for="starttime-{row}-{col}">
            Start Time (seconds)
          </label>
          <div class="control">
            <input
              class="input"
              type="number"
              id="starttime-{row}-{col}"
              min="0"
              step="0.1"
              bind:value={cue.startTime}
              placeholder="0"
            />
          </div>
          <p class="help">
            Set a custom start position in the audio file
            {#if !cue.isAvailable}
              <span class="has-text-danger">Audio unavailable</span>
            {/if}
          </p>
        </div>
      </div>

      <!-- On Start Events -->
      <div class="box">
        <h4 class="title is-5">On Start Events</h4>

        {#if cue.onStart.length === 0}
          <p class="has-text-grey is-italic">No events configured.</p>
        {:else}
          {#each cue.onStart as event, i}
            <div class="event-item notification is-info is-light">
              <div class="level">
                <div class="level-left">
                  <div class="level-item">
                    <span>
                      Trigger [{event.row},{event.col}]
                      <strong>
                        {board.getCue(event.row, event.col)?.displayName ||
                          "Empty"}
                      </strong>
                      to <span class="tag is-info">{event.action}</span>
                    </span>
                  </div>
                </div>
                <div class="level-right">
                  <div class="level-item">
                    <button
                      class="button is-danger is-small"
                      onclick={() => removeEvent("onStart", i)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        {/if}

        <div class="add-event-form">
          <div class="field is-grouped">
            <div class="control is-expanded">
              <div class="select is-fullwidth">
                <select
                  onchange={(e) => {
                    const [row, col] = (e.target as HTMLSelectElement).value
                      .split(",")
                      .map(Number);
                    newOnStartEvent.row = row;
                    newOnStartEvent.col = col;
                  }}
                >
                  <option value="" disabled selected>Select cue target</option>
                  {#each cueOptions as option}
                    <option value={`${option.row},${option.col}`}
                      >{option.label}</option
                    >
                  {/each}
                </select>
              </div>
            </div>
            <div class="control">
              <div class="select">
                <select bind:value={newOnStartEvent.action}>
                  <option value="play">Play</option>
                  <option value="stop">Stop</option>
                </select>
              </div>
            </div>
            <div class="control">
              <button
                class="button is-primary"
                onclick={() => addEvent("onStart")}
                disabled={newOnStartEvent.row === undefined ||
                  newOnStartEvent.col === undefined}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- On End Events -->
      <div class="box">
        <h4 class="title is-5">On End Events</h4>

        {#if cue.onEnd.length === 0}
          <p class="has-text-grey is-italic">No events configured.</p>
        {:else}
          {#each cue.onEnd as event, i}
            <div class="event-item notification is-info is-light">
              <div class="level">
                <div class="level-left">
                  <div class="level-item">
                    <span>
                      Trigger [{event.row},{event.col}]
                      <strong>
                        {board.getCue(event.row, event.col)?.displayName ||
                          "Empty"}
                      </strong>
                      to <span class="tag is-info">{event.action}</span>
                    </span>
                  </div>
                </div>
                <div class="level-right">
                  <div class="level-item">
                    <button
                      class="button is-danger is-small"
                      onclick={() => removeEvent("onEnd", i)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        {/if}

        <div class="add-event-form">
          <div class="field is-grouped">
            <div class="control is-expanded">
              <div class="select is-fullwidth">
                <select
                  onchange={(e) => {
                    const [row, col] = (e.target as HTMLSelectElement).value
                      .split(",")
                      .map(Number);
                    newOnEndEvent.row = row;
                    newOnEndEvent.col = col;
                  }}
                >
                  <option value="" disabled selected>Select cue target</option>
                  {#each cueOptions as option}
                    <option value={`${option.row},${option.col}`}
                      >{option.label}</option
                    >
                  {/each}
                </select>
              </div>
            </div>
            <div class="control">
              <div class="select">
                <select bind:value={newOnEndEvent.action}>
                  <option value="play">Play</option>
                  <option value="stop">Stop</option>
                </select>
              </div>
            </div>
            <div class="control">
              <button
                class="button is-primary"
                onclick={() => addEvent("onEnd")}
                disabled={newOnEndEvent.row === undefined ||
                  newOnEndEvent.col === undefined}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/snippet}
</Modal>

<style>
  .settings-content {
    max-height: 70vh;
    overflow-y: auto;
  }

  .event-item {
    margin-bottom: 0.5rem;
  }

  .add-event-form {
    border-top: 1px solid #dbdbdb;
    padding-top: 1rem;
    margin-top: 1rem;
  }

  .slider {
    width: 100%;
  }
</style>
