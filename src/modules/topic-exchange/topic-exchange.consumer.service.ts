import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type AmqpConnectionManager } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';

import { RabbitmqBaseConsumer } from '#src/common/integrations/rabbitmq/rabbitmq.base-consumer';
import { RABBITMQ_CONNECTION } from '#src/common/integrations/rabbitmq/rabbitmq.constants';
import { OrderCreatedPayloadDto } from '#src/modules/topic-exchange/dtos/order-created-payload.dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { OrderCancelledPayloadDto } from '#src/modules/topic-exchange/dtos/order-cancelled-payload.dto';

@Injectable()
export class TopicExchangeConsumerService extends RabbitmqBaseConsumer {
  protected readonly logger = new Logger(this.constructor.name);

  private readonly exchange: string; // RabbitMQ rabbitmqTopicExchangeName
  private readonly orders_queue: string;
  private readonly orders_routing_key_pattern: string;

  constructor(
    @Inject(RABBITMQ_CONNECTION) connection: AmqpConnectionManager,
    private readonly configService: ConfigService,
  ) {
    super(connection);

    this.exchange = this.configService.getOrThrow<string>('RABBITMQ_TOPIC_EXCHANGE_NAME');

    this.orders_queue = 'orders';
    this.orders_routing_key_pattern = 'orders.*';
  }

  protected async setupChannel(channel: ConfirmChannel): Promise<void> {
    try {
      await channel.assertExchange(this.exchange, 'topic', { durable: true });

      await channel.assertQueue(this.orders_queue, { durable: true });

      await channel.bindQueue(this.orders_queue, this.exchange, this.orders_routing_key_pattern);

      await channel.prefetch(1);

      await this.consumeFromQueue<any>(channel, this.orders_queue, (msgContent, msg) =>
        this.handleProcessingLogic(msgContent, msg),
      );

      this.logger.log(
        `
            Consumer Listening on Queue:
            Exchange '${this.exchange}',
            Type: 'topic',
            Queue: '${this.orders_queue}',
            RoutingKey: '${this.orders_routing_key_pattern}',
          `,
      );
    } catch (error) {
      this.logger.error(`Error during channel setup: ${error}`);

      // Rethrow the error to prevent the producer from starting with an improperly configured channel.
      throw error;
    }
  }
  
  private async validateTopicData(routingKey: string, msgContent: any) {
    let schema: any;

    if (routingKey === 'orders.created') schema = OrderCreatedPayloadDto;
    else if (routingKey === 'orders.cancelled') schema = OrderCancelledPayloadDto;
    else throw new Error(`Received routingKey with unmapped DTO: '${routingKey}'.`);

    const instance = plainToInstance(schema, msgContent);
    await validateOrReject(instance);

    return instance;
  }

  private async handleProcessingLogic(
    msgContent: any,
    msg: ConsumeMessage,
  ): Promise<void> {
    const routingKey = msg.fields.routingKey;

    await this.validateTopicData(routingKey, msgContent);

    try {
      switch (routingKey) {
        case 'orders.created':
          console.log("Orders Created");
          break;
        case 'orders.cancelled':
          console.log("Orders Cancelled");
          break;
        default:
          console.log(`No specific topic defined for topic: ${routingKey}`);
          break;
      }
      
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      this.logger.error(
        `Error processing with ID: ${msgContent.id}, messageId: ${msg.properties.messageId}, Error: ${error}`,
      );
    }

    // throw new Error(`Simulated processing error for messageId: ${msg.properties.messageId}`);
  }

  protected async handleExhaustedRetries<QueuePayloadDto>(
    msgContent: QueuePayloadDto,
    msg: ConsumeMessage,
    error: Error,
  ) {}
}
