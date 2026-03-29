import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqModule } from './common/integrations/rabbitmq/rabbitmq.module';
import { DirectExchangeModule } from './modules/directExchange/directExchange.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitmqModule,
    DirectExchangeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
