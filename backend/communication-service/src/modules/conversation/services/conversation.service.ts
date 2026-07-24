import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ConversationType,
  ConversationRole,
  InvitationStatus,
} from '@prisma/client';
import { ChatGateway } from '../../chat/chat.gateway';
import { ConversationEventPublisher } from '../events/conversation.publisher';
import { getSenderProfile } from '../../../common/utils/user.util';
import { mapMediaWithUrl, getMediaUrl } from '../../../common/utils/file.util';
import { UpdateConversationSettingDto } from '../dto/update-conversation-setting.dto';
import { S3Service } from '../../../infrastructure/s3/s3.service';
import { ChatEvent } from '../../chat/chat.events';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly conversationPublisher: ConversationEventPublisher,
    private readonly s3Service: S3Service,
  ) {}

  async createDirectConversation(userId: string, participantId: string) {
    if (userId === participantId) {
      throw new BadRequestException(
        'Không thể tạo cuộc trò chuyện với chính mình',
      );
    }

    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        AND: [
          {
            members: {
              some: {
                userId: userId,
              },
            },
          },
          {
            members: {
              some: {
                userId: participantId,
              },
            },
          },
        ],
      },
      include: {
        members: true,
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    return this.prisma.$transaction(async (prisma) => {
      const conversation = await prisma.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          createdBy: userId,
          members: {
            create: [
              {
                userId: userId,
                role: ConversationRole.MEMBER,
              },
              {
                userId: participantId,
                role: ConversationRole.MEMBER,
              },
            ],
          },
          setting: {
            create: {
              allowSendMessage: true,
              allowCreateNote: true,
              allowCreatePoll: true,
              allowPinMessage: true,
            },
          },
        },
        include: {
          members: true,
        },
      });

      return conversation;
    });
  }

  async getUserConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
        OR: [
          {
            type: {
              not: ConversationType.DIRECT,
            },
          },
          {
            createdBy: userId,
          },
          {
            messages: {
              some: {},
            },
          },
        ],
      },
      include: {
        setting: true,
        members: true,
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            medias: true,
            poll: true,
            note: true,
            replyTo: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return Promise.all(
      conversations.map(async (conv) => {
        const member = conv.members.find((m) => m.userId === userId);
        let unreadCount = 0;

        if (member) {
          const referenceDate = member.lastReadAt || member.joinedAt;
          unreadCount = await this.prisma.message.count({
            where: {
              conversationId: conv.id,
              createdAt: {
                gt: referenceDate,
              },
              senderId: {
                not: userId, // don't count own messages as unread
              },
            },
          });
        }

        return {
          ...conv,
          unreadCount,
        };
      }),
    );
  }

  async getConversationMessages(
    conversationId: string,
    cursor?: string,
    limit: number = 20,
    direction: 'older' | 'newer' | 'around' = 'older',
  ) {
    const includeQuery = {
      reactions: true,
      medias: true,
      poll: { include: { options: { include: { votes: true } } } },
      note: true,
      replyTo: true,
    };

    if (direction === 'older') {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: includeQuery,
      });

      let nextCursor: string | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages: messages.reverse().map((message) => ({
          ...message,
          medias: mapMediaWithUrl(message.medias),
        })),
        nextCursor,
      };
    } else if (direction === 'newer') {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'asc' },
        include: includeQuery,
      });

      let prevCursor: string | undefined = undefined;
      if (messages.length > limit) {
        const prevItem = messages.pop();
        prevCursor = prevItem?.id;
      }

      return {
        messages: messages.map((message) => ({
          ...message,
          medias: mapMediaWithUrl(message.medias),
        })),
        prevCursor,
      };
    } else if (direction === 'around' && cursor) {
      const halfLimit = Math.floor(limit / 2);

      const [targetMessage, olderMessages, newerMessages] = await Promise.all([
        this.prisma.message.findUnique({
          where: { id: cursor },
          include: includeQuery,
        }),
        this.prisma.message.findMany({
          where: { conversationId },
          take: halfLimit + 1,
          skip: 1,
          cursor: { id: cursor },
          orderBy: { createdAt: 'desc' },
          include: includeQuery,
        }),
        this.prisma.message.findMany({
          where: { conversationId },
          take: halfLimit + 1,
          skip: 1,
          cursor: { id: cursor },
          orderBy: { createdAt: 'asc' },
          include: includeQuery,
        }),
      ]);

      let nextCursor: string | undefined = undefined;
      if (olderMessages.length > halfLimit) {
        const nextItem = olderMessages.pop();
        nextCursor = nextItem?.id;
      }

      let prevCursor: string | undefined = undefined;
      if (newerMessages.length > halfLimit) {
        const prevItem = newerMessages.pop();
        prevCursor = prevItem?.id;
      }

      const allMessages: typeof olderMessages = [];
      if (olderMessages.length > 0) {
        allMessages.push(...olderMessages.reverse());
      }
      if (targetMessage) {
        allMessages.push(targetMessage);
      }
      if (newerMessages.length > 0) {
        allMessages.push(...newerMessages);
      }

      return {
        messages: allMessages.map((message) => ({
          ...message,
          medias: mapMediaWithUrl(message.medias),
        })),
        nextCursor,
        prevCursor,
      };
    }

    return { messages: [], nextCursor: undefined, prevCursor: undefined };
  }

  async createGroupConversation(
    userId: string,
    data: { name?: string; avatarUrl?: string; participantIds: string[] },
  ) {
    const { senderName, senderAvatar } = await getSenderProfile(userId);
    const otherParticipantIds = data.participantIds.filter(
      (id) => id !== userId,
    );

    const members = [{ userId: userId, role: ConversationRole.OWNER }];

    const invitations = otherParticipantIds.map((id) => ({
      invitedUserId: id,
      invitedBy: userId,
      status: 'PENDING' as const,
    }));

    const conversation = await this.prisma.$transaction(async (prisma) => {
      return prisma.conversation.create({
        data: {
          type: ConversationType.GROUP,
          name: data.name || null,
          avatarUrl: data.avatarUrl || null,
          createdBy: userId,
          members: {
            create: members,
          },
          invitations: {
            create: invitations,
          },
          setting: {
            create: {
              allowSendMessage: true,
              allowCreatePoll: true,
              allowCreateNote: true,
              allowPinMessage: true,
            },
          },
        },
        include: {
          members: true,
          invitations: true,
        },
      });
    });

    await this.chatGateway.sendSystemMessage(
      conversation.id,
      userId,
      `${senderName} đã tạo nhóm`,
    );

    // Emit invitation events and notifications
    if (conversation.invitations) {
      conversation.invitations.forEach((inv) => {
        this.conversationPublisher.publishGroupInvitation(
          inv.invitedUserId,
          userId,
          senderName,
          senderAvatar,
          inv.id,
          conversation.id,
          conversation.name,
          conversation.avatarUrl,
        );
      });
    }

    return conversation;
  }

  async getConversationMedia(
    conversationId: string,
    cursor?: string,
    limit: number = 20,
  ) {
    const medias = await this.prisma.media.findMany({
      where: {
        message: {
          conversationId,
        },
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        message: {
          createdAt: 'desc',
        },
      },
      include: {
        message: {
          select: {
            senderId: true,
            createdAt: true,
          },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (medias.length > limit) {
      const nextItem = medias.pop();
      nextCursor = nextItem?.id;
    }

    return {
      medias: mapMediaWithUrl(medias),
      nextCursor,
    };
  }

  async getPinnedMessages(conversationId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        pinned: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
        replyTo: true,
      },
    });

    return messages.map((message) => ({
      ...message,
      medias: mapMediaWithUrl(message.medias),
    }));
  }

  async searchMessages(
    conversationId: string,
    q?: string,
    senderId?: string,
    type?: string,
  ) {
    const whereClause: any = {
      conversationId,
      deletedAt: null,
      recalled: false,
    };

    if (q) {
      whereClause.OR = [
        { content: { contains: q, mode: 'insensitive' } },
        { medias: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    if (senderId) {
      whereClause.senderId = senderId;
    }

    if (type) {
      // Assuming type maps directly to MessageType enum from prisma
      whereClause.type = type;
    }

    const messages = await this.prisma.message.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
        replyTo: true,
      },
      take: 10, // Limit results
    });

    return messages.map((message) => ({
      ...message,
      medias: mapMediaWithUrl(message.medias),
    }));
  }

  async updateConversationSettings(
    conversationId: string,
    userId: string,
    updateSettingDto: UpdateConversationSettingDto,
  ) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (
      !member ||
      (member.role !== ConversationRole.OWNER &&
        member.role !== ConversationRole.ADMIN)
    ) {
      throw new BadRequestException('Bạn không có quyền thay đổi cài đặt nhóm');
    }

    const updatedSettings = await this.prisma.conversationSetting.update({
      where: { conversationId },
      data: updateSettingDto,
    });

    this.chatGateway.server.to(conversationId).emit('group_setting_updated', {
      conversationId,
      setting: updatedSettings,
    });

    return updatedSettings;
  }

  async updateMemberRole(
    conversationId: string,
    userId: string,
    targetUserId: string,
    newRole: ConversationRole,
  ) {
    if (userId === targetUserId) {
      throw new BadRequestException(
        'Không thể tự thay đổi vai trò của chính mình',
      );
    }

    const requester = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!requester || requester.role !== ConversationRole.OWNER) {
      throw new BadRequestException(
        'Chỉ Trưởng nhóm mới có quyền thay đổi vai trò thành viên',
      );
    }

    const targetMember = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId },
      },
    });

    if (!targetMember) {
      throw new BadRequestException('Thành viên không tồn tại trong nhóm');
    }

    const updatedMember = await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId },
      },
      data: { role: newRole },
    });

    const { senderName } = await getSenderProfile(userId);
    const { senderName: targetName } = await getSenderProfile(targetUserId);
    const roleName =
      newRole === ConversationRole.ADMIN ? 'Phó nhóm' : 'Thành viên';

    await this.chatGateway.sendSystemMessage(
      conversationId,
      userId,
      `${senderName} đã chỉ định ${targetName} làm ${roleName}`,
    );

    this.chatGateway.server.to(conversationId).emit('member_role_updated', {
      conversationId,
      member: updatedMember,
    });

    return updatedMember;
  }

  async muteConversation(
    conversationId: string,
    userId: string,
    muted: boolean,
  ) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member) {
      throw new BadRequestException('Bạn không phải là thành viên của nhóm này');
    }

    const updatedMember = await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { muted },
    });

    // Emit websocket event to user's private room to sync all sessions/tabs
    if (this.chatGateway?.server) {
      this.chatGateway.server.to(userId).emit(ChatEvent.CONVERSATION_MUTE_UPDATED, {
        conversationId,
        muted,
      });
    }

    return updatedMember;
  }

  async transferOwnership(
    conversationId: string,
    userId: string,
    newOwnerId: string,
  ) {
    if (userId === newOwnerId) {
      throw new BadRequestException('Không thể chuyển quyền cho chính mình');
    }

    const requester = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!requester || requester.role !== ConversationRole.OWNER) {
      throw new BadRequestException(
        'Chỉ Trưởng nhóm mới có quyền chuyển đổi trưởng nhóm',
      );
    }

    const newOwner = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: newOwnerId } },
    });

    if (!newOwner) {
      throw new BadRequestException('Thành viên không tồn tại trong nhóm');
    }

    await this.prisma.$transaction([
      this.prisma.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { role: ConversationRole.MEMBER },
      }),
      this.prisma.conversationMember.update({
        where: {
          conversationId_userId: { conversationId, userId: newOwnerId },
        },
        data: { role: ConversationRole.OWNER },
      }),
    ]);

    this.chatGateway.server.to(conversationId).emit('member_role_updated', {
      conversationId,
      member: { ...requester, role: ConversationRole.MEMBER },
    });
    this.chatGateway.server.to(conversationId).emit('member_role_updated', {
      conversationId,
      member: { ...newOwner, role: ConversationRole.OWNER },
    });

    const { senderName } = await getSenderProfile(userId);
    const { senderName: targetName } = await getSenderProfile(newOwnerId);

    await this.chatGateway.sendSystemMessage(
      conversationId,
      userId,
      `${senderName} đã chuyển quyền Trưởng nhóm cho ${targetName}`,
    );

    return { success: true };
  }

  async kickMember(conversationId: string, userId: string, memberId: string) {
    if (userId === memberId) {
      throw new BadRequestException('Không thể tự kích bản thân');
    }

    const requester = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    const target = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: memberId } },
    });

    if (!requester || !target) {
      throw new BadRequestException('Thành viên không tồn tại');
    }

    if (requester.role === ConversationRole.MEMBER) {
      throw new BadRequestException('Bạn không có quyền kích thành viên');
    }

    if (
      requester.role === ConversationRole.ADMIN &&
      target.role !== ConversationRole.MEMBER
    ) {
      throw new BadRequestException('Phó nhóm chỉ có thể kích Thành viên');
    }

    await this.prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId: memberId } },
    });

    const remainingMembers = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const targetRooms = [
      conversationId,
      memberId,
      ...remainingMembers.map((m) => m.userId),
    ];

    this.chatGateway.server.to(targetRooms).emit('member_kicked', {
      conversationId,
      userId: memberId,
    });

    const { senderName } = await getSenderProfile(userId);
    const { senderName: targetName } = await getSenderProfile(memberId);

    await this.chatGateway.sendSystemMessage(
      conversationId,
      userId,
      `${senderName} đã xóa ${targetName} khỏi nhóm`,
    );

    return { success: true };
  }

  async addMembers(
    conversationId: string,
    userId: string,
    memberIds: string[],
  ) {
    const requester = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: { conversation: true },
    });

    if (!requester || requester.role !== ConversationRole.OWNER) {
      throw new ForbiddenException(
        'Chỉ nhóm trưởng mới có quyền thêm thành viên',
      );
    }

    const existingMembers = await this.prisma.conversationMember.findMany({
      where: { conversationId, userId: { in: memberIds } },
    });
    const existingInvitations = await this.prisma.groupInvitation.findMany({
      where: {
        conversationId,
        invitedUserId: { in: memberIds },
        status: InvitationStatus.PENDING,
      },
    });

    const existingUserIds = new Set([
      ...existingMembers.map((m) => m.userId),
      ...existingInvitations.map((i) => i.invitedUserId),
    ]);

    const newMemberIds = memberIds.filter((id) => !existingUserIds.has(id));

    if (newMemberIds.length === 0) {
      throw new BadRequestException(
        'Tất cả người dùng đã là thành viên hoặc đã được mời',
      );
    }

    const { senderName, senderAvatar } = await getSenderProfile(userId);

    const invitations = await this.prisma.$transaction(async (prisma) => {
      const createdInvs: any[] = [];
      for (const id of newMemberIds) {
        // Use findFirst + update/create instead of upsert to avoid UniqueConstraint typing issues if Prisma client is stuck
        const existingInv = await prisma.groupInvitation.findFirst({
          where: { conversationId, invitedUserId: id },
        });
        if (existingInv) {
          const inv = await prisma.groupInvitation.update({
            where: { id: existingInv.id },
            data: {
              status: 'PENDING' as any,
              invitedBy: userId,
              createdAt: new Date(),
            },
          });
          createdInvs.push(inv);
        } else {
          const inv = await prisma.groupInvitation.create({
            data: {
              conversationId,
              invitedUserId: id,
              invitedBy: userId,
              status: 'PENDING' as any,
            },
          });
          createdInvs.push(inv);
        }
      }
      return createdInvs;
    });

    invitations.forEach((inv) => {
      this.conversationPublisher.publishGroupInvitation(
        inv.invitedUserId,
        userId,
        senderName,
        senderAvatar,
        inv.id,
        conversationId,
        requester.conversation.name,
        requester.conversation.avatarUrl,
      );
    });

    return { success: true, count: newMemberIds.length };
  }

  async updateGroupInfo(
    conversationId: string,
    userId: string,
    data: { name?: string; avatarUrl?: string },
  ) {
    const requester = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!requester || requester.role !== ConversationRole.OWNER) {
      throw new ForbiddenException(
        'Chỉ nhóm trưởng mới có quyền cập nhật thông tin nhóm',
      );
    }

    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
      },
    });

    const { senderName } = await getSenderProfile(userId);

    if (data.name !== undefined) {
      await this.chatGateway.sendSystemMessage(
        conversationId,
        userId,
        `${senderName} đã đổi tên nhóm thành "${data.name}"`,
      );
    }
    if (data.avatarUrl !== undefined) {
      await this.chatGateway.sendSystemMessage(
        conversationId,
        userId,
        `${senderName} đã đổi ảnh đại diện nhóm`,
      );
    }

    // Broadcast the update so clients can refresh UI
    const memberIds = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    const payload = {
      id: conversationId,
      name: conversation.name,
      avatarUrl: conversation.avatarUrl,
    };

    memberIds.forEach((m) => {
      this.chatGateway.server
        .to(m.userId)
        .emit(ChatEvent.CONVERSATION_UPDATED, payload);
    });

    return conversation;
  }

  async leaveConversation(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!member) {
      throw new BadRequestException('Bạn không phải là thành viên nhóm này');
    }

    if (member.role === ConversationRole.OWNER) {
      const otherMembers = await this.prisma.conversationMember.findMany({
        where: {
          conversationId,
          userId: { not: userId },
        },
      });

      if (otherMembers.length > 0) {
        throw new BadRequestException(
          'Vui lòng chuyển quyền Trưởng nhóm trước khi rời nhóm',
        );
      }
    }

    await this.prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });

    const remainingMembers = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const targetRooms = [
      conversationId,
      userId,
      ...remainingMembers.map((m) => m.userId),
    ];

    this.chatGateway.server.to(targetRooms).emit('member_left', {
      conversationId,
      userId,
    });

    const { senderName } = await getSenderProfile(userId);

    await this.chatGateway.sendSystemMessage(
      conversationId,
      userId,
      `${senderName} đã rời nhóm`,
    );

    return { success: true };
  }

  async disbandConversation(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!member) {
      throw new BadRequestException('Bạn không phải là thành viên nhóm này');
    }

    if (member.role !== ConversationRole.OWNER) {
      throw new BadRequestException(
        'Chỉ Trưởng nhóm mới có quyền giải tán nhóm',
      );
    }

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    const targetRooms = [
      conversationId,
      ...members.map((m) => m.userId),
    ];

    this.chatGateway.server.to(targetRooms).emit(ChatEvent.CONVERSATION_DISBANDED, {
      conversationId,
    });

    this.chatGateway.server.in(conversationId).socketsLeave(conversationId);

    return { success: true };
  }

  async getAvatarUploadPresignedUrl(
    conversationId: string,
    userId: string,
    fileName: string,
    contentType: string,
  ) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!member || member.role !== ConversationRole.OWNER) {
      throw new ForbiddenException(
        'Chỉ nhóm trưởng mới có quyền cập nhật thông tin nhóm',
      );
    }

    const { presignedUrl, s3Key } =
      await this.s3Service.generatePresignedUploadUrl(
        conversationId,
        fileName,
        contentType,
        'group-avatar',
      );

    const fileUrl = getMediaUrl(s3Key);

    return { presignedUrl, s3Key, fileUrl };
  }
}
