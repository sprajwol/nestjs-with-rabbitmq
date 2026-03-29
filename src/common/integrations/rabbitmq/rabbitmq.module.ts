import { Global, Module } from '@nestjs/common';
import { RabbitmqConnectionProvider } from './rabbbitmq-connection.provider';
import { RABBITMQ_CONNECTION } from './rabbitmq.constants';

@Global()
@Module({
  providers: [RabbitmqConnectionProvider],
  exports: [RABBITMQ_CONNECTION],
})
export class RabbitmqModule {}
