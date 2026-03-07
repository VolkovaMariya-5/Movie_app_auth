import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Task Management API')
    .setDescription('API для работы с досками, задачами и пользователями')
    .setVersion('1.0')
    .addTag('Boards', 'Эндпоинты для работы с досками')
    .addTag('Tasks', 'Эндпоинты для работы с задачами')
    .addTag('Users', 'Эндпоинты для работы с пользователями')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
