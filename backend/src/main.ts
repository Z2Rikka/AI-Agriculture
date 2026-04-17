// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局 DTO 验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,     // 自动类型转换（string → number）
      whitelist: true,    // 剔除未声明的字段
      forbidNonWhitelisted: true,
    }),
  );

  // 全局前缀
  app.setGlobalPrefix('api/v1');

  // CORS（前端开发时允许跨域）
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: 'GET,POST,PUT,DELETE,PATCH',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // Swagger API 文档
  const config = new DocumentBuilder()
    .setTitle('智能农业灌溉系统 API')
    .setDescription('基于 NestJS + Prisma + MQTT 的多租户 IoT 灌溉控制后端')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'apiKey', in: 'header', name: 'Authorization', description: 'Bearer <API_KEY>' },
      'API_KEY',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🌱 Irrigation API running on http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
