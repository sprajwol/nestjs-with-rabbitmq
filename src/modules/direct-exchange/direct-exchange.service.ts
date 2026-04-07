import { Injectable, Logger } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

import { DirectExchangeProducerService } from '#src/modules/direct-exchange/direct-exchange.producer.service';
import { QueuePayloadDto } from '#src/modules/direct-exchange/dtos/queue-payload.dto';
import { QueueTestConfigDto } from '#src/modules/direct-exchange/dtos/queue-test-config.dto';

@Injectable()
export class DirectExchangeService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly producer: DirectExchangeProducerService) {}

  async fillupQueue(queueTestConfigDto: QueueTestConfigDto): Promise<void> {
    try {

      for (let i = 0; i < queueTestConfigDto.numberOfMessages; i++) {
        const messageId = uuidv7();
        const message: QueuePayloadDto = {
          id: i.toString(),
          type: `direct-exchange-message${i}`,
          content: `meessage for queue ${i}`,
        };

        await this.producer.processMessage(message, messageId);
      }
    } catch (error) {
      this.logger.error(`Error filling up the direct exchange queue: ${error}`);
    }
  }
}
