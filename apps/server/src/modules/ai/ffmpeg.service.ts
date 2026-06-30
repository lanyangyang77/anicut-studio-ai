import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  private ffmpegPath: string | null = null;

  constructor(private readonly config: ConfigService) {
    this.resolveFfmpegPath();
  }

  get isAvailable(): boolean { return this.ffmpegPath !== null; }
  get binaryPath(): string | null { return this.ffmpegPath; }

  private resolveFfmpegPath() {
    try { const fp = require.resolve('ffmpeg-static'); this.ffmpegPath = fp; return; } catch {}
    try { const inst = require('@ffmpeg-installer/ffmpeg'); if (inst.path && fs.existsSync(inst.path)) { this.ffmpegPath = inst.path; return; } } catch {}
    const result = spawnSync('where', ['ffmpeg'], { encoding: 'utf8' });
    if (result.status === 0) {
      const line = result.stdout.trim().split('\n')[0];
      if (line && fs.existsSync(line.trim())) { this.ffmpegPath = line.trim(); return; }
    }
    this.logger.warn('FFmpeg not found. Video features disabled.');
  }

  detectShots(videoPath: string, threshold = 0.3): Promise<Array<{ start: number; end: number; type: string }>> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) { resolve([]); return; }
      const args = ['-i', videoPath, '-filter:v', "select='gt(scene," + threshold + ")',showinfo", '-f', 'null', '-'];
      const proc = spawn(this.ffmpegPath, args);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code !== 0) { resolve([]); return; }
        const times: number[] = [];
        const re = /pts_time:(\d+\.?\d*)/g; let m;
        while ((m = re.exec(stderr)) !== null) { const t = parseFloat(m[1]); if (t > 0) times.push(t); }
        const unique = [...new Set(times)].sort((a, b) => a - b);
        if (unique.length === 0) { resolve([]); return; }
        const shots: Array<{ start: number; end: number; type: string }> = [];
        let prev = 0;
        for (const t of unique) { shots.push({ start: prev, end: t, type: 'cut' }); prev = t; }
        const dur = this.getVideoDuration(videoPath);
        if (dur > prev) shots.push({ start: prev, end: dur, type: 'cut' });
        resolve(shots);
      });
      proc.on('error', (err) => reject(err));
    });
  }

  extractKeyframes(videoPath: string, outputDir: string, count = 5): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) { resolve([]); return; }
      const dur = this.getVideoDuration(videoPath);
      const interval = dur > 0 ? Math.max(1, dur / count) : 5;
      const args = ['-i', videoPath, '-vf', 'fps=1/' + interval + ',scale=-2:720', '-frames:v', String(count), '-q:v', '2', '-y', path.join(outputDir, 'frame_%03d.jpg')];
      const proc = spawn(this.ffmpegPath, args);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          const frames = fs.readdirSync(outputDir).filter(f => f.startsWith('frame_')).map(f => path.join(outputDir, f)).sort();
          resolve(frames);
        } else { reject(new Error('FFmpeg exit ' + code)); }
      });
      proc.on('error', (err) => reject(err));
    });
  }

  extractAudio(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) { resolve(videoPath); return; }
      const args = ['-i', videoPath, '-vn', '-acodec', 'libmp3lame', '-ab', '128k', '-ar', '44100', '-y', outputPath];
      const proc = spawn(this.ffmpegPath, args);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve(outputPath); else reject(new Error('Exit ' + code));
      });
      proc.on('error', (err) => reject(err));
    });
  }

  run(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegPath) { reject(new Error("FFmpeg not available")); return; }
      const proc = spawn(this.ffmpegPath, args);
      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error("FFmpeg exit " + code));
      });
      proc.on("error", (err) => reject(err));
    });
  }

  getVideoDuration(videoPath: string): number {
    if (!this.ffmpegPath || !fs.existsSync(videoPath)) return 0;
    const r = spawnSync(this.ffmpegPath, ['-i', videoPath, '-f', 'null', '-'], { encoding: 'utf8' });
    const m = r.stderr.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
    return m ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) : 0;
  }
}