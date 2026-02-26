import { Controller, Get, Header, Version } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Version('1')
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Header('Deprecation', 'true')
  @Header('Sunset', 'Wed, 31 Dec 2026 23:59:59 GMT')
  @Get()
  getDeprecatedRootMessage() {
    return this.appService.getDeprecatedRootMessage();
  }
}
