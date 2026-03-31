import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const appPort = configService.get<number>('APP_PORT') || 3000;

  //enable cors
  app.enableCors();

  configureSwagger(app);

  await app.listen(appPort);
  logger.log(`Application started at port: ${appPort}`);
}

bootstrap();

function configureSwagger(app: INestApplication): void {
  const config = new  DocumentBuilder()
    .setTitle('NestJS with RabbitMQ')
    .setDescription('A NestJS application to demonstrate usage of RabbbitMQ in various ways.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app,  document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      opeationsSorter: 'alpha',
      docExpansion: 'none',
      defaultModelsExpandDepth: 5,
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    }
  })
}
