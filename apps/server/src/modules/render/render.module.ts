import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';
import { EditorModule } from '../editor/editor.module';

@Module({
  imports: [EditorModule, AiModule],
  controllers: [RenderController],
  providers: [RenderService],
  exports: [RenderService],
})
export class RenderModule {}