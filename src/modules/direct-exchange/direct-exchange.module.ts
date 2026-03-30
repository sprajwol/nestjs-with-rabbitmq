import { Module } from '@nestjs/common';
import { DirectExchangeProducerService } from './direct-exchange.producer.service';
import { DirectExchangeController } from './direct-exchange.controller';
import { DirectExchangeService } from './direct-exchange.service';

@Module({
  providers: [DirectExchangeProducerService, DirectExchangeService],
  controllers: [DirectExchangeController]
})
export class DirectExchangeModule {}
