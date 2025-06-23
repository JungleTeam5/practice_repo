// src/app.module.ts

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express'; // 임포트는 유지
import { VideosModule } from './videos/videos.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // 여기서 .register() 설정을 제거하여 충돌 가능성을 없앱니다.
    MulterModule,
    VideosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
