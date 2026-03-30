import { Module } from '@nestjs/common';
import { DirectExchangeProducerService } from './direct-exchange.producer.service';

@Module({
  providers: [DirectExchangeProducerService]
})
export class DirectExchangeModule {}
