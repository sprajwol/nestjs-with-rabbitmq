import { Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  type AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import { Channel, ConfirmChannel } from 'amqplib';
import { RABBITMQ_CONNECTION } from './rabbitmq.constants';

export abstract class RabbitmqBaseProducer implements OnModuleInit, OnModuleDestroy {
  protected channelWrapper: ChannelWrapper;
  // Each child class must provide its own logger instance with the correct context name.
  protected readonly logger: Logger;

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
}
