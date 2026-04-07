import { Module } from '@nestjs/common';
import { TopicExchangeService } from './topic-exchange.service';
import { TopicExchangeController } from './topic-exchange.controller';

@Module({
  providers: [TopicExchangeService],
  controllers: [TopicExchangeController]
})
export class TopicExchangeModule {}
