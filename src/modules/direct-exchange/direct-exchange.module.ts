import { Module } from '@nestjs/common';
import { DirectExchangeConsumerService } from './direct-exchange.consumer.service';
import { DirectExchangeController } from './direct-exchange.controller';
import { DirectExchangeProducerService } from './direct-exchange.producer.service';
import { DirectExchangeService } from './direct-exchange.service';

@Module({
  providers: [DirectExchangeService, DirectExchangeProducerService, DirectExchangeConsumerService],
  controllers: [DirectExchangeController]
})
export class DirectExchangeModule {}
