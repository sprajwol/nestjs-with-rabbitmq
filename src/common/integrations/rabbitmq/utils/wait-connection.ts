import { ChannelWrapper } from 'amqp-connection-manager';

export async function waitConnection(channelWrapper: ChannelWrapper): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('RabbitMQ Timeout')), 30000);

    channelWrapper.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });

    channelWrapper.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
