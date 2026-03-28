import { Module } from '@nestjs/common';
import { RabbitmqDirectExchangeProducerService } from './rabbitmqDirectExchangeProducer.service';

@Module({
  providers: [RabbitmqDirectExchangeProducerService]
})
export class RabbitmqDirectExchangeModule {}
