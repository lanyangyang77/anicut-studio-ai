import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';

@ApiTags('Media')
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a media file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
          const typeDir = file.mimetype.startsWith('video') ? 'videos' : 'images';
          cb(null, join(uploadDir, typeDir));
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, uuid() + ext);
        },
      }),
      limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.mediaService.create(userId, file, type);
  }

  @Get()
  @ApiOperation({ summary: 'List user media library' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('tag') tag?: string,
  ) {
    return this.mediaService.findAll(userId, { type, tag });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media details' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.mediaService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update media metadata' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.mediaService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media' })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.mediaService.remove(id, userId);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Add tags to media' })
  async addTags(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { tags: Array<{ name: string; category: string }> },
  ) {
    return this.mediaService.addTags(id, userId, dto.tags);
  }
}