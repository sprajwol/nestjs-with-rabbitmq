import { Injectable, Logger } from '@nestjs/common';

import { v7 as uuidv7 } from 'uuid';

import { QueuePayloadDto } from '#src/modules/topic-exchange/dtos/queue-payload.dto';
import { QueueTestConfigDto } from '#src/modules/topic-exchange/dtos/queue-test-config.dto';
import { TopicExchangeProducerService } from '#src/modules/topic-exchange/topic-exchange.producer.service';

@Injectable()
export class TopicExchangeService {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly producer: TopicExchangeProducerService) {}

  async fillupQueue(queueTestConfigDto: QueueTestConfigDto): Promise<void> {
    try {

      for (let i = 0; i < queueTestConfigDto.numberOfMessages; i++) {
        const messageId = uuidv7();
        const message: QueuePayloadDto = {
          id: i.toString(),
          type: `topic-exchange-message${i}`,
          content: `meessage for queue ${i}`,
        };

        await this.producer.processMessage(message, messageId, "orders.created");
      }
    } catch (error) {
      this.logger.error(`Error filling up the topic exchange queue: ${error}`);
    }
  }}
