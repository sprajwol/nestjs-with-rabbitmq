import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DirectExchangeService } from './direct-exchange.service';
import { QueueTestConfigDto } from './dtos/queue-test-config.dto';

@ApiTags('Direct Exchange')
@Controller('direct-exchange')
export class DirectExchangeController {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly service: DirectExchangeService) {}

  @ApiOperation({})
  @Post('publish')
  async fillQueue(
    @Body() queueTestConfigDto: QueueTestConfigDto
  ):Promise<void> {
    this.logger.log('Adding messages to the direct exchange queue.');
    
    await this.service.fillupQueue(queueTestConfigDto);
  }
}
