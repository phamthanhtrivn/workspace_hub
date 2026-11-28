import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';

export interface MessageDeliveryIdentity {
  senderId: string;
  requestId: string;
  chatId: string;
  chatType: 'CHANNEL' | 'DIRECT_MESSAGE' | 'MEETING';
  payload: unknown;
}

const DELIVERY_LOCK_NAMESPACE = 8087012;
export const DELIVERY_CONFLICT =
  'This send request was already used for another message or its message is no longer available.';

function fingerprint(identity: MessageDeliveryIdentity) {
  return createHash('sha256')
    .update(
      JSON.stringify([identity.chatType, identity.chatId, identity.payload]),
    )
    .digest('hex');
}

// Call after authorization, in the same transaction that inserts the message.
// Receipts deliberately survive message deletion: replay must never recreate it.
export async function reserveMessageDelivery(
  tx: Prisma.TransactionClient,
  identity: MessageDeliveryIdentity,
): Promise<string | undefined> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${identity.senderId + ':' + identity.requestId}), ${DELIVERY_LOCK_NAMESPACE}::integer)`;
  const [receipt] = await tx.$queryRaw<
    { fingerprint: string; messageId: string }[]
  >`SELECT fingerprint, message_id AS "messageId" FROM message_delivery_receipts
    WHERE sender_id = ${identity.senderId} AND request_id = ${identity.requestId}::uuid`;
  if (receipt && receipt.fingerprint !== fingerprint(identity)) {
    throw new ConflictException(DELIVERY_CONFLICT);
  }

  return receipt?.messageId;
}

export async function recordMessageDelivery(
  tx: Prisma.TransactionClient,
  identity: MessageDeliveryIdentity,
  messageId: string,
) {
  await tx.$executeRaw`INSERT INTO message_delivery_receipts
    (sender_id, request_id, fingerprint, message_id)
    VALUES (${identity.senderId}, ${identity.requestId}::uuid, ${fingerprint(identity)}, ${messageId})`;
}
