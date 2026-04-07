import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RabbitmqModule } from '#src/common/integrations/rabbitmq/rabbitmq.module';
import { DirectExchangeModule } from '#src/modules/direct-exchange/direct-exchange.module';
import { TopicExchangeModule } from '#src/modules/topic-exchange/topic-exchange.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitmqModule,
    DirectExchangeModule,
    TopicExchangeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
