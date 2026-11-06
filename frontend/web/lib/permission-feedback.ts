import { isAxiosError } from "axios";

export const PERMISSION_REASON = {
  projectCreateTask: 'Ask a project admin to enable "Create tasks" for your account.',
  projectEditOwnTask: 'Ask a project admin to enable "Edit own tasks" for your account.',
  projectEditOthersTask: 'Ask a project admin to enable "Edit other members\' tasks" for your account.',
  projectContribute: "You need to be assigned to this task or have permission to edit it. Ask a project admin to review your task access.",
  projectDocuments: 'Ask a project admin to enable "Edit Project Documents" for your account.',
  projectMembers: 'Ask a project admin to enable "Manage members" for your account.',
  projectLabels: 'Ask a project admin to enable "Manage labels" for your account.',
  projectAdmin: "Only the project owner can change project details or member permissions. Ask the project owner to review your access.",
  projectSettings: 'Project settings require project ownership or "Manage labels" access for label settings. Ask the project owner to review your permissions.',
  projectOwner: "Only the project owner can perform this action. Contact the project owner.",
  taskClosed: "This task is closed. Reopen it before making changes.",
  documentEdit: 'Editing requires Owner or Editor access. Ask the file or folder owner for Editor access; for Project Documents, ask a project admin to enable "Edit Project Documents".',
  documentOwner: "Only the file or folder owner can perform this action. Contact the owner.",
  documentView: "Viewing requires access to this file or folder. Ask the owner to share it with your account.",
  calendarManage: "Only the event creator or calendar owner can change this event. Contact the organizer or calendar owner.",
  calendarOwner: "Only the calendar owner can manage this calendar. Contact the calendar owner.",
  meetingManage: "This action requires the meeting Host or Co-host role. Ask the host to review your role.",
  meetingHost: "Only the meeting Host can perform this action. Contact the host.",
  meetingSchedule: "Editing or cancelling requires the meeting creator, Host or Co-host role. Contact the organizer or host.",
  recordingView: "Viewing requires access to this recording. Ask the recording owner to share it with your account.",
  recordingManage: "Only the recording owner can manage sharing or delete this recording. Contact the recording owner.",
  recordingDownload: "Downloading requires permission from the recording owner. Ask the owner to enable downloads for your account.",
  spaceAdmin: "This action requires space management permission. Ask the space owner or an admin to review your role and the space permissions.",
  spaceOwner: "Only the space owner can perform this action. Contact the space owner.",
  channelManage: "This action requires channel management permission. Ask the channel owner or a space admin to review your access.",
  channelPoll: 'Ask the channel owner or a space admin to enable "Allow Creating Polls" in the channel settings.',
  channelNote: 'Ask the channel owner or a space admin to enable "Allow Creating Notes" in the channel settings.',
  channelPin: 'Ask the channel owner or a space admin to enable "Allow Pinning Messages" in the channel settings.',
  channelSend: 'Ask the channel owner or a space admin to enable "Allow Sending Messages" in the channel settings.',
  messageUnavailable: "This message is no longer eligible for editing or recall. You can only change your own eligible messages; send a new message if you need to correct it.",
  messageOwner: "Only the message author can edit or recall this message. You can edit or recall your own messages while those actions are available.",
} as const;

