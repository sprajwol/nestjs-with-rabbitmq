import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TopicExchangeService } from '#src/modules/topic-exchange/topic-exchange.service';
import { QueueTestConfigDto } from '#src/modules/topic-exchange/dtos/queue-test-config.dto';

@ApiTags('Topic Exchange')
@Controller('topic-exchange')
export class TopicExchangeController {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly service: TopicExchangeService) {}

  @ApiOperation({})
  @ApiBody({ type: QueueTestConfigDto })
  @Post('publish')
  async fillQueue(@Body() queueTestConfigDto: QueueTestConfigDto): Promise<void> {
    this.logger.log('Adding messages to the topic exchange queue.\n', queueTestConfigDto);

    await this.service.fillupQueue(queueTestConfigDto);
  }
}
