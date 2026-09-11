// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProjectInvitationListItemRenderer,
  ProjectInvitationModalRenderer,
} from "./components/renderers/project-invitation-renderer";
import {
  NotificationType,
  type Notification,
} from "./types/notification.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/store/store", () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock("@/features/project/hooks/use-invitations", () => ({
  useRespondProjectInvitation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/features/project/api/project.api", () => ({
  getUserProfiles: vi.fn(async (ids: string[]) =>
    new Map(
      ids.map((id) => [
        id,
        {
          id,
          fullName: "Tran Hoai Nam",
          avatarUrl: null,
        },
      ]),
    ),
  ),
}));

vi.mock("@/features/i18n/useAppIntl", async () => {
  const [{ createIntl }, { default: messages }] = await Promise.all([
    import("react-intl"),
    import("@/features/i18n/messages/en"),
  ]);
  const intl = createIntl({ locale: "en", messages });
  return { useAppIntl: () => intl };
});

afterEach(cleanup);

function renderNotification(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  );
}

function projectInvitation(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: "notification-1",
    recipientId: "member-1",
    senderId: "owner-1",
    senderName: "Nguyen Minh Anh",
    type: NotificationType.PROJECT_INVITATION,
    title: "Project invitation",
    content: "You were invited to Workspace Hub",
    isRead: false,
    metadata: {
      invitationId: "invitation-1",
      projectId: "project-1",
      projectName: "Workspace Hub",
      projectIcon: "WH",
      projectColor: "#0052CC",
      status: "PENDING",
      expiresAt: "2026-09-20T00:00:00.000Z",
    },
    createdAt: "2026-09-12T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("Project invitation notification renderer", () => {
  it("shows project identity and inviter in the notification list", () => {
    renderNotification(
      <ProjectInvitationListItemRenderer
        notification={projectInvitation()}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("WH")).toBeTruthy();
    expect(screen.getByText("Workspace Hub")).toBeTruthy();
    expect(screen.getByText("Invited by Nguyen Minh Anh")).toBeTruthy();
    expect(screen.getByText("Awaiting response")).toBeTruthy();
  });

  it("shows project, inviter, role, expiry, and response actions in the popup", () => {
    renderNotification(
      <ProjectInvitationModalRenderer
        notification={projectInvitation()}
        onClose={vi.fn()}
        onMarkAsRead={vi.fn()}
      />,
    );

    expect(screen.getByText("Workspace Hub")).toBeTruthy();
    expect(screen.getByText("Nguyen Minh Anh")).toBeTruthy();
    expect(
      screen.getByText("You were invited to join this project as a member."),
    ).toBeTruthy();
    expect(screen.getByText(/Expires:/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Join" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Decline" })).toBeTruthy();
  });

  it("loads inviter identity for legacy invitations that only have senderId", async () => {
    renderNotification(
      <ProjectInvitationListItemRenderer
        notification={projectInvitation({
          senderName: undefined,
          metadata: {
            invitationId: "invitation-old",
            projectId: "project-old",
            projectName: "Legacy project",
            status: "PENDING",
          },
        })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Legacy project")).toBeTruthy();
    expect(
      await screen.findByText("Invited by Tran Hoai Nam"),
    ).toBeTruthy();
  });
});