function requestBody(value: unknown): Record<string, unknown> {
  try {
    const body = typeof value === "string" ? JSON.parse(value) : value;
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch { return {}; }
}

/** Explain resource permission failures without reclassifying auth, validation or provider errors. */
export function getPermissionErrorMessage(error: unknown): string | undefined {
  if (!isAxiosError(error) || error.response?.status !== 403) return undefined;
  const url = error.config?.url;
  if (!url) return undefined;
  let pathname: string;
  try { pathname = new URL(url, "https://application.invalid").pathname; } catch { return undefined; }
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "api") return undefined;
  const area = segments[1];
  const method = error.config?.method?.toUpperCase() ?? "GET";
  const reading = method === "GET";
  const message = typeof error.response.data?.message === "string" ? error.response.data.message : "";
  if (/password|csrf|captcha|session|token/i.test(message)) return undefined;
  const body = requestBody(error.config?.data);
  const explain = (action: string, reason: string) => `You can't ${action}. ${reason}`;

  if (area === "documents") {
    if (reading) return explain("open this file or folder", PERMISSION_REASON.documentView);
    const project = Boolean(body.projectId) || /project/i.test(message);
    const ownerOnly = /only.*owner|owner.*required/i.test(message);
    const action = segments.includes("upload") ? "upload files to this folder"
      : segments.includes("versions") ? "upload or manage file versions"
      : segments.includes("shares") || segments.includes("sharing") ? "change document sharing"
      : segments.includes("rename") ? "rename this file or folder"
      : segments.includes("move") ? "move this file or folder"
      : method === "DELETE" ? "delete this file or folder" : "change this file or folder";
    if (project) return explain(segments.includes("upload") ? "upload files to Project Documents" : action, PERMISSION_REASON.projectDocuments);
    return explain(action, ownerOnly ? PERMISSION_REASON.documentOwner : PERMISSION_REASON.documentEdit);
  }
  if (["projects", "tasks", "checklists", "labels", "dependencies"].includes(area)) {
    if (/can't add or remove attachments on this task/i.test(message)) return message;
    if (error.response.data?.code === "TASK_ATTACHMENT_EDIT_PERMISSION_REQUIRED") {
      return explain("add or remove attachments on this task", error.response.data.requiredPermission === "canEditOwnTask"
        ? PERMISSION_REASON.projectEditOwnTask : PERMISSION_REASON.projectEditOthersTask);
    }
    if (/not an active project member|do not have access to this project/i.test(message)) {
      return "You can't access this project or its tasks. Ask a project admin to restore your project membership.";
    }
    if (reading) return "You can't view this project or task. Ask a project admin to restore your project membership.";
    if (/owner/i.test(message)) return explain("manage this project", PERMISSION_REASON.projectOwner);
    if (segments.includes("members") || segments.includes("invitations")) return explain("manage project members or invitations", PERMISSION_REASON.projectMembers);
    if (segments.includes("labels") || area === "labels") return explain("manage project labels", PERMISSION_REASON.projectLabels);
    if (area === "projects" && segments.at(-1) === "tasks" && method === "POST") return explain("create a task in this project", PERMISSION_REASON.projectCreateTask);
    if (area !== "projects" || segments.includes("tasks")) {
      return explain("change this task", /contribute/i.test(message) ? PERMISSION_REASON.projectContribute
        : 'Ask a project admin to review "Edit own tasks" or "Edit other members\' tasks", according to who created this task.');
    }
    return explain("change this project", PERMISSION_REASON.projectAdmin);
  }
  if (area === "calendar" || area === "calendars") {
    return explain(reading ? "view this calendar item" : "change this calendar item",
      segments.includes("events") ? PERMISSION_REASON.calendarManage : PERMISSION_REASON.calendarOwner);
  }
  if (area === "meeting-recordings" || segments.includes("recordings")) {
    if (segments.includes("summaries")) return explain("generate a recording summary", PERMISSION_REASON.recordingManage);
    if (segments.includes("permission-requests") || segments.includes("capture-permission")) return explain("change recording permissions", PERMISSION_REASON.meetingManage);
    if (segments.some(segment => ["start", "stop", "pause", "resume"].includes(segment))) return explain("control this recording", "Ask the meeting host to grant recording permission or use the recording request action.");
    return explain(reading ? "open or download this recording" : "manage this recording",
      reading ? segments.includes("download") ? PERMISSION_REASON.recordingDownload : PERMISSION_REASON.recordingView : PERMISSION_REASON.recordingManage);
  }
  if (area === "meetings") {
    if (segments.includes("join")) return "You can't join this meeting. Ask the host to check your invitation, admission status and meeting access.";
    return explain(reading ? "view this meeting" : "change this meeting", PERMISSION_REASON.meetingManage);
  }
  if (area === "ai") return "You can't use this AI action for the selected resource. Access to its project, conversation or source documents is required. Ask the resource owner to review your access.";
  if (area === "direct-conversations" && (/privacy|blocked|direct message/i.test(message) || method === "POST" && segments.length === 2)) {
    return "You can't message this person. Ask them to review their direct-message privacy settings, or contact them through a shared space.";
  }
  if (["spaces", "channels", "messages", "chats", "conversations", "direct-conversations", "notes"].includes(area)) {
    if (/only.*owner|owner.*required/i.test(message)) return explain("change this space or channel", area === "spaces" ? PERMISSION_REASON.spaceOwner : PERMISSION_REASON.channelManage);
    if (segments.includes("messages") && !reading) {
      if (segments.includes("pin") || segments.includes("unpin")) return explain("pin or unpin this message", PERMISSION_REASON.channelPin);
      if (method === "POST" && segments.at(-1) === "messages") return explain("send messages in this conversation", PERMISSION_REASON.channelSend);
      if (method === "PATCH" || method === "PUT" || method === "DELETE") return explain("change this message", PERMISSION_REASON.messageOwner);
    }
    return explain(reading ? "view this conversation" : "change this conversation", area === "spaces" ? PERMISSION_REASON.spaceAdmin : PERMISSION_REASON.channelManage);
  }
  return undefined;
}

export function getActionErrorMessage(error: unknown, fallbackMessage: string): string {
  return getPermissionErrorMessage(error) ?? fallbackMessage;
}

export function logActionError(...details: unknown[]): void {
  const permissionMessage = details.map(getPermissionErrorMessage).find(Boolean);
  if (permissionMessage) console.warn(permissionMessage);
  else console.error(...details);
}
