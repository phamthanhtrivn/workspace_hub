import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'calendar-service',
      status: 'ok',
    };
  }
}
