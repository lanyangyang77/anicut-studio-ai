import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { MediaModule } from './modules/media/media.module';
import { ProjectModule } from './modules/project/project.module';
import { EditorModule } from './modules/editor/editor.module';
import { TemplateModule } from './modules/template/template.module';
import { RenderModule } from './modules/render/render.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MediaModule,
    ProjectModule,
    EditorModule,
    TemplateModule,
    RenderModule,
    AiModule,
  ],
})
export class AppModule {}