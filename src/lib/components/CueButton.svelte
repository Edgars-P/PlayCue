<script lang="ts">
  import type { Cue } from "../models/Cue.svelte.js";
  import type { Board } from "../models/Board.svelte.js";

  const {
    cue,
    board,
    row,
    col,
    onSettingsClick,
  }: {
    cue: Cue;
    board: Board;
    row: number;
    col: number;
    onSettingsClick: () => void;
  } = $props();

  function handleTrigger() {
    cue.trigger(board);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTrigger();
    }
  }

  function handleSettingsClick(event: MouseEvent) {
    event.stopPropagation();
    onSettingsClick();
  }

  function getStateClass() {
    return {
      playing: "is-success",
      "fade-in": "is-info",
      "fade-out": "is-warning",
      stopped: "is-light",
    }[cue.state];
  }

  function getStateText() {
    switch (cue.state) {
      case "fade-in":
        return "▶️ Fading In...";
      case "fade-out":
        return "⏸ Fading Out...";
      case "playing":
        return "⏸ Stop";
      default:
        return "▶️ Play";
    }
  }
</script>

<div
  class="cue-btn button is-fullwidth {cue.isAvailable
    ? getStateClass()
    : 'is-danger is-light'}"
  onclick={cue.isAvailable ? handleTrigger : undefined}
  onkeydown={cue.isAvailable ? handleKeydown : undefined}
  aria-label={cue.isAvailable ? "Play/Pause Cue" : "File Unavailable"}
  role="button"
  tabindex="0"
>
  <span class="cue-display-name has-text-weight-bold">
    {#if cue.displayName}
      {cue.displayName}
    {:else}
      <span class="has-text-grey">No Name</span>
    {/if}
    {#if !cue.isAvailable}
      <span class="missing-file-indicator">⚠️ File Not Found</span>
    {/if}
  </span>

  {#if cue.isAvailable}
    <span class="is-size-7">
      Vol: {cue.volume.toFixed(2)}
      {cue.loop ? "🔁" : ""}
      {cue.startTime > 0 ? `⏱ ${cue.startTime.toFixed(1)}s` : ""}
    </span>
  {:else}
    <span class="is-size-7">
      {cue.fileName || "Unknown file"}
    </span>
  {/if}

  <span class="is-size-7">[{row},{col}]</span>

  {#if cue.isAvailable}
    <span class="is-size-7">
      {getStateText()}
    </span>
  {/if}

  <button
    class="settings-toggle-btn button is-small is-rounded is-white"
    onclick={handleSettingsClick}
    aria-label="Show Settings"
  >
    ⚙️
  </button>
</div>

<style>
  .cue-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    position: relative;
    padding-top: 2rem;
    padding-bottom: 0.5rem;
  }

  .cue-display-name {
    word-break: break-word;
    text-align: center;
    margin-bottom: 0.2rem;
    padding: 0 0.2rem;
  }

  .settings-toggle-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    line-height: 1;
    z-index: 10;
  }

  .missing-file-indicator {
    color: #ff3860;
    font-weight: bold;
    font-size: 0.9rem;
    display: block;
    margin-top: 0.25rem;
    background: rgba(255, 56, 96, 0.1);
    padding: 2px 5px;
    border-radius: 4px;
  }
</style>
