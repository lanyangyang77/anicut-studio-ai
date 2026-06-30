import {
  Controller,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EditorService } from './editor.service';
import { UpdateSceneDto, ReorderScenesDto, AiEditInstructionDto } from '@ai-clip/shared';

@ApiTags('Editor')
@UseGuards(JwtAuthGuard)
@Controller('editor')
export class EditorController {
  constructor(private readonly editorService: EditorService) {}

  @Patch('projects/:projectId/scenes/:sceneId')
  @ApiOperation({ summary: 'Update a scene in the timeline' })
  async updateScene(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSceneDto,
  ) {
    return this.editorService.updateScene(projectId, sceneId, userId, dto);
  }

  @Post('projects/:projectId/scenes/reorder')
  @ApiOperation({ summary: 'Reorder scenes in timeline' })
  async reorderScenes(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReorderScenesDto,
  ) {
    return this.editorService.reorderScenes(projectId, userId, dto.sceneIds);
  }

  @Post('projects/:projectId/replace-scene/:sceneId')
  @ApiOperation({ summary: 'AI suggest an alternative clip for a scene' })
  async replaceScene(
    @Param('projectId') projectId: string,
    @Param('sceneId') sceneId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.editorService.suggestAlternative(projectId, sceneId, userId);
  }

  @Post('projects/:projectId/ai-edit')
  @ApiOperation({ summary: 'Apply AI edit instruction' })
  async aiEdit(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AiEditInstructionDto,
  ) {
    return this.editorService.applyAiEdit(projectId, userId, dto.instruction, dto.sceneIds);
  }
}