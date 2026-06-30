import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from '@ai-clip/shared';
import { FfmpegService } from '../ai/ffmpeg.service';
import { AiService } from '../ai/ai.service';

const BUILT_IN_TEMPLATES = [
  { name: 'intro-body-climax-outro', description: 'Standard commentary structure: intro, body, climax, outro', isBuiltIn: true },
  { name: 'fast-paced-commentary', description: 'Quick cuts with high energy, ideal for action commentary', isBuiltIn: true },
  { name: 'cinematic-slow', description: 'Slow, atmospheric pacing for emotional or story-driven content', isBuiltIn: true },
  { name: 'beat-sync-montage', description: 'Synchronized to music beats, great for highlight reels', isBuiltIn: true },
];

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ffmpegService: FfmpegService,
    private readonly aiService: AiService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.template.findMany({
      where: {
        OR: [{ isBuiltIn: true }, { userId }],
      },
      include: { analysis: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBuiltIn() {
    // Ensure built-in templates exist
    for (const tpl of BUILT_IN_TEMPLATES) {
      await this.prisma.template.upsert({
        where: { id: tpl.name },
        update: {},
        create: {
          id: tpl.name,
          name: tpl.name,
          description: tpl.description,
          isBuiltIn: true,
        },
      });
    }

    return this.prisma.template.findMany({
      where: { isBuiltIn: true },
      include: { analysis: true },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { analysis: true },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async create(userId: string, dto: CreateTemplateDto) {
    const template = await this.prisma.template.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
      },
    });

    if (dto.referenceVideoId) {
      // Queue analysis
      this.analyze(template.id).catch((err) =>
        this.logger.error('Template analysis failed: ' + template.id, err),
      );
    }

    return template;
  }

  async analyze(id: string) {
    const template = await this.findOne(id);

    if (!this.ffmpegService.isAvailable) {
      this.logger.warn('FFmpeg not available, returning placeholder analysis');
      return this.createPlaceholderAnalysis(id, template);
    }

    try {
      // Find the reference video via media library
      const media = await this.prisma.media.findFirst({
        where: { id: template.id, status: 'completed' },
      });

      const videoPath = media?.filePath;
      if (!videoPath || !require('fs').existsSync(videoPath)) {
        this.logger.warn('Reference video not found for template: ' + id);
        return this.createPlaceholderAnalysis(id, template);
      }

      // Step 1: Detect shots via FFmpeg
      const shots = await this.ffmpegService.detectShots(videoPath, 0.3);

      if (shots.length === 0) {
        this.logger.warn('No shots detected in reference video');
        return this.createPlaceholderAnalysis(id, template);
      }

      // Step 2: Calculate shot statistics
      const durations = shots.map(s => s.end - s.start);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const transitionTypes: Record<string, number> = {};
      for (const s of shots) {
        transitionTypes[s.type] = (transitionTypes[s.type] || 0) + 1;
      }
      const totalDuration = shots[shots.length - 1].end;

      // Step 3: AI analysis of editing style
      const styleResult = await this.aiService.analyzeTemplateStyle({
        totalDuration,
        shotCount: shots.length,
        averageShotDuration: avgDuration,
        shotDurationDistribution: durations.slice(0, 20),
        transitionTypes,
      });

      // Step 4: Save analysis to database
      const analysis = await this.prisma.templateAnalysis.upsert({
        where: { templateId: id },
        update: {
          averageShotDuration: avgDuration,
          shotDurationDistribution: durations.slice(0, 50),
          transitionCounts: transitionTypes as any,
          commonTransitions: Object.keys(transitionTypes),
          pacingScore: styleResult.pacingScore,
          styleTags: styleResult.styleTags,
        },
        create: {
          templateId: id,
          averageShotDuration: avgDuration,
          shotDurationDistribution: durations.slice(0, 50),
          transitionCounts: transitionTypes as any,
          commonTransitions: Object.keys(transitionTypes),
          beatSyncPattern: [],
          pacingScore: styleResult.pacingScore,
          styleTags: styleResult.styleTags,
        },
      });

      this.logger.log('Template analysis completed: ' + shots.length + ' shots, pacing ' + styleResult.pacingScore);
      return { template, analysis };
    } catch (error) {
      this.logger.error('Template analysis failed: ' + id, (error).stack);
      return this.createPlaceholderAnalysis(id, template);
    }
  }

  private async createPlaceholderAnalysis(templateId: string, template: any) {
    const analysis = await this.prisma.templateAnalysis.upsert({
      where: { templateId },
      update: {},
      create: {
        templateId,
        averageShotDuration: 3.0,
        shotDurationDistribution: [],
        transitionCounts: { cut: 0 } as any,
        commonTransitions: ['cut'],
        beatSyncPattern: [],
        pacingScore: 5.0,
        styleTags: ['unknown'],
      },
    });
    return { template, analysis };
  }
}