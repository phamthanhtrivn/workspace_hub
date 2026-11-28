import axios from "axios";

const PUSH_API_PATHS = {
  publicKey: "/api/notifications/push/vapid-public-key",
  subscribe: "/api/notifications/push/subscribe",
} as const;

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function getPushVapidPublicKey(
  accessToken: string,
): Promise<string> {
  const response = await axios.get<{ data?: { publicKey?: string } }>(
    `${process.env.NEXT_PUBLIC_API_URL || ""}${PUSH_API_PATHS.publicKey}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const key = response.data?.data?.publicKey;
  if (!key) throw new Error("Failed to retrieve public VAPID key");

  return key;
}

export async function savePushSubscription(
  accessToken: string,
  subscription: PushSubscriptionJSON,
): Promise<void> {
  if (
    !subscription.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys.auth
  )
    throw new Error(
      "Browser push subscription is missing its endpoint or keys",
    );
  const payload: PushSubscriptionPayload = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  };
  await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL || ""}${PUSH_API_PATHS.subscribe}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );
}
