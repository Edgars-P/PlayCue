import { CueEvent } from "./CueEvent.svelte";

export class Cue {
  audio: HTMLAudioElement | null = null;
  path: string;
  fileName: string = $state("");
  displayName: string = $state("");
  fadeIn: number = $state(0);
  fadeOut: number = $state(0);
  volume: number = $state(1.0);
  loop: boolean = $state(false);
  startTime: number = $state(0); // Start time in seconds
  state: "stopped" | "fade-in" | "playing" | "fade-out" = $state("stopped");
  isAvailable: boolean = $state(true);
  onStart: CueEvent[] = $state([]);
  onEnd: CueEvent[] = $state([]);
  private activeController: AbortController | null = null;

  constructor(pathOrObj: string | any, fileName?: string) {
    if (typeof pathOrObj === "string") {
      this.path = pathOrObj;
      this.fileName = fileName || "";
      // If no explicit filename but we have a path
      if (!this.fileName && pathOrObj) {
        // Try to extract filename from path, but not for blob URLs
        if (!pathOrObj.startsWith("blob:")) {
          this.fileName = pathOrObj.split("/").pop() || "";
        }
      }
      this.displayName = this.fileName.replace(/\.(mp3|wav|ogg)$/i, "") || "";
      this.onStart = [];
      this.onEnd = [];
    } else {
      // Restore from JSON object
      this.path = ""; // Don't use the old path which might be a blob URL
      this.fileName = pathOrObj.fileName || "";
      this.displayName =
        pathOrObj.displayName ??
        (pathOrObj.fileName ||
          pathOrObj.path
            .split("/")
            .pop()
            ?.replace(/\.(mp3|wav|ogg)$/i, "") ||
          "");
      this.fadeIn = pathOrObj.fadeIn ?? 0;
      this.fadeOut = pathOrObj.fadeOut ?? 0;
      this.volume = pathOrObj.volume ?? 1.0;
      this.loop = pathOrObj.loop ?? false;
      this.startTime = pathOrObj.startTime ?? 0;
      this.isAvailable = false; // Start as unavailable until we verify the file
      this.onStart =
        pathOrObj.onStart?.map((eventObj: any) => new CueEvent(eventObj)) ?? [];
      this.onEnd =
        pathOrObj.onEnd?.map((eventObj: any) => new CueEvent(eventObj)) ?? [];
    }

    this.initializeAudio();
  }

  initializeAudio() {
    if (!this.path) {
      this.isAvailable = false;
      this.audio = null;
      return;
    }

    try {
      // Create a new audio element
      this.audio = new Audio(this.path);
      this.audio.preload = "auto";
      this.audio.volume = this.volume;
      this.audio.loop = this.loop;
      this.isAvailable = true;

      // Add event listener for playback ending
      this.audio.addEventListener("ended", () => {
        if (!this.loop) {
          this.state = "stopped";
        }
      });

      // Add error handler for audio loading failures
      this.audio.addEventListener("error", (e) => {
        console.error(`Error loading audio for "${this.fileName}":`, e);
        this.isAvailable = false;
      });
    } catch (e) {
      console.error(`Failed to initialize audio for "${this.fileName}":`, e);
      this.isAvailable = false;
      this.audio = null;
    }
  }

  async play() {
    if (!this.audio || !this.isAvailable) return;

    const oldController = this.activeController;
    this.activeController = new AbortController();

    if (oldController) {
      oldController.abort();
    }

    const signal = this.activeController.signal;

    this.audio.loop = this.loop;
    this.audio.currentTime = this.startTime;
    this.audio.volume = 0;
    await this.audio.play();
    this.state = "fade-in";

    try {
      await this.adjustVolume(this.volume, {
        duration: this.fadeIn,
        signal,
      });
      this.state = "playing";
    } catch (e: any) {
      if (e?.name === "AbortError") {
        if (this.activeController === null) {
          this.state = "stopped";
        }
      } else {
        console.error("Error during cue play:", e);
        this.state = "stopped";
      }
    } finally {
      this.activeController = null;
    }
  }

  async stop(): Promise<void> {
    if (!this.audio || !this.isAvailable) return;

    const oldController = this.activeController;
    this.activeController = new AbortController();

    if (oldController) {
      oldController.abort();
    }

    const signal = this.activeController.signal;

    this.state = "fade-out";
    try {
      await this.adjustVolume(0, {
        duration: this.fadeOut,
        signal,
      });
      this.state = "stopped";
    } catch (e: any) {
      if (e.name === "AbortError") {
        if (this.activeController === null) {
          this.state = "stopped";
        }
      } else {
        console.error("Error during cue stop:", e);
      }
    } finally {
      this.audio.pause();
      this.audio.currentTime = this.startTime;
      this.audio.volume = 0;
      this.activeController = null;
    }
  }

  async trigger(board: any) {
    if (!this.audio || !this.isAvailable) return;

    switch (this.state) {
      case "stopped":
        this.executeEvents(this.onStart, board);
        await this.play();
        break;
      case "fade-in":
        await this.stop();
        break;
      case "playing":
        this.executeEvents(this.onEnd, board);
        await this.stop();
        break;
      case "fade-out":
        if (this.activeController) {
          this.activeController.abort();
          this.activeController = null;
        }
        this.audio.pause();
        this.audio.currentTime = this.startTime;
        this.audio.volume = 0;
        this.state = "stopped";
        break;
    }
  }

  private async executeEvents(events: CueEvent[], board: any) {
    for (const event of events) {
      const targetCue = board.getCue(event.row, event.col);
      if (targetCue) {
        switch (event.action) {
          case "play":
            if (targetCue.state === "stopped") {
              await targetCue.play();
            }
            break;
          case "stop":
            if (targetCue.state !== "stopped") {
              await targetCue.stop();
            }
            break;
        }
      }
    }
  }

  private async adjustVolume(
    newVolume: number,
    {
      duration = 1000,
      interval = 13,
      signal,
    }: {
      duration?: number;
      interval?: number;
      signal?: AbortSignal;
    } = {},
  ): Promise<void> {
    if (!this.audio) return;

    const originalVolume = this.audio.volume;
    const delta = newVolume - originalVolume;

    if (signal?.aborted) {
      this.audio.volume = originalVolume;
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }

    if (!delta || !duration) {
      this.audio.volume = newVolume;
      return Promise.resolve();
    }

    const ticks = Math.floor(duration / interval);
    let tick = 1;

    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        this.audio!.volume = originalVolume + this.swing(tick / ticks) * delta;

        if (signal?.aborted) {
          clearInterval(timer);
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }

        if (++tick === ticks + 1) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });
  }

  private swing(p: number) {
    return 0.5 - Math.cos(p * Math.PI) / 2;
  }

  export(): object {
    return {
      path: this.path,
      fileName: this.fileName,
      displayName: this.displayName,
      fadeIn: this.fadeIn,
      fadeOut: this.fadeOut,
      volume: this.volume,
      loop: this.loop,
      startTime: this.startTime,
      onStart: this.onStart.map((event) => event.export()),
      onEnd: this.onEnd.map((event) => event.export()),
      isAvailable: this.isAvailable,
    };
  }

  static fromJSON(json: object): Cue {
    return new Cue(json);
  }
}
