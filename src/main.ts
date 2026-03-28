import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const appPort = configService.get<number>('APP_PORT') || 3000;

  //enable cors
  app.enableCors();

  await app.listen(appPort);
  logger.log(`Application started at port: ${appPort}`);
}

bootstrap();
