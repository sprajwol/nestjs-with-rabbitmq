import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqDirectExchangeModule } from './modules/rabbitmqDirectExchange/rabbitmqDirectExchange.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitmqDirectExchangeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
