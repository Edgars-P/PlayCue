import { Board } from "../models/Board.svelte.js";
import { Cue } from "../models/Cue.svelte.js";
import { FileService } from "./FileService.svelte.js";

export class BoardService {
  private board: Board = $state(null as unknown as Board);
  private fileService: FileService;

  constructor(rows: number, cols: number, fileService: FileService) {
    this.board = new Board(rows, cols);
    this.fileService = fileService;
  }

  getBoard(): Board {
    return this.board;
  }

  async createCue(
    row: number,
    col: number,
    fileName: string,
  ): Promise<boolean> {
    if (!fileName) {
      this.board.setCue(row, col, null);
      return false;
    }

    console.log(`Creating cue at [${row},${col}] for file: "${fileName}"`);

    const url = await this.fileService.getFileUrl(fileName);
    if (!url) {
      console.warn(`Failed to get URL for file: "${fileName}"`);
      this.board.setCue(row, col, null);
      return false;
    }

    console.log(`Successfully created URL for file: "${fileName}"`);
    const cue = new Cue(url, fileName);
    this.board.setCue(row, col, cue);
    return true;
  }

  clearBoard(): void {
    const { rows, cols } = this.board.dimensions;
    // Create a new board instance to trigger reactivity
    this.board = new Board(rows, cols);
    console.log("Board cleared");
  }

  exportBoard(): string {
    const boardData = this.board.export();
    return JSON.stringify(boardData, null, 2);
  }

  async importBoard(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);

      // Check if we have directory access before importing
      if (!this.fileService.hasDirectory) {
        console.error("No directory access. Open a directory first.");
        return false;
      }

      // Create a new board instance
      const newBoard = Board.import(data);

      // Set the board to the new instance
      this.board = newBoard;

      // Then reload all audio files to get fresh URLs
      await this.reloadAudioFiles();

      console.log("Board imported successfully");
      return true;
    } catch (e) {
      console.error("Failed to import board:", e);
      return false;
    }
  }

  private async reloadAudioFiles(): Promise<void> {
    const { rows, cols } = this.board.dimensions;
    console.log(
      `Reloading audio files for board with ${rows} rows and ${cols} columns`,
    );

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cue = this.board.getCue(r, c);

        // Skip empty cells
        if (!cue) continue;

        console.log(
          `Processing cue at [${r},${c}] with fileName: "${cue.fileName}"`,
        );

        // Clear any previous path that might be a blob URL
        // We'll always create a fresh URL below if the file is available
        cue.path = "";

        if (!cue.fileName) {
          // No filename at all - this shouldn't happen
          console.warn(`Cue at [${r},${c}] has no fileName`);
          cue.isAvailable = false;
          continue;
        }

        // Try to get a URL for the file
        const url = await this.fileService.getFileUrl(cue.fileName);

        if (url) {
          console.log(
            `Successfully got URL for "${cue.fileName}" at [${r},${c}]`,
          );
          cue.path = url;
          cue.isAvailable = true;
          cue.initializeAudio();
        } else {
          console.warn(
            `Failed to get URL for "${cue.fileName}" at [${r},${c}]`,
          );
          this.markCueUnavailable(cue, r, c);
        }
      }
    }

    console.log("Finished reloading audio files");
  }

  private markCueUnavailable(cue: Cue, row: number, col: number): void {
    console.warn(
      `File not found: "${cue.fileName}" for cue at [${row},${col}]`,
    );
    cue.path = ""; // Clear the path since the file is not available
    cue.audio = null; // Clear the audio element
    cue.isAvailable = false;

    // Also log all available files to help debug
    console.log("Available files when marking unavailable:");
    this.fileService
      .getAudioFiles()
      .forEach((file) => console.log(` - "${file}"`));
  }

  downloadExport(data: string): void {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playcue-board.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.error("Failed to copy to clipboard:", e);
      return false;
    }
  }
}
