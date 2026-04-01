import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type AmqpConnectionManager } from 'amqp-connection-manager';
import { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RabbitmqBaseConsumer } from "src/common/integrations/rabbitmq/rabbitmq.base-consumer";
import { RABBITMQ_CONNECTION } from "src/common/integrations/rabbitmq/rabbitmq.constants";
import { QueuePayloadInterface } from "./interfaces/queue-payload.interface";

@Injectable()
export class DirectExchangeConsumerService extends RabbitmqBaseConsumer {
  protected readonly logger = new Logger(this.constructor.name);

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
      // Dead Letter Exchange(DLX) and Dead Letter Queue(DLQ) setup for handling failed messages in separate queue.
      const dlxName = `${this.rabbitmqDirectExchangeName}.dlx`;
      const dlqName = `${this.rabbitmqDirectExchangeQueueName}.dlq`;
      await channel.assertExchange(dlxName, 'direct', { durable: true });
      await channel.assertQueue(dlqName, { durable: true });
      await channel.bindQueue(dlqName, dlxName, this.rabbitmqDirectRoutingKey);

      // Main exchange and queue setup with dead letter configuration.
      await channel.assertExchange(this.rabbitmqDirectExchangeName, 'direct', { durable: true });
      await channel.assertQueue(
        this.rabbitmqDirectExchangeQueueName,
        {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': dlxName,
            'x-dead-letter-routing-key': this.rabbitmqDirectRoutingKey,
          }
        });
      await channel.bindQueue(this.rabbitmqDirectExchangeQueueName, this.rabbitmqDirectExchangeName, this.rabbitmqDirectRoutingKey);

      await channel.prefetch(1);

      await this.consumeFromQueue<QueuePayloadInterface>(
        channel,
        this.rabbitmqDirectExchangeQueueName,
        (msgContent, msg) => this.handleProcessingLogic(msgContent, msg)
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

  private async handleProcessingLogic(msgContent: QueuePayloadInterface, msg: ConsumeMessage) {
    console.log("handleProcessingLogic msgContent == ", typeof msgContent);
    console.log("handleProcessingLogic msg == ", typeof msg);
    console.log("handleProcessingLogic msgContent == ", msgContent);
    console.log("handleProcessingLogic msg == ", msg);
    // await new Promise(resolve => setTimeout(resolve, 10000));
  }

  protected async handleExhaustedRetries<QueuePayloadInterface>(
    msgContent: QueuePayloadInterface,
    msg: ConsumeMessage,
    error: Error
  ) {}
}