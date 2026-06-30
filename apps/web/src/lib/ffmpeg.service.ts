import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface ProgressEvent {
  progress: number;
  time: number;
}

type ProgressCallback = (event: ProgressEvent) => void;
type LogCallback = (message: string) => void;

export class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loading = false;
  private progressCbs: ProgressCallback[] = [];
  private logCbs: LogCallback[] = [];

  get isLoaded() { return this.loaded; }
  get isLoading() { return this.loading; }
  get isAvailable() { return typeof window !== 'undefined' && typeof WebAssembly !== 'undefined'; }

  onProgress(cb: ProgressCallback) { this.progressCbs.push(cb); }
  onLog(cb: LogCallback) { this.logCbs.push(cb); }

  async load(): Promise<void> {
    if (this.loaded || this.loading) return;
    this.loading = true;

    try {
      this.ffmpeg = new FFmpeg();
      
      this.ffmpeg.on('progress', (event) => {
        for (const cb of this.progressCbs) cb(event);
      });
      this.ffmpeg.on('log', ({ message }) => {
        for (const cb of this.logCbs) cb(message);
      });

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.loaded = true;
    } catch (error) {
      console.error('FFmpeg.wasm load failed:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  private ensureLoaded() {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg not loaded. Call load() first.');
    }
  }

  async extractKeyframes(videoFile: File, count = 5): Promise<Blob[]> {
    this.ensureLoaded();
    const ffmpeg = this.ffmpeg!;
    const inputName = 'input' + this.getExtension(videoFile.name);
    
    // Write input file
    ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // Get video duration via ffprobe-style command
    await ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);
    
    // Extract keyframes at intervals
    const duration = await this.getDuration(videoFile);
    const interval = duration / count;
    const frames: Blob[] = [];

    for (let i = 0; i < count; i++) {
      const time = i * interval;
      const outputName = `frame_${i}.jpg`;
      
      await ffmpeg.exec([
        '-ss', String(time),
        '-i', inputName,
        '-frames:v', '1',
        '-q:v', '2',
        '-vf', 'scale=-2:720',
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName) as Uint8Array;
      frames.push(new Blob([data], { type: 'image/jpeg' }));
    }

    // Cleanup
    this.cleanup(inputName);
    for (let i = 0; i < count; i++) {
      this.cleanup(`frame_${i}.jpg`);
    }

    return frames;
  }

  async extractAudio(videoFile: File): Promise<Blob> {
    this.ensureLoaded();
    const ffmpeg = this.ffmpeg!;
    const inputName = 'input' + this.getExtension(videoFile.name);
    const outputName = 'audio.mp3';

    ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    await ffmpeg.exec([
      '-i', inputName,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ab', '128k',
      '-ar', '44100',
      '-y',
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName) as Uint8Array;
    this.cleanup(inputName);
    this.cleanup(outputName);

    return new Blob([data], { type: 'audio/mpeg' });
  }

  async getDuration(file: File): Promise<number> {
    this.ensureLoaded();
    const ffmpeg = this.ffmpeg!;
    const inputName = 'input' + this.getExtension(file.name);
    ffmpeg.writeFile(inputName, await fetchFile(file));

    return new Promise((resolve, reject) => {
      const unsubLog = this.ffmpeg!.on('log', ({ message }) => {
        const match = message.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
        if (match) {
          const hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const seconds = parseInt(match[3]);
          const duration = hours * 3600 + minutes * 60 + seconds;
          unsubLog(); // Clean up listener
          this.cleanup(inputName);
          resolve(duration);
        }
      });
      
      // trigger ffprobe
      ffmpeg.exec(['-i', inputName, '-f', 'null', '-']).catch(reject);
      
      // Timeout fallback
      setTimeout(() => {
        unsubLog();
        this.cleanup(inputName);
        resolve(10); // fallback duration
      }, 5000);
    });
  }

  private getExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || 'mp4';
    return '.' + ext;
  }

  private cleanup(name: string) {
    try {
      this.ffmpeg?.deleteFile(name);
    } catch {}
  }

  async terminate() {
    this.ffmpeg?.terminate();
    this.ffmpeg = null;
    this.loaded = false;
  }
}

export const ffmpegService = new FFmpegService();