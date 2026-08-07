import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { ActivityService } from '../services/activity.service';

@Controller('api/tasks')
export class ActivityController {
  constructor(private readonly activities: ActivityService) {}

  @Get(':taskId/activities')
  async list(@CurrentUserId() userId: string, @Param('taskId', new ParseUUIDPipe()) taskId: string) {
    return ApiResponse.success(await this.activities.list(userId, taskId), 'Task activity loaded successfully');
  }
}
