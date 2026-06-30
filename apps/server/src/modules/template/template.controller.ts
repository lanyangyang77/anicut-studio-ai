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
import { TemplateService } from './template.service';
import { CreateTemplateDto } from '@ai-clip/shared';

@ApiTags('Templates')
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List available templates' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.templateService.findAll(userId);
  }

  @Get('built-in')
  @ApiOperation({ summary: 'List built-in system templates' })
  async findBuiltIn() {
    return this.templateService.findBuiltIn();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get template details' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create template from reference video' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templateService.create(userId, dto);
  }

  @Post(':id/analyze')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Analyze reference video for template' })
  async analyze(@Param('id') id: string) {
    return this.templateService.analyze(id);
  }
}