import { Cue } from "./Cue.svelte";

export class Board {
  grid: (Cue | null)[][] = $state([]);

  constructor(rowsOrObj: number | any, cols?: number) {
    if (typeof rowsOrObj === "number" && typeof cols === "number") {
      // Create empty board
      this.grid = Array.from({ length: rowsOrObj }, () =>
        Array.from({ length: cols }, () => null),
      );
    } else if (typeof rowsOrObj === "object" && rowsOrObj.grid) {
      // Restore from JSON object
      this.grid = rowsOrObj.grid.map((row: any[]) =>
        row.map((cueObj: any) => (cueObj ? Cue.fromJSON(cueObj) : null)),
      );
    } else {
      throw new Error("Invalid Board constructor arguments");
    }
  }

  setCue = (row: number, col: number, cue: Cue | null) => {
    if (this.isValidPosition(row, col)) {
      this.grid[row][col] = cue;
    }
  };

  getCue = (row: number, col: number): Cue | null => {
    if (this.isValidPosition(row, col)) {
      return this.grid[row][col];
    }
    return null;
  };

  private isValidPosition(row: number, col: number): boolean {
    return (
      row >= 0 &&
      row < this.grid.length &&
      col >= 0 &&
      col < this.grid[0].length
    );
  }

  get dimensions() {
    return {
      rows: this.grid.length,
      cols: this.grid[0]?.length || 0,
    };
  }

  export(): object {
    const serializableGrid = this.grid.map((row) =>
      row.map((cue) => (cue ? cue.export() : null)),
    );
    return { grid: serializableGrid };
  }

  static import(obj: object): Board {
    return new Board(obj);
  }
}
