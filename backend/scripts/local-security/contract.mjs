export const LOCAL_SERVICE_DIRECTORIES = {
  user: 'user-service',
  project: 'project-service',
  communication: 'communication-service',
  document: 'document-service',
  calendar: 'calendar-service',
  notification: 'notification-service',
  ai: 'ai-service',
};

// Each credential belongs to exactly one caller/receiver edge. Route scopes are
// enforced by the receiver; caller-supplied identity/scope headers are not proof.
export const CALLER_CREDENTIALS = [
  ['PROJECT_TO_USER_KEY', 'project', 'user', ['session.authorize']],
  ['COMMUNICATION_TO_USER_KEY', 'communication', 'user', ['session.authorize', 'dm-privacy.read']],
  ['DOCUMENT_TO_USER_KEY', 'document', 'user', ['session.authorize']],
  ['CALENDAR_TO_USER_KEY', 'calendar', 'user', ['session.authorize', 'profile.read']],
  ['NOTIFICATION_TO_USER_KEY', 'notification', 'user', ['session.authorize']],
  ['AI_TO_USER_KEY', 'ai', 'user', ['session.authorize']],
  ['PROJECT_TO_COMMUNICATION_KEY', 'project', 'communication', ['project.sync', 'task.sync', 'task.authorize']],
  ['COMMUNICATION_TO_PROJECT_KEY', 'communication', 'project', ['project.authorize', 'space.events']],
  ['PROJECT_TO_DOCUMENT_KEY', 'project', 'document', ['project.sync', 'attachment.resolve', 'attachment.import']],
  ['DOCUMENT_TO_PROJECT_KEY', 'document', 'project', ['project.authorize', 'document.events']],
  ['PROJECT_TO_NOTIFICATION_KEY', 'project', 'notification', ['notification.create', 'invitation.email', 'invitation.status']],
  ['CALENDAR_TO_COMMUNICATION_KEY', 'calendar', 'communication', ['calendar.sync']],
  ['AI_TO_PROJECT_KEY', 'ai', 'project', ['assistant.project']],
  ['AI_TO_CALENDAR_KEY', 'ai', 'calendar', ['assistant.calendar']],
  ['AI_TO_COMMUNICATION_KEY', 'ai', 'communication', ['conversation.read', 'recording.read', 'ai.callback']],
  ['COMMUNICATION_TO_AI_KEY', 'communication', 'ai', ['conversation.enqueue', 'conversation.status', 'meeting.enqueue', 'meeting.status']],
].map(([name, caller, receiver, scopes]) => ({ name, caller, receiver, scopes }));
