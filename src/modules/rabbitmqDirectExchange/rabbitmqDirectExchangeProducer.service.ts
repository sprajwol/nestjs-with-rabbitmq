import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import { Channel, ConfirmChannel } from 'amqplib';

@Injectable()
export class RabbitmqDirectExchangeProducerService {
  // private connection: amqp.AmqpConnectionManager;
  // private channelModel: amqp.ChannelModel;

  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  private readonly logger = new Logger(RabbitmqDirectExchangeProducerService.name);
  
  private readonly rabbitmqUrl: string; // RabbitMQ management URL
  private readonly rabbitmqUsername: string; // RabbitMQ username
  private readonly rabbitmqPassword: string; // RabbitMQ password
  private readonly rabbitmqDirectExchangeName: string; // RabbitMQ rabbitmqDirectExchangeName
  private readonly rabbitmqDirectExchangeQueueName: string; // RabbitMQ rabbitmqDirectExchangeQueueName
  private readonly rabbitmqDirectRoutingKey: string; // RabbitMQ rabbitmqDirectRoutingKey

  constructor(private readonly configService: ConfigService) {
    this.rabbitmqUrl = this.configService.getOrThrow<string>('RABBITMQ_AMQP_URL');
    this.rabbitmqUsername =  this.configService.getOrThrow<string>('RABBITMQ_USERNAME');
    this.rabbitmqPassword = this.configService.getOrThrow<string>('RABBITMQ_PASSWORD');
    this.rabbitmqDirectExchangeName = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_NAME');
    this.rabbitmqDirectExchangeQueueName = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_EXCHANGE_QUEUE_NAME');
    this.rabbitmqDirectRoutingKey = this.configService.getOrThrow<string>('RABBITMQ_DIRECT_ROUTING_KEY');
  }

  async onModuleInit() {
    await this.initConnection();
  }

  async initConnection() {
    this.connection = connect([this.rabbitmqUrl]);

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(this.rabbitmqDirectExchangeName, 'direct' , { durable: false });
        await channel.assertQueue(this.rabbitmqDirectExchangeQueueName, { durable: false });
        await channel.bindQueue(this.rabbitmqDirectExchangeQueueName, this.rabbitmqDirectExchangeName, this.rabbitmqDirectRoutingKey);
      }
    });
  }
}
