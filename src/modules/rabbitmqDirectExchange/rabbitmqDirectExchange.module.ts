import { Module } from '@nestjs/common';
import { RabbitmqDirectExchangeService } from './rabbitmqDirectExchange.service';

@Module({
  providers: [RabbitmqDirectExchangeService]
})
export class RabbitmqDirectExchangeModule {}
