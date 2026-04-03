import { Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  type AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import { Channel, ConfirmChannel, Options } from 'amqplib';
import { RABBITMQ_CONNECTION } from './rabbitmq.constants';

export abstract class RabbitmqBaseProducer implements OnModuleInit, OnModuleDestroy {
  protected channelWrapper: ChannelWrapper;
  // Each child class must provide its own logger instance with the correct context name.
  protected readonly abstract logger: Logger;

  constructor(
    @Inject(RABBITMQ_CONNECTION) protected readonly connection: AmqpConnectionManager,
  ) {}

  async onModuleInit() {
    await this.initConnection();
  }

  async onModuleDestroy() {
    try {
      if (this.channelWrapper) {
        await this.channelWrapper.close();
        this.logger.log(`Channel closed sucessfully.`);
      }
    } catch (error) {
      this.logger.warn(`Error during closing channel: ${error}`);
    }
  }

  async initConnection() {
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await this.setupChannel(channel);
      },
    });

    this.channelWrapper.on('error', (error) => {
      this.logger.error(`Channel error. ${error}`);
    });

    this.channelWrapper.on('close', () => {
      this.logger.warn(`Channel closed.`);
    });

    this.channelWrapper.on('return', (msg) => {
      this.logger.warn(`Message Returned (Unroutable): ${JSON.stringify(msg)}`);
    });

    this.channelWrapper.on('drain', () => {
      this.logger.warn(
        `Channel drained. Backpressure relieved, can resume sending messages.`,
      );
    });
  }

  // Child classes must implement the setupChannel method to create and configure the channel as needed (E.g. asserting exchanges, queues, bindings, etc.)
  // 'abstract' keyword forces the child class to implement this method, ensuring that the necessary channel is properly setup up for each child instance producer to properly function.
  protected abstract setupChannel(channel: ConfirmChannel): Promise<void>;

  protected async publishToQueue<T>(message: T, messageId: string, exchangeName: string, routingKey: string) {
    if (!this.connection.isConnected()) {
      this.logger.error(`Cannot publish message. RabbitMQ is  not connected.`);

      throw new Error(`RabbitMQ connection is not established.`);
    }

    const timestamp = Date.now();
    try {
      // const buffer = Buffer.from(JSON.stringify(message));

      //  `persistent: true` makes the message persistent(saved to disk) if true or non-persistent(stored to memory) if false.
      //  Persistent messages survive broker(rabbitmq) restarts.
      //  Needs 'exchange' and 'queue' also to be durable to ensure message persistence.

      //  `mandatory: true` ensures that if a message cannot be routed to any queue (e.g. incorrect routing key), the message will be returned to the producer instead of being silently dropped.
      //  This allows the producer to handle unroutable messages as needed (e.g. logging, retryiing, etc.) and prevent message loss due to misconfigurtation or other issues.
      const publishOptions: Options.Publish = {
        messageId: messageId,
        timestamp: timestamp,
        persistent: true,
        mandatory: true,
        contentType: 'application/json',
      };

      await this.channelWrapper.publish(
        exchangeName,
        routingKey,
        message,
        publishOptions,
      );

      this.logger.log(`Message with ID '${messageId}' has been published to exchange '${exchangeName}' with routing key '${routingKey}'.`);
    } catch (error) {
      this.logger.error(`Failed to publish message with ID ${messageId}: ${error}`);

      throw error;
    }
  }
}
