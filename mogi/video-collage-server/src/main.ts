// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 👇 옵션을 포함하여 CORS 설정 (이 방법을 권장합니다)
  app.enableCors({
    origin: 'http://localhost:3001', // React 앱의 출처를 명시합니다.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // 쿠키나 인증 헤더 등을 주고받을 때 필요합니다.
  });

  await app.listen(3000);
}
bootstrap();
