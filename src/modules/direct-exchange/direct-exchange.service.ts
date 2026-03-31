import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DirectExchangeService {
  protected readonly logger = new Logger(DirectExchangeService.name);

  constructor() {}

  async fillupQueue(): Promise<void> {

  }
}
