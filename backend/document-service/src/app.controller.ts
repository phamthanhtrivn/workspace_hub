import { Public } from './common/decorators/http-authentication.decorator';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
