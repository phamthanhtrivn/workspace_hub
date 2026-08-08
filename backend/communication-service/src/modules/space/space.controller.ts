import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { SpaceService } from './space.service';
import { SPACE_SUCCESS_MESSAGES_LABEL } from './types/space.enums';

@Controller('api/spaces')
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  @Post()
  async createSpace(
    @Headers('x-user-id') userId: string,
    @Body() body: { name: string },
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    const space = await this.spaceService.createSpace(userId, body.name);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.CREATED,
      data: space,
    };
  }

  @Get()
  async getUserSpaces(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    const spaces = await this.spaceService.getUserSpaces(userId);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.LISTED,
      data: spaces,
    };
  }

  @Post(':spaceId/channels')
  async createChannel(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Body() body: { name: string },
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    if (!spaceId) {
      throw new BadRequestException('Thiếu spaceId');
    }
    const channel = await this.spaceService.createChannel(
      userId,
      spaceId,
      body.name,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.CHANNEL_CREATED,
      data: channel,
    };
  }

  @Get(':spaceId/channels')
  async getSpaceChannels(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    if (!spaceId) {
      throw new BadRequestException('Thiếu spaceId');
    }
    const channels = await this.spaceService.getSpaceChannels(userId, spaceId);
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.CHANNEL_LISTED,
      data: channels,
    };
  }

  @Post(':spaceId/invite')
  async inviteMembers(
    @Headers('x-user-id') userId: string,
    @Param('spaceId') spaceId: string,
    @Body() body: { userIds: string[] },
  ) {
    if (!userId) {
      throw new BadRequestException('Thiếu userId');
    }
    if (!spaceId) {
      throw new BadRequestException('Thiếu spaceId');
    }
    const result = await this.spaceService.inviteMembersToSpace(
      userId,
      spaceId,
      body.userIds,
    );
    return {
      message: SPACE_SUCCESS_MESSAGES_LABEL.INVITED,
      data: result,
    };
  }
}
