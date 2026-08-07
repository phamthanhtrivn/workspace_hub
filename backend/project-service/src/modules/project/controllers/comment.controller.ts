import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentService } from '../services/comment.service';

@Controller('api')
export class CommentController {
  constructor(private readonly comments: CommentService) {}

  @Get('tasks/:taskId/comments')
  async findAll(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
  ) {
    return ApiResponse.success(await this.comments.findAll(userId, taskId), 'Comments loaded successfully');
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
