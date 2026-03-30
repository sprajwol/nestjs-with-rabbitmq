import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type AmqpConnectionManager } from 'amqp-connection-manager';
import { Channel, ConfirmChannel, Options } from 'amqplib';
import { RabbitmqBaseProducer } from 'src/common/integrations/rabbitmq/rabbitmq-baseProducer';
import { RABBITMQ_CONNECTION } from 'src/common/integrations/rabbitmq/rabbitmq.constants';
import {v4 as uuidv4 } from 'uuid';

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
    try {
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
    } catch (error) {
      this.logger.error(`Error during channel setup: ${error}`);

      // Rethrow the error to prevent the producer from starting with an improperly configured channel.
      throw error;
    }
  }

  async publishToQueue(message: any, messageId: string) {
    if (!this.connection.isConnected()) {
      this.logger.error(`Cannot publish message. RabbitMQ is  not connected.`);

      throw new Error(`RabbitMQ connection is not established.`);
    }

    const timestamp = Date.now();
    try {
      const buffer = Buffer.from(JSON.stringify(message));
      //  `persistent: true` makes the message persistent(saved to disk) if true or non-persistent(stored to memory) if false.
      //  Persistent messages survive broker(rabbitmq) restarts.
      //  Needs 'exchange' and 'queue' also to be durable to ensure message persistence.

      //  `mandatory: true` ensures that if a message cannot be routed to any queue (e.g. incorrect routing key), the message will be returned to the producer instead of being silently dropped.
      //  This allows the producer to handle unroutable messages as needed (e.g. logging, retryiing, etc.) and prevent message loss due to misconfigurtation or other issues.
      const publishOptions: Options.Publish = {
        messageId: messageId,
        timestamp: timestamp,
        persistent: true,
        mandatory: true
      };
      
      await this.channelWrapper.publish(
        this.rabbitmqDirectExchangeName,
        this.rabbitmqDirectRoutingKey,
        buffer,
        publishOptions,
      );
    } catch (error) {
      this.logger.error(`Failed to publish message with ID ${messageId}: ${error}`);

      throw error;
    }
  }
}
