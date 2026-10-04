export const MAX_POMODORO_NOTES_LENGTH = 2000;

export function limitPomodoroNotes(notes: string): string {
  return Array.from(notes).slice(0, MAX_POMODORO_NOTES_LENGTH).join("");
}
