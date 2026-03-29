import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnectionManager, connect } from 'amqp-connection-manager';
import { RABBITMQ_CONNECTION } from './rabbitmq.constants';

export const RabbitmqConnectionProvider = {
  provide: RABBITMQ_CONNECTION,
  useFactory: (configService: ConfigService): AmqpConnectionManager => {
    const rabbitmqUrl = configService.getOrThrow<string>('RABBITMQ_AMQP_URL');
    const logger = new Logger(`RabbitmqConnectionProvider`);

    const connection = connect([rabbitmqUrl], {
      heartbeatIntervalInSeconds: 5, // Heartbeat interval to check if the connection is alive
      reconnectTimeInSeconds: 5, // Time to wait before trying to reconnect after a connection failure
    });

    connection.on('connect', () => {
      logger.log(`Connected to RabbitMQ.`);
    });

    connection.on('reconnect', (params) => {
      logger.warn(`Reconnecting to RabbitMQ after ${params.delay} ms and ${params.attempt} attempts.`);
    });

    connection.on('connectFailed', (error) => {
      logger.error(`Failed to connect to RabbitMQ. Retrying... ${error.err.message}`);
    });

    connection.on('disconnect', (params) => {
      logger.error(`Disconnected from RabbitMQ. ${params.err}`);
    });

    connection.on('blocked', (params) => {
      logger.error(`RabbitMQ connection blocked. ${params.reason}`);
    });

    connection.on('unblocked', () => {
      logger.log(`RabbitMQ connection unblocked.`);
    });

    return connection;
  },

  inject: [ConfigService],
};
