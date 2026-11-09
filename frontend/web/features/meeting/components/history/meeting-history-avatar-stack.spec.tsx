import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import authReducer, { setCredentials } from "@/store/auth/auth-slice";
import { USER_ROLES } from "@/features/auth/types/auth.constants";
import {
  MEETING_ROLE,
  type MeetingParticipantResponse,
} from "../../types/meeting.types";
import { MeetingHistoryAvatarStack } from "./meeting-history-avatar-stack";

const currentUserId = "00000000-0000-4000-8000-000000000001";
const photo = "https://example.com/current-avatar.png";
const oldPhoto = "https://example.com/previous-avatar.png";

function renderStack(
  avatarUrl: string | null,
  participants: MeetingParticipantResponse[],
  participantCount = participants.length,
  resolvedUrl?: string,
) {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch(
    setCredentials({
      accessToken: "test-token",
      userId: currentUserId,
      email: "user@example.com",
      role: USER_ROLES.USER,
      avatarUrl,
    }),
  );
  const client = new QueryClient();
  if (avatarUrl && resolvedUrl) {
    client.setQueryData(["storage-url", currentUserId, avatarUrl], {
      url: resolvedUrl,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    });
  }
  try {
    return renderToStaticMarkup(
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <MeetingHistoryAvatarStack
            participants={participants}
            participantCount={participantCount}
          />
        </QueryClientProvider>
      </Provider>,
    );
  } finally {
    client.clear();
  }
}

function participant(
  userId: string,
  avatarUrl: string | null,
): MeetingParticipantResponse {
  return {
    id: userId,
    meetingId: "meeting",
    userId,
    role: MEETING_ROLE.PARTICIPANT,
    status: "JOINED",
    joinedAt: null,
    profile: { email: null, fullName: "Participant", avatarUrl },
  };
}

test("meeting cards use the current user's saved avatar when the meeting snapshot has no photo", () => {
  const markup = renderStack(photo, [participant(currentUserId, null)]);
  assert.ok(markup.includes(`src="${photo}"`));
});

test("meeting cards do not resurrect the current user's removed avatar from a stale snapshot", () => {
  const markup = renderStack(null, [participant(currentUserId, oldPhoto)]);
  assert.ok(!markup.includes("<img"));
  assert.ok(markup.includes("lucide-user-round"));
});

test("other participants keep their own photo or the shared user icon and overflow count", () => {
  const markup = renderStack(
    photo,
    [participant("other-user", oldPhoto), participant("without-photo", null)],
    5,
  );
  assert.ok(markup.includes(`src="${oldPhoto}"`));
  assert.ok(!markup.includes(`src="${photo}"`));
  assert.ok(markup.includes("lucide-user-round"));
  assert.ok(markup.includes("+3"));
});

test("meeting cards resolve private avatar references through the existing storage loader", () => {
  const reference = `/api/users/avatars/${currentUserId}/${currentUserId}.png`;
  const signedUrl =
    "https://example.s3.ap-southeast-1.amazonaws.com/avatar.png?X-Amz-Signature=test";
  const markup = renderStack(
    reference,
    [participant(currentUserId, null)],
    1,
    signedUrl,
  );
  assert.ok(markup.includes(`src="${signedUrl}"`));
  assert.ok(!markup.includes("lucide-user-round"));
});
