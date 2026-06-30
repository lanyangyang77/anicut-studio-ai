import { Module } from '@nestjs/common';
import { EditorController } from './editor.controller';
import { EditorService } from './editor.service';
import { EditorGateway } from './editor.gateway';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [EditorController],
  providers: [EditorService, EditorGateway],
  exports: [EditorService],
})
export class EditorModule {}