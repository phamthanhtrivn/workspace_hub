import { test } from "node:test";
import assert from "node:assert/strict";
import { getActionErrorMessage, getPermissionErrorMessage, PERMISSION_REASON } from "./permission-feedback";

function forbidden(url: string, method = "POST", message = "Forbidden", body?: unknown) {
  return { isAxiosError: true, config: { url, method, data: body }, response: { status: 403, data: { message } } };
}

test("project upload denial names the action, document permission and person to ask", () => {
  const message = getPermissionErrorMessage(forbidden('/api/documents/upload/initiate', 'POST',
    'Named editor permission is required', JSON.stringify({ projectId: 'project' })));
  assert.ok(message?.includes("upload files to Project Documents"));
  assert.ok(message?.includes('"Edit Project Documents"'));
  assert.ok(message?.includes("project admin"));
  assert.ok(!message?.includes("Edit other members"));
});

test("folder Viewer denials explain how to get Editor access", () => {
  const message = getPermissionErrorMessage(forbidden('/api/documents/item/rename', 'PUT', 'Named editor permission is required'));
  assert.ok(message?.includes("rename"));
  assert.ok(message?.includes("Editor access"));
});

test("the precise task attachment permission survives the backend error envelope", () => {
  const original = `You can't add or remove attachments on this task. Ask a project admin to enable "Edit other members' tasks" for your account.`;
  assert.equal(getPermissionErrorMessage(forbidden('/api/tasks/task/documents', 'POST', original)), original);
});

test("project access and membership failures do not suggest unrelated task edit rights", () => {
  assert.match(getPermissionErrorMessage(forbidden('/api/tasks/task/documents', 'DELETE',
    'You do not have access to this project'))!, /restore your project membership/);
});

test("chat feedback distinguishes sending, pinning and direct-message privacy", () => {
  assert.ok(getPermissionErrorMessage(forbidden('/api/channels/channel/messages'))?.includes(PERMISSION_REASON.channelSend));
  assert.ok(getPermissionErrorMessage(forbidden('/api/channels/messages/message/pin', 'PATCH'))?.includes(PERMISSION_REASON.channelPin));
  assert.match(getPermissionErrorMessage(forbidden('/api/direct-conversations'))!, /direct-message privacy settings/);
});

test("Calendar and Meeting feedback names their separate roles", () => {
  assert.ok(getPermissionErrorMessage(forbidden('/api/calendar/events/event', 'PATCH'))?.includes(PERMISSION_REASON.calendarManage));
  assert.ok(getPermissionErrorMessage(forbidden('/api/meetings/meeting/settings', 'PATCH'))?.includes(PERMISSION_REASON.meetingManage));
});

test("recording viewing, downloading and sharing explain distinct capabilities", () => {
  assert.ok(getPermissionErrorMessage(forbidden('/api/meetings/recordings/recording/play', 'GET'))?.includes(PERMISSION_REASON.recordingView));
  assert.ok(getPermissionErrorMessage(forbidden('/api/meetings/recordings/recording/download', 'GET'))?.includes(PERMISSION_REASON.recordingDownload));
  assert.ok(getPermissionErrorMessage(forbidden('/api/meetings/recordings/recording/permissions', 'PATCH'))?.includes(PERMISSION_REASON.recordingManage));
});

test("auth, provider, network and non-403 failures keep their existing message", () => {
  const fallback = "Existing error message";
  for (const error of [new Error('Offline'), forbidden('/api/auth/login'),
    forbidden('https://example.s3.amazonaws.com/file'), forbidden('/api/meetings/join', 'POST', 'Incorrect password'),
    forbidden('/api/documents/upload/initiate', 'POST', 'Invalid CSRF token'),
    ...[400, 401, 404, 409, 500].map(status => ({ ...forbidden('/api/tasks/task'), response: { status } }))]) {
    assert.equal(getPermissionErrorMessage(error), undefined);
    assert.equal(getActionErrorMessage(error, fallback), fallback);
  }
});

test("a malformed serialized request body cannot break permission feedback", () => {
  assert.ok(getPermissionErrorMessage(forbidden('/api/documents/upload/initiate', 'POST', 'Forbidden', '{'))?.includes('Editor access'));
});
