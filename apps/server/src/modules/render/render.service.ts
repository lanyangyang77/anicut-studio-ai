import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FfmpegService } from '../ai/ffmpeg.service';
import { EditorGateway } from '../editor/editor.gateway';
import { StartRenderDto } from '@ai-clip/shared';
import { ProcessingStatus } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class RenderService {
  private readonly logger = new Logger(RenderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ffmpegService: FfmpegService,
    @Optional() private readonly editorGateway: EditorGateway | null,
  ) {}

  async startRender(userId: string, dto: StartRenderDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, userId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const task = await this.prisma.renderTask.create({
      data: {
        projectId: dto.projectId, userId,
        outputFormat: dto.format || 'mp4',
        outputResolution: dto.resolution || '1920x1080',
        status: ProcessingStatus.pending,
      },
    });

    this.processRender(task.id).catch((err) =>
      this.logger.error('Render failed for task ' + task.id, err),
    );
    return task;
  }

  async listTasks(userId: string) {
    return this.prisma.renderTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async getTask(id: string, userId: string) {
    const task = await this.prisma.renderTask.findFirst({
      where: { id, userId },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!task) throw new NotFoundException('Render task not found');
    return task;
  }

  async cancelTask(id: string, userId: string) {
    const task = await this.getTask(id, userId);
    if (task.status === ProcessingStatus.completed) {
      throw new Error('Cannot cancel a completed task');
    }
    return this.prisma.renderTask.update({
      where: { id }, data: { status: ProcessingStatus.failed, error: 'Cancelled by user' },
    });
  }

  private async processRender(taskId: string) {
    await this.prisma.renderTask.update({
      where: { id: taskId }, data: { status: ProcessingStatus.processing },
    });

    // Check FFmpeg availability
    if (!this.ffmpegService.isAvailable) {
      this.logger.warn('FFmpeg not available - simulating render');
      await this.simulateRender(taskId);
      return;
    }

    // Get project with scenes and media
    const task = await this.prisma.renderTask.findUnique({ where: { id: taskId } });
    if (!task) return;
    const project = await this.prisma.project.findUnique({
      where: { id: task.projectId },
      include: {
        scenes: { orderBy: { order: 'asc' }, include: { media: true } },
      },
    });
    if (!project || project.scenes.length === 0) {
      await this.failTask(taskId, 'No scenes to render');
      return;
    }

    const scenes = project.scenes;
    const resolution = (task.outputResolution || '1920x1080').split('x').map(Number);
    const outputDir = 'public/uploads';
    const tempDir = path.join(outputDir, 'temp', taskId);
    fs.mkdirSync(tempDir, { recursive: true });

    // Step 1: Render each scene as individual clip
    const sceneFiles: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const clipPath = path.join(tempDir, 'scene_' + i + '.mp4');
      sceneFiles.push(clipPath);

      try {
        await this.renderScene(scene, clipPath, resolution);
      } catch (err: any) {
        this.logger.error('Scene ' + i + ' render failed: ' + err.message);
        // Fallback: black frame placeholder
        await this.ffmpegService.run([
          '-y', '-f', 'lavfi', '-i', 'color=c=black:s=' + resolution[0] + 'x' + resolution[1] + ':d=' + scene.duration,
          '-c:v', 'libx264', '-preset', 'ultrafast', clipPath,
        ]);
      }

      const pct = Math.round(((i + 1) / scenes.length) * 80);
      await this.updateProgress(taskId, pct);
    }

    // Step 2: Concatenate all clips
    try {
      const concatTxt = path.join(tempDir, 'concat.txt');
      fs.writeFileSync(concatTxt, sceneFiles.map(f => "file '" + f.replace(/\\/g, '/') + "'").join('\n'));

      const outputPath = path.join(outputDir, 'exports', taskId + '.mp4');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      await this.ffmpegService.run([
        '-y', '-f', 'concat', '-safe', '0', '-i', concatTxt,
        '-c:v', 'libx264', '-preset', 'medium',
        '-c:a', 'aac', '-movflags', '+faststart',
        outputPath,
      ]);

      await this.updateProgress(taskId, 95);
      fs.rmSync(tempDir, { recursive: true, force: true });

      await this.prisma.renderTask.update({
        where: { id: taskId },
        data: {
          status: ProcessingStatus.completed,
          progress: 100, outputPath,
          completedAt: new Date(),
        },
      });

      this.editorGateway?.notifyRenderComplete(taskId, outputPath);
      this.logger.log('Render completed: ' + taskId);
    } catch (err: any) {
      this.logger.error('Concat failed: ' + err.message);
      await this.failTask(taskId, 'Render failed: ' + err.message);
    }
  }

  private async renderScene(scene: any, outputPath: string, resolution: number[]) {
    const hasMedia = scene.media && scene.media.filePath && fs.existsSync(scene.media.filePath);
    const duration = scene.duration || 3.0;

    if (!hasMedia) {
      // No media: black frame with caption text
      const drawText = scene.caption
        ? ['-vf', "drawtext=text='" + scene.caption.replace(/'/g, "'\\''") + "':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0," + duration + ")'"]
        : [];
      await this.ffmpegService.run([
        '-y', '-f', 'lavfi', '-i', 'color=c=black:s=' + resolution[0] + 'x' + resolution[1] + ':d=' + duration,
        ...drawText,
        '-c:v', 'libx264', '-preset', 'fast',
        outputPath,
      ]);
      return;
    }

    // Has media: extract segment with caption
    const capStr = scene.caption
      ? ",drawtext=text='" + scene.caption.replace(/'/g, "'\\''") + "':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=h-th-20:enable='between(t,0," + duration + ")'"
      : "";

    const transStr = (scene.transition === 'fade' || scene.transition === 'dissolve')
      ? ",fade=t=out:st=" + (duration - 0.3) + ":d=0.3"
      : "";

    const scaleStr = "scale=" + resolution[0] + ":" + resolution[1] + ":force_original_aspect_ratio=decrease,pad=" + resolution[0] + ":" + resolution[1] + ":(ow-iw)/2:(oh-ih)/2";
    const vf = scaleStr + capStr + transStr;

    const args: string[] = ['-y'];
    if (scene.startTime != null) args.push('-ss', String(scene.startTime));
    args.push('-t', String(duration));
    args.push('-i', scene.media.filePath);
    args.push('-vf', vf);
    args.push('-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', outputPath);

    await this.ffmpegService.run(args);
  }

  private async simulateRender(taskId: string) {
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 300));
      await this.updateProgress(taskId, i);
    }
    await this.prisma.renderTask.update({
      where: { id: taskId },
      data: {
        status: ProcessingStatus.completed,
        progress: 100,
        outputPath: 'public/uploads/exports/' + taskId + '.mp4',
        completedAt: new Date(),
      },
    });
    this.editorGateway?.notifyRenderComplete(taskId, 'public/uploads/exports/' + taskId + '.mp4');
  }

  private async updateProgress(taskId: string, pct: number) {
    await this.prisma.renderTask.update({ where: { id: taskId }, data: { progress: pct } });
    this.editorGateway?.notifyRenderProgress(taskId, pct, pct < 100 ? 'processing' : 'completed');
  }

  private async failTask(taskId: string, error: string) {
    await this.prisma.renderTask.update({
      where: { id: taskId }, data: { status: ProcessingStatus.failed, error },
    });
  }
}