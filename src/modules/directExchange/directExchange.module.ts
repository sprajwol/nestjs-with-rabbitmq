import { Module } from '@nestjs/common';
import { DirectExchangeProducerService } from './directExchangeProducer.service';

@Module({
  providers: [DirectExchangeProducerService]
})
export class DirectExchangeModule {}
