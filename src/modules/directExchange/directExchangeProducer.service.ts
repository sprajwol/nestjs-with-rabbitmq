import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AmqpConnectionManager,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import { Channel, ConfirmChannel } from 'amqplib';
import { RABBITMQ_CONNECTION } from 'src/common/integrations/rabbitmq/rabbitmq.constants';

@Injectable()
export class DirectExchangeProducerService {
  // private connection: amqp.AmqpConnectionManager;
  // private channelModel: amqp.ChannelModel;

  // private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  private readonly logger = new Logger(DirectExchangeProducerService.name);
  
  private readonly rabbitmqDirectExchangeName: string; // RabbitMQ rabbitmqDirectExchangeName
  private readonly rabbitmqDirectExchangeQueueName: string; // RabbitMQ rabbitmqDirectExchangeQueueName
  private readonly rabbitmqDirectRoutingKey: string; // RabbitMQ rabbitmqDirectRoutingKey

  constructor(
    private readonly configService: ConfigService,
    @Inject(RABBITMQ_CONNECTION) private readonly connection: AmqpConnectionManager
  ) {
    this.rabbitmqDirectExchangeName = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_NAME');
    this.rabbitmqDirectExchangeQueueName = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_QUEUE_NAME');
    this.rabbitmqDirectRoutingKey = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_ROUTING_KEY');
  }

  async onModuleInit() {
    await this.initConnection();
  }

  async initConnection() {
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(this.rabbitmqDirectExchangeName, 'direct' , { durable: false });
        await channel.assertQueue(this.rabbitmqDirectExchangeQueueName, { durable: false });
        await channel.bindQueue(this.rabbitmqDirectExchangeQueueName, this.rabbitmqDirectExchangeName, this.rabbitmqDirectRoutingKey);
      }
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
      this.logger.warn(`Channel drained.  Backpressure relieved, can resume sending messages.`);
    });
  }
}
