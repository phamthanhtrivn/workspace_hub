import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth() {
    return {
      message: 'Calendar service is running',
      data: this.appService.getHealth(),
    };
  }
}
