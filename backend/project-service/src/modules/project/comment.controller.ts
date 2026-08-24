import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { PaginationQueryDto } from '../../common/pagination';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentService } from './comment.service';

@Controller('api')
export class CommentController {
  constructor(private readonly comments: CommentService) {}

  @Get('tasks/:taskId/comments')
  async findAll(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.comments.findAll(userId, taskId, query);
    return ApiResponse.success(result.items, 'Comments loaded successfully', result.pagination);
  }

  @Post('tasks/:taskId/comments')
  async create(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return ApiResponse.success(await this.comments.create(userId, taskId, dto), 'Comment created successfully');
  }

  @Patch('task-comments/:commentId')
  async update(
    @CurrentUserId() userId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return ApiResponse.success(await this.comments.update(userId, commentId, dto), 'Comment updated successfully');
  }

  @Delete('task-comments/:commentId')
  async delete(
    @CurrentUserId() userId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
  ) {
    await this.comments.delete(userId, commentId);
    return ApiResponse.success(null, 'Comment deleted successfully');
  }
}
