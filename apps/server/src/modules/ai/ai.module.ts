import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { FfmpegService } from './ffmpeg.service';

@Module({
  providers: [AiService, FfmpegService],
  exports: [AiService, FfmpegService],
})
export class AiModule {}
