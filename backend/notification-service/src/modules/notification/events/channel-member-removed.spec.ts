import assert from "node:assert/strict";
import { test } from "node:test";
import { NotificationType } from "@prisma/client";
import { SpaceNotificationEvent } from "./space-notification.event";
import { SpaceInvitationNotificationHandler } from "./space-invitation-notification.service";
import { NotificationService } from "../notification.service";
import {
  getNotificationCategoryWhere,
  KafkaNotificationPayload,
} from "../types/notification.types";

const payload: KafkaNotificationPayload = {
  recipientId: "removed-member",
  senderId: "owner",
  senderName: "Owner",
  type: NotificationType.CHANNEL_MEMBER_REMOVED,
  title: "Removed from a private channel",
  content: "Owner removed you from planning in Workspace.",
  metadata: {
    channelId: "channel",
    channelName: "planning",
    spaceId: "space",
    spaceName: "Workspace",
    actorId: "owner",
  },
};

function fixture() {
  const savedNotifications: unknown[] = [];
  const deliveries: Array<{
    recipientId: string;
    event: string;
    notification: unknown;
  }> = [];
  const database = {
    notification: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        const saved = { id: "notification", ...data, isRead: false };
        savedNotifications.push(saved);
        return Promise.resolve(saved);
      },
    },
  };
  const gateway = {
    server: {
      to: (recipientId: string) => ({
        emit: (event: string, notification: unknown) => {
          assert.equal(savedNotifications.length, 1);
          deliveries.push({ recipientId, event, notification });
        },
      }),
    },
  };
  type Dependencies = ConstructorParameters<typeof NotificationService>;
  const service = new NotificationService(
    database as unknown as Dependencies[0],
    gateway as unknown as Dependencies[1],
    {} as Dependencies[2],
  );
  // Keep this delivery test focused on the durable in-app notification.
  service.sendPushToUser = () => Promise.resolve();
  const event = new SpaceNotificationEvent(
    new SpaceInvitationNotificationHandler(service),
    service,
  );
  return { event, deliveries, savedNotifications };
}

test("persists a channel removal notification before delivering it only to its recipient", async () => {
  const { event, deliveries, savedNotifications } = fixture();
  await event.handleSpaceInvitationNotificationEvent({ value: payload });
  assert.equal(savedNotifications.length, 1);
  assert.deepEqual(deliveries, [
    {
      recipientId: "removed-member",
      event: "new_notification",
      notification: savedNotifications[0],
    },
  ]);
  const saved = savedNotifications[0] as Record<string, unknown>;
  assert.equal(saved.type, NotificationType.CHANNEL_MEMBER_REMOVED);
  assert.equal(saved.link, undefined);
  assert.deepEqual(saved.metadata, payload.metadata);
});

test("classifies removal notifications as Chat notifications", () => {
  const where = getNotificationCategoryWhere("CHAT");
  assert.ok(
    JSON.stringify(where).includes(NotificationType.CHANNEL_MEMBER_REMOVED),
  );
});

test("rejects malformed channel membership notifications before saving or delivering them", async () => {
  const invalidPayloads: KafkaNotificationPayload[] = [
    { ...payload, recipientId: undefined },
    { ...payload, senderId: undefined },
    { ...payload, title: "" },
    { ...payload, content: "" },
    { ...payload, metadata: { ...payload.metadata, channelName: "" } },
    { ...payload, metadata: undefined },
  ];
  for (const invalidPayload of invalidPayloads) {
    const { event, deliveries, savedNotifications } = fixture();
    await assert.rejects(
      event.handleSpaceInvitationNotificationEvent({ value: invalidPayload }),
      /Invalid channel membership notification payload/,
    );
    assert.equal(savedNotifications.length, 0);
    assert.equal(deliveries.length, 0);
  }
});

const ownershipPayload: KafkaNotificationPayload = {
  ...payload,
  recipientId: "next-owner",
  type: NotificationType.CHANNEL_OWNERSHIP_TRANSFERRED,
  title: "You are now a private channel owner",
  content:
    "You are now the owner of planning in Workspace because Owner is no longer in the channel.",
  link: "/chat?spaceId=space&channelId=channel",
  metadata: {
    ...payload.metadata,
    previousOwnerId: "owner",
    newOwnerId: "next-owner",
  },
};

test("persists and delivers an ownership notification only to the new owner", async () => {
  const { event, deliveries, savedNotifications } = fixture();
  await event.handleSpaceInvitationNotificationEvent({
    value: ownershipPayload,
  });
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].recipientId, "next-owner");
  assert.equal(deliveries[0].event, "new_notification");
  const saved = savedNotifications[0] as Record<string, unknown>;
  assert.equal(saved.type, NotificationType.CHANNEL_OWNERSHIP_TRANSFERRED);
  assert.equal(saved.link, ownershipPayload.link);
  assert.deepEqual(saved.metadata, ownershipPayload.metadata);
  assert.ok(
    JSON.stringify(getNotificationCategoryWhere("CHAT")).includes(
      NotificationType.CHANNEL_OWNERSHIP_TRANSFERRED,
    ),
  );
});

test("rejects invalid ownership transitions before creating notifications", async () => {
  for (const metadata of [
    { ...ownershipPayload.metadata, previousOwnerId: undefined },
    { ...ownershipPayload.metadata, previousOwnerId: "different-owner" },
    { ...ownershipPayload.metadata, newOwnerId: "different-recipient" },
    { ...ownershipPayload.metadata, previousOwnerId: "next-owner" },
  ]) {
    const { event, deliveries, savedNotifications } = fixture();
    await assert.rejects(
      event.handleSpaceInvitationNotificationEvent({
        value: { ...ownershipPayload, metadata },
      }),
      /Invalid channel ownership notification payload/,
    );
    assert.equal(savedNotifications.length, 0);
    assert.equal(deliveries.length, 0);
  }
});
