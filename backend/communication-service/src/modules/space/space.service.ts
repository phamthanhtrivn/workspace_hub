import { Injectable } from '@nestjs/common';
import { SpaceRole } from '@prisma/client';
import { CreateChannelDto } from '../channel/dto/create-channel.dto';
import { InviteSpaceMemberDto } from './dto/invite-space-members.dto';
import { EnsureProjectSpaceDto } from './dto/ensure-project-space.dto';
import { UpdateSpaceSettingDto } from './dto/update-space-setting.dto';
import { UserProfileSnapshot } from '../../common/types/user.types';
import { SpaceAccessService } from './space-access.service';
import { SpaceSettingsService } from './space-settings.service';
import { SpacePresentationService } from './space-presentation.service';
import { SpaceEventPublisher } from './space-event-publisher.service';
import { ProjectSpaceProvisioningService } from './project-space-provisioning.service';
import { SpaceChannelSynchronizationService } from './space-channel-synchronization.service';
import { SpaceQueryService } from './space-query.service';
import { SpaceMembershipService } from './space-membership.service';
import { SpaceLifecycleService } from './space-lifecycle.service';
import { SpaceInvitationService } from './space-invitation.service';

@Injectable()
export class SpaceService {
  constructor(
    private readonly access: SpaceAccessService,
    private readonly settings: SpaceSettingsService,
    private readonly presentation: SpacePresentationService,
    private readonly events: SpaceEventPublisher,
    private readonly projects: ProjectSpaceProvisioningService,
    private readonly channels: SpaceChannelSynchronizationService,
    private readonly queries: SpaceQueryService,
    private readonly memberships: SpaceMembershipService,
    private readonly lifecycle: SpaceLifecycleService,
    private readonly invitations: SpaceInvitationService,
  ) {}
  async getProjectSpaceStatus(projectId: string) {
    return this.projects.getProjectSpaceStatus(projectId);
  }

  async ensureTaskChannel(
    projectId: string,
    _taskId: string,
    taskTitle: string,
    actorId?: string,
  ) {
    return this.channels.ensureTaskChannel(
      projectId,
      _taskId,
      taskTitle,
      actorId,
    );
  }

  async ensureTaskThread(
    projectId: string,
    taskId: string,
    taskTitle: string,
    actorId?: string,
    channelId?: string,
    status?: string,
    priority?: string,
    dueDate?: string,
    version?: string,
  ) {
    return this.channels.ensureTaskThread(
      projectId,
      taskId,
      taskTitle,
      actorId,
      channelId,
      status,
      priority,
      dueDate,
      version,
    );
  }

  async ensureProjectSpace(dto: EnsureProjectSpaceDto) {
    return this.projects.ensureProjectSpace(dto);
  }

  async createSpace(userId: string, name: string) {
    return this.lifecycle.createSpace(userId, name);
  }

  async getUserSpaces(userId: string) {
    return this.queries.getUserSpaces(userId);
  }

  async getSpaceDetails(userId: string, spaceId: string) {
    return this.queries.getSpaceDetails(userId, spaceId);
  }

  async updateSpace(userId: string, spaceId: string, name: string) {
    return this.lifecycle.updateSpace(userId, spaceId, name);
  }

  async renameProjectSpaceFromProject(
    projectId: string,
    name: string,
    actorId: string,
  ) {
    return this.lifecycle.renameProjectSpaceFromProject(
      projectId,
      name,
      actorId,
    );
  }

  async updateSpaceSettings(
    userId: string,
    spaceId: string,
    settings: UpdateSpaceSettingDto,
  ) {
    return this.settings.updateSpaceSettings(userId, spaceId, settings);
  }

  async getSpaceMembers(
    userId: string,
    spaceId: string,
    search?: string,
    limit?: string | number,
  ) {
    return this.queries.getSpaceMembers(userId, spaceId, search, limit);
  }

  async transferSpaceOwnership(
    userId: string,
    spaceId: string,
    targetUserId: string,
  ) {
    return this.memberships.transferSpaceOwnership(
      userId,
      spaceId,
      targetUserId,
    );
  }

  async updateSpaceMemberRole(
    spaceId: string,
    userId: string,
    targetUserId: string,
    newRole: SpaceRole,
  ) {
    return this.memberships.updateSpaceMemberRole(
      spaceId,
      userId,
      targetUserId,
      newRole,
    );
  }

  async removeSpaceMember(
    userId: string,
    spaceId: string,
    targetUserId: string,
  ) {
    return this.memberships.removeSpaceMember(userId, spaceId, targetUserId);
  }

  async leaveSpace(userId: string, spaceId: string) {
    return this.memberships.leaveSpace(userId, spaceId);
  }

  async deleteSpace(userId: string, spaceId: string) {
    return this.lifecycle.deleteSpace(userId, spaceId);
  }

  async getSpaceInvitations(userId: string, spaceId: string) {
    return this.invitations.getSpaceInvitations(userId, spaceId);
  }

  async cancelSpaceInvitation(
    userId: string,
    spaceId: string,
    invitationId: string,
  ) {
    return this.invitations.cancelSpaceInvitation(
      userId,
      spaceId,
      invitationId,
    );
  }

  async resendSpaceInvitation(
    userId: string,
    spaceId: string,
    invitationId: string,
  ) {
    return this.invitations.resendSpaceInvitation(
      userId,
      spaceId,
      invitationId,
    );
  }

  async createChannel(
    userId: string,
    spaceId: string,
    name: string,
    options: Pick<CreateChannelDto, 'visibility' | 'memberUserIds'> = {},
  ) {
    return this.channels.createChannel(userId, spaceId, name, options);
  }

  async getSpaceChannels(userId: string, spaceId: string, search?: string) {
    return this.channels.getSpaceChannels(userId, spaceId, search);
  }

  async inviteMembersToSpace(
    userId: string,
    spaceId: string,
    invitees: InviteSpaceMemberDto[],
    invitedBySnapshot: UserProfileSnapshot,
  ) {
    return this.invitations.inviteMembersToSpace(
      userId,
      spaceId,
      invitees,
      invitedBySnapshot,
    );
  }
}
