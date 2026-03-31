import { Controller, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DirectExchangeService } from './direct-exchange.service';

@ApiTags('Direct Exchange')
@Controller('direct-exchange')
export class DirectExchangeController {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly service: DirectExchangeService) {}

  @ApiOperation({})
  @Post('publish')
  async fillQueue():Promise<void> {
    this.logger.log('Adding messages to the direct exchange queue.');
    
    await this.service.fillupQueue();
  }
}
