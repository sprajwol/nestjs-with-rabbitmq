import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type AmqpConnectionManager } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';

import { RabbitmqBaseProducer } from '#src/common/integrations/rabbitmq/rabbitmq.base-producer';
import { RABBITMQ_CONNECTION } from '#src/common/integrations/rabbitmq/rabbitmq.constants';
import { QueuePayloadDto } from '#src/modules/topic-exchange/dtos/queue-payload.dto';

@Injectable()
export class TopicExchangeProducerService extends RabbitmqBaseProducer {
  protected readonly logger = new Logger(this.constructor.name);

  private readonly exchange: string; // RabbitMQ rabbitmqTopicExchangeName
  // private readonly routing_key: string; // RabbitMQ rabbitmqTopicExchangeName

  constructor(
    @Inject(RABBITMQ_CONNECTION) connection: AmqpConnectionManager,
    private readonly configService: ConfigService,
  ) {
    super(connection);

    this.exchange = this.configService.getOrThrow<string>('RABBITMQ_TOPIC_EXCHANGE_NAME');
    this.exchange = this.configService.getOrThrow<string>('RABBITMQ_TOPIC_EXCHANGE_NAME');
  }

  protected async setupChannel(channel: ConfirmChannel): Promise<void> {
    try {
      await channel.assertExchange(this.exchange, 'topic', { durable: true });
    } catch (error) {
      this.logger.error(`Error during channel setup: ${error}`);

      // Rethrow the error to prevent the producer from starting with an improperly configured channel.
      throw error;
    }
  }

  async processMessage(message: QueuePayloadDto, messageId: string, routing_key: string) {
    return await this.publishToQueue<QueuePayloadDto>(message, messageId, this.exchange, routing_key);
  }
}
