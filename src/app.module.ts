import { Module } from '@nestjs/common';
import { RabbitmqDirectExchangeModule } from './modules/rabbitmqDirectExchange/rabbitmqDirectExchange.module';

@Module({
  imports: [RabbitmqDirectExchangeModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
