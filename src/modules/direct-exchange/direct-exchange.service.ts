import { Injectable, Logger } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { DirectExchangeProducerService } from './direct-exchange.producer.service';

@Injectable()
export class DirectExchangeService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly producer: DirectExchangeProducerService) {}

  async fillupQueue(): Promise<void> {
    try {

      for (let i = 0; i < 20; i++) {
        const messageId = uuidv7();
        const message = {
          id: i,
          type: `direct-excchange-message${i}`,
          content: `meessage for queue ${i}`,
        };

        await this.producer.processMessage(message, messageId);
      }
    } catch (error) {
      this.logger.error(`Error filling up the direct exchange queue: ${error}`);
    }
  }
}
