import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { PaginationQueryDto } from '../../common/pagination';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { ActivityService } from './activity.service';

@Controller('api/tasks')
export class ActivityController {
  constructor(private readonly activities: ActivityService) {}

  @Get(':taskId/activities')
  async list(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.activities.list(userId, taskId, query);
    return ApiResponse.success(result.items, 'Task activity loaded successfully', result.pagination);
  }
}
