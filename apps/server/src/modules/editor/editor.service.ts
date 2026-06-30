import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { UpdateSceneDto } from "@ai-clip/shared";

@Injectable()
export class EditorService {
  private readonly logger = new Logger(EditorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async updateScene(projectId: string, sceneId: string, userId: string, dto: UpdateSceneDto) {
    await this.verifyOwnership(projectId, userId);
    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, projectId },
    });
    if (!scene) throw new NotFoundException("Scene not found");
    return this.prisma.scene.update({
      where: { id: sceneId },
      data: dto as any,
      include: { media: { select: { id: true, thumbnailPath: true, filename: true } } },
    });
  }

  async reorderScenes(projectId: string, userId: string, sceneIds: string[]) {
    await this.verifyOwnership(projectId, userId);
    const updates = sceneIds.map((id, index) =>
      this.prisma.scene.update({ where: { id }, data: { order: index } }),
    );
    await this.prisma.$transaction(updates);
    return this.prisma.scene.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });
  }

  async suggestAlternative(projectId: string, sceneId: string, userId: string) {
    await this.verifyOwnership(projectId, userId);
    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, projectId },
    });
    if (!scene) throw new NotFoundException("Scene not found");
    const alternatives = await this.prisma.media.findMany({
      where: { userId, status: "completed", id: { not: scene.mediaId || undefined } },
      include: { tags: true, analysis: true },
      take: 5,
    });
    return alternatives;
  }

  async applyAiEdit(projectId: string, userId: string, instruction: string, sceneIds?: string[]) {
    await this.verifyOwnership(projectId, userId);
    this.logger.log("AI edit: " + instruction + " for project " + projectId);
    return { message: "AI edit instruction received", instruction };
  }

  private async verifyOwnership(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }
}