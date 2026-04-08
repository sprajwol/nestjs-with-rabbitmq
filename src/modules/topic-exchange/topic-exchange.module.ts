import { Module } from '@nestjs/common';

import { TopicExchangeConsumerService } from '#src/modules/topic-exchange/topic-exchange.consumer.service';
import { TopicExchangeController } from '#src/modules/topic-exchange/topic-exchange.controller';
import { TopicExchangeProducerService } from '#src/modules/topic-exchange/topic-exchange.producer.service';
import { TopicExchangeService } from '#src/modules/topic-exchange/topic-exchange.service';

@Module({
  providers: [TopicExchangeService, TopicExchangeProducerService, TopicExchangeConsumerService],
  controllers: [TopicExchangeController]
})
export class TopicExchangeModule {}
