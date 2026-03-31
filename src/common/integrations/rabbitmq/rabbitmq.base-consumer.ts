import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import {
  type AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RABBITMQ_CONNECTION } from './rabbitmq.constants';

export abstract class RabbitmqBaseConsumer implements OnModuleInit {
  protected channelWrapper: ChannelWrapper;
  // Each child class must provide its own logger instance with the correct context name.
  protected readonly logger: Logger;

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    protected readonly connection: AmqpConnectionManager,
  ) {}

  async onModuleInit() {
    await this.initConnection();
  }

  async onModuleDestroy() {
    try {
      if (this.channelWrapper) {
        await this.channelWrapper.close();
        this.logger.log(`Consumer Channel closed sucessfully.`);
      }
    } catch (error) {
      this.logger.warn(`Error during closing consumer channel: ${error}`);
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
      this.logger.error(`Consumer Channel error. ${error}`);
    });

    this.channelWrapper.on('close', () => {
      this.logger.warn(`Consumer Channel closed.`);
    });

    this.channelWrapper.on('connect', () => {
      this.logger.warn(`Consumer Channel is connected and active.`);
    });
  }

  // Child classes must implement the setupChannel method to create and configure the channel as needed (E.g. asserting exchanges, queues, bindings, prefetch, consume etc.)
  // 'abstract' keyword forces the child class to implement this method, ensuring that the necessary channel is properly setup up for each child instance producer to properly function.
  protected abstract setupChannel(channel: ConfirmChannel): Promise<void>;

  protected async consume<T>(
    msg: ConsumeMessage | null,
    channel: ConfirmChannel,
    onMessage: (data: T, raw: ConsumeMessage) => Promise<void>
  ): Promise<void> {
    if (!msg) return;

    const { messageId, timestamp } = msg.properties;
    const  currentTimestamp = Date.now();

    try {
      this.logger.log(`Received message with ID: ${messageId}, Timestamp: ${timestamp}, Current Timestamp: ${currentTimestamp}, Delay: ${currentTimestamp - timestamp}ms.`);

      const content = JSON.parse(msg.content.toString()) as T;

      // Excecuting the actual message handler function that handles the logic for processing the message from the queue passed in as a parameter from the child consumer class.
      await onMessage(content, msg);

      channel.ack(msg);

      this.logger.log(`Message with ID: ${messageId} acknowledged successfully.`);
    } catch (error) {
      this.logger.error(`Mesage Consuming Failed: ${messageId}. Error: ${error}`);

      channel.nack(msg, false, true);
    }
  }

  protected async consumeFromQueue<T>(
    channel: ConfirmChannel,
    queueName: string,
    onMessage: (data: T, raw: ConsumeMessage) => Promise<void>,
  ) {
    return await channel.consume(
      queueName,
      (msg) => {
        this.consume(msg, channel, onMessage);
      },
      {
        onCancel: (msg) => {
          this.handleConsumerCancel(msg.consumerTag);
        },
      },
    );
  }

  protected handleConsumerCancel(consumerTag: string) {
    this.logger.error(
      `Consumer  '${consumerTag}' was cancelled by the  broker.`,
    );

    setTimeout(() => {
      this.logger.warn(
        `Reattempting to reinitialize consumer channel after cancellation ${this.constructor.name}, consumerTag: ${consumerTag}.`,
      );

      // this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      //   await this.setupChannel(channel);
      // });
    }, 5000);
  }
}
