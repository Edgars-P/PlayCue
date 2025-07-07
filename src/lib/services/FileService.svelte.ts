export class FileService {
  private directoryHandle: FileSystemDirectoryHandle | null = $state(null);
  private fileHandles: Record<string, FileSystemFileHandle> = $state({});
  private audioFiles: string[] = $state([]);
  private cuesJsonHandle: FileSystemFileHandle | null = $state(null);

  async openDirectory(): Promise<boolean> {
    try {
      // Clear previous data
      this.directoryHandle = null;
      this.audioFiles = [];
      this.fileHandles = {};

      // @ts-ignore
      this.directoryHandle = await window.showDirectoryPicker();
      if (this.directoryHandle) {
        await this.loadAudioFiles();
        console.log(
          `Opened directory with ${this.audioFiles.length} audio files`,
        );
        return true;
      }
      return false;
    } catch (e) {
      console.error("Directory access failed:", e);
      this.directoryHandle = null;
      return false;
    }
  }

  private async loadAudioFiles(): Promise<void> {
    if (!this.directoryHandle) return;

    this.audioFiles = [];
    this.fileHandles = {};
    this.cuesJsonHandle = null;

    for await (const entry of this.directoryHandle.values()) {
      if (entry.kind === "file") {
        if (this.isAudioFile(entry.name)) {
          this.audioFiles.push(entry.name);
          this.fileHandles[entry.name] = entry as FileSystemFileHandle;
          console.log(`Found audio file: "${entry.name}"`);
        } else if (entry.name === "cues.json") {
          this.cuesJsonHandle = entry as FileSystemFileHandle;
          console.log("Found cues.json file in directory");
        }
      }
    }

    this.audioFiles.sort();
    console.log(`Loaded ${this.audioFiles.length} audio files`);

    // Log all available files for debugging
    if (this.audioFiles.length > 0) {
      console.log("Available audio files:");
      this.audioFiles.forEach((file) => console.log(` - "${file}"`));
    }
  }

  hasCuesJson(): boolean {
    return this.cuesJsonHandle !== null;
  }

  async loadCuesJson(): Promise<string | null> {
    if (!this.cuesJsonHandle) return null;

    try {
      const file = await this.cuesJsonHandle.getFile();
      const text = await file.text();
      console.log("Successfully loaded cues.json");
      return text;
    } catch (e) {
      console.error("Failed to load cues.json:", e);
      return null;
    }
  }

  private isAudioFile(fileName: string): boolean {
    return !!(fileName && /\.(mp3|wav|ogg)$/i.test(fileName));
  }

  async getFileUrl(fileName: string): Promise<string | null> {
    if (!fileName || !this.directoryHandle) {
      console.warn(`File not available: ${fileName}`);
      return null;
    }

    // Try exact match first
    let fileHandle = this.fileHandles[fileName];

    // If no exact match, try case-insensitive match
    if (!fileHandle) {
      const lowerFileName = fileName.toLowerCase();
      const matchingFile = Object.keys(this.fileHandles).find(
        (file) => file.toLowerCase() === lowerFileName,
      );

      if (matchingFile) {
        console.log(
          `Using case-insensitive match for "${fileName}": "${matchingFile}"`,
        );
        fileHandle = this.fileHandles[matchingFile];
      }
    }

    if (!fileHandle) {
      console.warn(`No file handle found for: ${fileName}`);
      return null;
    }

    try {
      const file = await fileHandle.getFile();
      // Create a new blob URL each time to avoid stale references
      const url = URL.createObjectURL(file);
      console.log(`Created URL for ${fileName}: ${url}`);
      return url;
    } catch (e) {
      console.error(`Failed to get file URL for ${fileName}:`, e);
      return null;
    }
  }

  getAudioFiles(): string[] {
    return [...this.audioFiles];
  }

  hasDirectory(): boolean {
    return this.directoryHandle !== null;
  }

  hasFile(fileName: string): boolean {
    if (!this.directoryHandle || !fileName) {
      console.warn(
        `Cannot check file - no directory or filename: "${fileName}"`,
      );
      return false;
    }

    // Check exact match first
    const hasExactMatch = fileName in this.fileHandles;

    if (hasExactMatch) {
      console.log(`Found exact match for file: "${fileName}"`);
      return true;
    }

    // Try case-insensitive match
    const lowerFileName = fileName.toLowerCase();
    const matchingFile = Object.keys(this.fileHandles).find(
      (file) => file.toLowerCase() === lowerFileName,
    );

    if (matchingFile) {
      console.log(
        `Found case-insensitive match for "${fileName}": "${matchingFile}"`,
      );
      return true;
    }

    // Debug output
    console.warn(`File not found in directory: "${fileName}"`);
    console.log(`Looking for: "${fileName}"`);
    console.log(`Available files: ${Object.keys(this.fileHandles).join(", ")}`);

    return false;
  }

  async saveCuesJson(file: File): Promise<void> {
    if (!this.directoryHandle) {
      throw new Error("No directory selected");
    }

    try {
      // Create or overwrite the cues.json file in the directory
      // @ts-ignore - Modern file system API methods are not in all TypeScript types
      const fileHandle = await this.directoryHandle.getFileHandle("cues.json", {
        create: true,
      });

      // @ts-ignore - Modern file system API methods are not in all TypeScript types
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      // Update our reference to the cues.json file
      this.cuesJsonHandle = fileHandle;
      console.log("Successfully saved cues.json to directory");
    } catch (e) {
      console.error("Failed to save cues.json:", e);
      throw e;
    }
  }
}
