import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type AmqpConnectionManager } from 'amqp-connection-manager';
import { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { RabbitmqBaseConsumer } from '#src/common/integrations/rabbitmq/rabbitmq.base-consumer';
import { RABBITMQ_CONNECTION } from '#src/common/integrations/rabbitmq/rabbitmq.constants';
import { QueuePayloadDto } from '#src/modules/direct-exchange/dtos/queue-payload.dto';

@Injectable()
export class DirectExchangeConsumerService extends RabbitmqBaseConsumer {
  protected readonly logger = new Logger(this.constructor.name);

  private readonly main_exchange: string; // RabbitMQ rabbitmqDirectExchangeName
  private readonly main_queue: string; // RabbitMQ rabbitmqDirectExchangeQueueName
  private readonly main_routing_key: string; // RabbitMQ rabbitmqDirectRoutingKey

  private readonly retry_queue: string; // RabbitMQ retry queue name
  private readonly retry_routing_key: string; // RabbitMQ retry routing key

  private readonly parking_queue: string; // RabbitMQ parking queue name
  private readonly parking_routing_key: string; // RabbitMQ parking routing key

  constructor(
    @Inject(RABBITMQ_CONNECTION) connection: AmqpConnectionManager,
    private readonly configService: ConfigService,
  ) {
    super(connection);

    this.main_exchange = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_NAME');

    this.main_queue = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_QUEUE_NAME');
    this.main_routing_key = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_ROUTING_KEY');

    this.retry_queue = `${this.main_queue}_retry`;
    this.retry_routing_key = `${this.main_routing_key}_retry`;

    this.parking_queue = `${this.main_queue}_parking`;
    this.parking_routing_key = `${this.main_routing_key}_retry`;
  }

  protected async setupChannel(channel: ConfirmChannel): Promise<void> {
    try {
      // Dead Letter Exchange(DLX) and Dead Letter Queue(DLQ) setup for handling failed messages in separate queue.

      await channel.assertExchange(this.main_exchange, 'direct', { durable: true });

      await channel.assertQueue(this.main_queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': this.main_exchange,
          'x-dead-letter-routing-key': this.retry_routing_key,
        },
      });

      await channel.assertQueue(this.retry_queue, {
        durable: true,
        arguments: {
          'x-message-ttl': 10000,
          'x-dead-letter-exchange': this.main_exchange,
          'x-dead-letter-routing-key': this.main_routing_key,
        },
      });

      await channel.assertQueue(this.parking_queue, {
        durable: true,
      });

      await channel.bindQueue(this.main_queue, this.main_exchange, this.main_routing_key);
      await channel.bindQueue(this.retry_queue, this.main_exchange, `${this.retry_routing_key}`);
      await channel.bindQueue(this.parking_queue, this.main_exchange, `${this.parking_routing_key}`);

      await channel.prefetch(1);

      await this.consumeFromQueue<QueuePayloadDto>(
        channel,
        this.rabbitmqDirectExchangeQueueName,
        (msgContent, msg) => this.handleProcessingLogic(msgContent, msg),
      );

      this.logger.log(
        `
          Consumer Listening on Queue:
          Exchange '${this.rabbitmqDirectExchangeName}',
          Type: 'direct',
          Queue: '${this.rabbitmqDirectExchangeQueueName}',
          RoutingKey: '${this.rabbitmqDirectRoutingKey}',
        `,
      );
    } catch (error) {
      this.logger.error(`Error during channel setup: ${error}`);

      // Rethrow the error to prevent the producer from starting with an improperly configured channel.
      throw error;
    }
  }

  private async handleProcessingLogic(
    msgContent: QueuePayloadDto,
    msg: ConsumeMessage,
  ): Promise<void> {
    const realDto = plainToInstance(QueuePayloadDto, msgContent);
    await validateOrReject(realDto);

    try {
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      this.logger.error(
        `Error processing with ID: ${msgContent.id}, messageId: ${msg.properties.messageId}, Error: ${error}`,
      );
    }

    throw new Error(`Simulated processing error for messageId: ${msg.properties.messageId}`);
  }

  protected async handleExhaustedRetries<QueuePayloadDto>(
    msgContent: QueuePayloadDto,
    msg: ConsumeMessage,
    error: Error,
  ) {}
}
