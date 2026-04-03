import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { type AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RABBITMQ_CONNECTION } from './rabbitmq.constants';
import { ValidationError } from 'class-validator';

export abstract class RabbitmqBaseConsumer implements OnModuleInit {
  protected channelWrapper: ChannelWrapper;
  // Each child class must provide its own logger instance with the correct context name.
  protected readonly abstract logger: Logger;

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

    // await new Promise<void>((resolve, reject) => {
    //   this.channelWrapper.once('connect', () => resolve());

    //   this.channelWrapper.once('error', (err) => reject(err));
    // });
  }

  // Child classes must implement the setupChannel method to create and configure the channel as needed (E.g. asserting exchanges, queues, bindings, prefetch, consume etc.)
  // 'abstract' keyword forces the child class to implement this method, ensuring that the necessary channel is properly setup up for each child instance producer to properly function.
  protected abstract setupChannel(channel: ConfirmChannel): Promise<void>;

  // Child classes must implement the handleExhaustedRetries method to provide the logic for handling messages that have exhausted their retry attempts and are about to be moved to the DLQ.
  protected abstract handleExhaustedRetries<T>(
    msgContent: T,
    msg: ConsumeMessage,
    error: Error,
  ): Promise<void>;

  protected async consume<T>(
    msg: ConsumeMessage | null,
    channel: ConfirmChannel,
    onMessage: (msgContent: T, msg: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    if (!msg) return;

    const { messageId, timestamp } = msg.properties;
    const currentTimestamp = Date.now();
    let msgContent: T | undefined;

    try {
      this.logger.log(`Received message with ID: ${messageId}, Timestamp: ${timestamp}, Current Timestamp: ${currentTimestamp}, Delay: ${currentTimestamp - timestamp}ms.`);

      msgContent = JSON.parse(msg.content.toString()) as T;

      // Excecuting the actual message handler function that handles the logic for processing the message from the queue passed in as a parameter from the child consumer class.
      await onMessage(msgContent, msg);

      channel.ack(msg);

      this.logger.log(`Message with ID: ${messageId} acknowledged successfully.`);
    } catch (error) {
      this.logger.error(`Message Consuming Failed. ID: ${messageId}.`);

      if ((!msgContent) || (Array.isArray(error) && error.every(err => err instanceof ValidationError))) {
        this.logger.error(`Message content is malformed/unparseable/undefined. Message will be moved to DLQ. ID: ${messageId}. Error: ${error}.`);

        try {
          await this.handleExhaustedRetries(msgContent, msg, error);
        } catch (dbError) {
          this.logger.fatal(`Failed to execute handleExhaustedRetries for message ID: ${messageId}. Error: ${dbError}.`);
        }

        channel.nack(msg, false, false);
        return;
      }

      const headers = msg.properties.headers;
      const deathHeader = headers['x-deeath']?.[0];
      const retryCount = deathHeader ? deathHeader.count : 0;
      const maxRetries = 5;

      // if (retryCount < 5) {
      //   this.logger.warn(`Retrying message with ID: ${messageId}. Retry Attempt: ${retryCount + 1} / ${maxRetries}.`);
      //   channel.nack(msg, false, true);
      // } else {
      //   this.logger.warn(`Retry attempts exhausted. Message with ID: ${messageId} will be moved to the DLQ.`);

      //   // try {
      //   //   await this.handleExhaustedRetries(msgContent, msg, error);
      //   // } catch (error) {

      //   // }

      //   channel.nack(msg, false, false);
      // }
    }
  }

  protected async consumeFromQueue<T>(
    channel: ConfirmChannel,
    queueName: string,
    onMessage: (msgContent: T, msg: ConsumeMessage) => Promise<void>,
  ) {
    return await channel.consume(
      queueName,
      (msg) => this.consume<T>(msg, channel, onMessage),
      { onCancel: (msg) => this.handleConsumerCancel(msg.consumerTag) },
    );
  }

  protected handleConsumerCancel(consumerTag: string) {
    this.logger.error(`Consumer  '${consumerTag}' was cancelled by the  broker.`);
  }
}
