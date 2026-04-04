import { Module } from '@nestjs/common';

import { DirectExchangeConsumerService } from '#src/modules/direct-exchange/direct-exchange.consumer.service';
import { DirectExchangeController } from '#src/modules/direct-exchange/direct-exchange.controller';
import { DirectExchangeProducerService } from '#src/modules/direct-exchange/direct-exchange.producer.service';
import { DirectExchangeService } from '#src/modules/direct-exchange/direct-exchange.service';

@Module({
  providers: [DirectExchangeService, DirectExchangeProducerService, DirectExchangeConsumerService],
  controllers: [DirectExchangeController],
})
export class DirectExchangeModule {}
