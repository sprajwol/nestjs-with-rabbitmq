import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DirectExchangeService } from '#src/modules/direct-exchange/direct-exchange.service';
import { QueueTestConfigDto } from '#src/modules/direct-exchange/dtos/queue-test-config.dto';

@ApiTags('Direct Exchange')
@Controller('direct-exchange')
export class DirectExchangeController {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly service: DirectExchangeService) {}

  @ApiOperation({})
  @ApiBody({ type: QueueTestConfigDto })
  @Post('publish')
  async fillQueue(
    @Body() queueTestConfigDto: QueueTestConfigDto
  ):Promise<void> {
    this.logger.log('Adding messages to the direct exchange queue.\n', queueTestConfigDto);
    
    await this.service.fillupQueue(queueTestConfigDto);
  }
}
