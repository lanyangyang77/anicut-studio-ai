import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateProjectDto, UpdateProjectDto } from '@ai-clip/shared';
import { ClipStyle } from '@prisma/client';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        script: dto.script,
        clipStyle: dto.clipStyle as ClipStyle,
        targetDuration: dto.targetDuration,
        templateId: dto.templateId,
        templateMode: dto.templateMode,
      },
      include: { scenes: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        scenes: { orderBy: { order: 'asc' }, take: 1 },
        _count: { select: { scenes: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        scenes: {
          orderBy: { order: 'asc' },
          include: { media: { select: { id: true, thumbnailPath: true, filename: true, type: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    await this.findOne(id, userId);
    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: { scenes: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  async generateTimeline(id: string, userId: string) {
    const project = await this.findOne(id, userId);
    if (!project.script) {
      throw new NotFoundException('Project has no script to generate from');
    }

    // 1. Split script into segments
    const segments = project.script.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    if (segments.length === 0) throw new NotFoundException('Script is empty');

    // 2. Fetch completed media
    const mediaLib = await this.prisma.media.findMany({
      where: { userId, status: 'completed' },
      include: { tags: true, analysis: true },
    });

    // 3. Load template analysis if available
    let avgDur = 3.0;
    if (project.templateId) {
      const tpl = await this.prisma.template.findUnique({
        where: { id: project.templateId },
        include: { analysis: true },
      });
      if (tpl?.analysis) avgDur = tpl.analysis.averageShotDuration || 3.0;
    }

    // 4. Clear existing scenes
    await this.prisma.scene.deleteMany({ where: { projectId: id } });

    // 5. AI semantic matching
    const matches = await this.aiService.matchScriptToMedia(segments, mediaLib);
    const matchMap = new Map<number, { mediaId: string; score: number }>();
    for (const m of matches) matchMap.set(m.scriptIndex, m);

    // 6. Create scenes with matched media
    const createdScenes = [];
    for (let i = 0; i < segments.length; i++) {
      const match = matchMap.get(i);
      let dur = avgDur;
      if (!match || match.score < 0.3) dur = avgDur * 1.5;
      else if (match.score < 0.6) dur = avgDur * 1.2;

      // Adjust for clip style
      if (project.clipStyle === 'fast_paced') dur = Math.max(1.5, dur * 0.7);
      else if (project.clipStyle === 'slow') dur = dur * 1.3;
      else if (project.clipStyle === 'beat_sync') dur = Math.round(dur / 0.5) * 0.5;

      // Determine transition
      let trans = 'cut';
      if (i > 0) {
        if (project.clipStyle === 'slow') trans = i % 3 === 0 ? 'fade' : 'dissolve';
        else if (project.clipStyle === 'beat_sync') trans = 'cut';
      }

      const scene = await this.prisma.scene.create({
        data: {
          projectId: id,
          order: i,
          mediaId: match?.mediaId || null,
          duration: dur,
          sourceText: segments[i],
          caption: segments[i],
          // matchScore: match?.score || 0,
          transition: trans,
          transitionDuration: trans === 'cut' ? 0 : 0.3,
        } as any,
      });
      createdScenes.push(scene);
    }

    this.logger.log('Generated ' + createdScenes.length + ' scenes (' + matches.length + ' matched to media)');
    return this.findOne(id, userId);
  }
}