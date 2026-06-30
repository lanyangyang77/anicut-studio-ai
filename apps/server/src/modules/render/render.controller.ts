import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RenderService } from './render.service';
import { StartRenderDto } from '@ai-clip/shared';

@ApiTags('Render')
@UseGuards(JwtAuthGuard)
@Controller('render')
export class RenderController {
  constructor(private readonly renderService: RenderService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start rendering a project' })
  async startRender(@CurrentUser('id') userId: string, @Body() dto: StartRenderDto) {
    return this.renderService.startRender(userId, dto);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List user render tasks' })
  async listTasks(@CurrentUser('id') userId: string) {
    return this.renderService.listTasks(userId);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get render task status' })
  async getTask(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.renderService.getTask(id, userId);
  }

  @Post('tasks/:id/cancel')
  @ApiOperation({ summary: 'Cancel a render task' })
  async cancelTask(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.renderService.cancelTask(id, userId);
  }
}