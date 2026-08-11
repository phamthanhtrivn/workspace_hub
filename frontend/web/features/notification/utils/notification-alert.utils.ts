export const DEFAULT_DOCUMENT_TITLE = "WorkspaceHub";
export const NOTIFICATION_SOUND_SRC = "/assets/sounds/chat_notification.mp3";

export function playNotificationSound() {
  const audio = new Audio(NOTIFICATION_SOUND_SRC);
  audio.play().catch((error) => {
    console.warn(
      "Audio alert play blocked (User must interact with page first):",
      error,
    );
  });
}

export function getFlashingTitle(count: number, message: string) {
  return `(${count}) ${message}`;
}
