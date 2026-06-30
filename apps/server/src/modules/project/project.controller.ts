import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from '@ai-clip/shared';

@ApiTags('Projects')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new clip project' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user projects' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.projectService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectService.remove(id, userId);
  }

  @Post(':id/generate')
  @ApiOperation({ summary: 'AI auto-generate timeline from script' })
  async generateTimeline(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectService.generateTimeline(id, userId);
  }
}