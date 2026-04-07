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

  private readonly dlq_queue: string; // RabbitMQ dlq queue name
  private readonly dlq_routing_key: string; // RabbitMQ dlq routing key

  constructor(
    @Inject(RABBITMQ_CONNECTION) connection: AmqpConnectionManager,
    private readonly configService: ConfigService,
  ) {
    super(connection);

    this.main_exchange = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_NAME');

    this.main_queue = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_QUEUE_NAME');
    this.main_routing_key = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_ROUTING_KEY');

    this.dlq_queue = `${this.main_queue}.dlq`;
    this.dlq_routing_key = `${this.main_routing_key}.dlq`;
  }

  protected async setupChannel(channel: ConfirmChannel): Promise<void> {
    try {
      // Dead Letter Exchange(DLX) and Dead Letter Queue(DLQ) setup for handling failed messages in separate queue.

      await channel.assertExchange(this.main_exchange, 'direct', { durable: true });

      await channel.assertQueue(this.main_queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': this.main_exchange,
          'x-dead-letter-routing-key': this.dlq_routing_key,
        },
      });

      // for sending the message back to mainQueue after certain time
      // arguments: {
      //   'x-message-ttl': 10000,
      //   'x-dead-letter-exchange': this.main_exchange,
      //   'x-dead-letter-routing-key': this.main_routing_key,
      // },
      await channel.assertQueue(this.dlq_queue, { durable: true });

      await channel.bindQueue(this.main_queue, this.main_exchange, this.main_routing_key);
      await channel.bindQueue(this.dlq_queue, this.main_exchange, `${this.dlq_routing_key}`);

      await channel.prefetch(1);

      await this.consumeFromQueue<QueuePayloadDto>(
        channel,
        this.main_queue,
        (msgContent, msg) => this.handleProcessingLogic(msgContent, msg),
      );

      this.logger.log(
        `
          Consumer Listening on Queue:
          Exchange '${this.main_exchange}',
          Type: 'direct',
          Queue: '${this.main_queue}',
          RoutingKey: '${this.main_routing_key}',
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
      await new Promise((resolve) => setTimeout(resolve, 10000));
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
