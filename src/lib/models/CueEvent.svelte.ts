export class CueEvent {
  row: number;
  col: number;
  action: "play" | "stop";

  constructor(obj: any) {
    this.row = obj.row;
    this.col = obj.col;
    this.action = obj.action;
  }

  export(): object {
    return {
      row: this.row,
      col: this.col,
      action: this.action,
    };
  }
}
