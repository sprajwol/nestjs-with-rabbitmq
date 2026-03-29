import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AmqpConnectionManager } from 'amqp-connection-manager';
import { Channel, ConfirmChannel } from 'amqplib';
import { RabbitmqBaseProducer } from 'src/common/integrations/rabbitmq/rabbitmq-baseProducer';
import { RABBITMQ_CONNECTION } from 'src/common/integrations/rabbitmq/rabbitmq.constants';

@Injectable()
export class DirectExchangeProducerService extends RabbitmqBaseProducer {
  protected readonly logger = new Logger(DirectExchangeProducerService.name);

  private readonly rabbitmqDirectExchangeName: string; // RabbitMQ rabbitmqDirectExchangeName
  private readonly rabbitmqDirectExchangeQueueName: string; // RabbitMQ rabbitmqDirectExchangeQueueName
  private readonly rabbitmqDirectRoutingKey: string; // RabbitMQ rabbitmqDirectRoutingKey

  constructor(
    @Inject(RABBITMQ_CONNECTION) connection: AmqpConnectionManager,
    private readonly configService: ConfigService,
  ) {
    super(connection);

    this.rabbitmqDirectExchangeName = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_NAME');
    this.rabbitmqDirectExchangeQueueName = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_QUEUE_NAME');
    this.rabbitmqDirectRoutingKey = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_ROUTING_KEY');
  }

  protected async setupChannel(channel: ConfirmChannel): Promise<void> {
    await channel.assertExchange(this.rabbitmqDirectExchangeName, 'direct', { durable: false });
    await channel.assertQueue(this.rabbitmqDirectExchangeQueueName, { durable: false });
    await channel.bindQueue( this.rabbitmqDirectExchangeQueueName, this.rabbitmqDirectExchangeName, this.rabbitmqDirectRoutingKey);

    this.logger.log(
      `
        Channel Setup Completed:
        Exchange '${this.rabbitmqDirectExchangeName}',
        Type: 'direct'',
        Queue: '${this.rabbitmqDirectExchangeQueueName}',
        RoutingKey: '${this.rabbitmqDirectRoutingKey}',
      `,
    );
  }
}
