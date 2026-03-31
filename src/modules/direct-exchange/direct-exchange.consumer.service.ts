import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { type AmqpConnectionManager } from 'amqp-connection-manager';
import { Channel, ConfirmChannel, Options } from 'amqplib';
import { RabbitmqBaseConsumer } from "src/common/integrations/rabbitmq/rabbitmq.base-consumer";
import { RABBITMQ_CONNECTION } from "src/common/integrations/rabbitmq/rabbitmq.constants";

interface RabbitMqMessagePayload {
  productId: string;
  newQuantity: number;
}

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
      await channel.assertExchange(this.rabbitmqDirectExchangeName, 'direct', { durable: false });
      await channel.assertQueue(this.rabbitmqDirectExchangeQueueName, { durable: false });
      await channel.bindQueue(this.rabbitmqDirectExchangeQueueName, this.rabbitmqDirectExchangeName, this.rabbitmqDirectRoutingKey);

      await channel.prefetch(1);

      await this.consumeFromQueue<RabbitMqMessagePayload>(channel, this.rabbitmqDirectExchangeQueueName, (data) => this.handleProcessingLogic(data));

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

  private async handleProcessingLogic(data: RabbitMqMessagePayload) {}
}