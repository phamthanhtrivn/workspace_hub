import { TaskPriority, TaskStatus } from "@/features/project/types/project";
import { PREVIEW_PROJECT, PREVIEW_TASK } from "../../landing-content";

// A single fictional workspace shared by the six illustrations. Never workspace/API records.
export const PREVIEW_FRAME_CLASS_NAME = "h-[620px] sm:h-[720px] xl:h-[780px]";
export const PREVIEW_DATE_LABEL = "Monday, October 26, 2026";
export const PREVIEW_TIME_LABEL = "10:24 AM";

export const PREVIEW_TEAM = [
  { name: "Tri", role: "Owner" },
  { name: "Linh", role: "Member" },
  { name: "Minh", role: "Member" },
] as const;

export interface PreviewProjectTask {
  key: string;
  title: string;
  label: string;
  owner: string;
  due: string;
  priority: TaskPriority;
  checklist: readonly [completed: number, total: number];
  comments: number;
}

interface PreviewBoardColumn {
  status: TaskStatus;
  label: string;
  tone: "muted" | "info" | "warning" | "success" | "danger";
  tasks: readonly PreviewProjectTask[];
}

export const PREVIEW_BOARD_COLUMNS = [
  { status: TaskStatus.TODO, label: "TO DO", tone: "muted", tasks: [
    { key: "GRAD-12", title: "Prepare usability questions", label: "Research", owner: "Minh", due: "Oct 28", priority: TaskPriority.MEDIUM, checklist: [0, 3], comments: 2 },
    { key: "GRAD-15", title: "Write the evaluation plan", label: "Writing", owner: "Tri", due: "Oct 30", priority: TaskPriority.LOW, checklist: [0, 2], comments: 1 },
  ] },
  { status: TaskStatus.IN_PROGRESS, label: "IN PROGRESS", tone: "info", tasks: [
    { key: "GRAD-10", title: PREVIEW_TASK, label: "Development", owner: "Tri", due: "Oct 29", priority: TaskPriority.HIGH, checklist: [2, 5], comments: 4 },
    { key: "GRAD-11", title: "Review interview findings", label: "Research", owner: "Linh", due: "Oct 27", priority: TaskPriority.MEDIUM, checklist: [1, 3], comments: 3 },
  ] },
  { status: TaskStatus.IN_REVIEW, label: "IN REVIEW", tone: "warning", tasks: [
    { key: "GRAD-08", title: "Research brief", label: "Writing", owner: "Linh", due: "Oct 26", priority: TaskPriority.MEDIUM, checklist: [3, 3], comments: 2 },
  ] },
  { status: TaskStatus.DONE, label: "DONE", tone: "success", tasks: [
    { key: "GRAD-01", title: "Define the project scope", label: "Planning", owner: "Tri", due: "Oct 23", priority: TaskPriority.HIGH, checklist: [4, 4], comments: 3 },
    { key: "GRAD-03", title: "Gather reference materials", label: "Research", owner: "Minh", due: "Oct 24", priority: TaskPriority.LOW, checklist: [2, 2], comments: 1 },
  ] },
  { status: TaskStatus.CANCELLED, label: "CANCELLED", tone: "danger", tasks: [] },
] as const satisfies readonly PreviewBoardColumn[];

export const PREVIEW_CHAT_CHANNELS = ["general", "research", "development", "announcements"] as const;
export const PREVIEW_CHAT_MESSAGES = [
  { id: "brief", sender: "Linh", time: "09:15", text: "The research brief is ready. I added the interview findings and the main questions for our prototype.", attachment: "Research brief.pdf" },
  { id: "task", sender: "Tri", time: "09:18", text: "Thanks, Linh! I’ll use this for the prototype task. We can walk through the first version in our next review.", task: PREVIEW_TASK },
  { id: "review", sender: "Minh", time: "09:22", text: "I’ll prepare the usability questions before the review. The references are in our shared folder." },
] as const;

export const PREVIEW_DOCUMENTS = [
  { id: "research", name: "Research & references", kind: "folder", detail: "3 files", owner: "Linh", modified: "Oct 26, 2026" },
  { id: "design", name: "Design & prototype", kind: "folder", detail: "2 files", owner: "Tri", modified: "Oct 25, 2026" },
  { id: "brief", name: "Research brief.pdf", kind: "pdf", detail: "2.4 MB", owner: "Linh", modified: "Oct 26, 2026" },
  { id: "notes", name: "Interview notes.docx", kind: "document", detail: "148 KB", owner: "Minh", modified: "Oct 25, 2026" },
  { id: "plan", name: "Project timeline.xlsx", kind: "spreadsheet", detail: "84 KB", owner: "Tri", modified: "Oct 24, 2026" },
  { id: "report", name: "Evaluation plan.pdf", kind: "pdf", detail: "1.2 MB", owner: "Tri", modified: "Oct 23, 2026" },
] as const;

export const PREVIEW_CALENDAR_DAYS = [
  { label: "MON", date: 26 }, { label: "TUE", date: 27 }, { label: "WED", date: 28 },
  { label: "THU", date: 29 }, { label: "FRI", date: 30 }, { label: "SAT", date: 31 }, { label: "SUN", date: 1 },
] as const;
export const PREVIEW_CALENDAR_HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"] as const;
export const PREVIEW_CALENDAR_EVENTS = [
  { id: "research", day: 0, start: 0, title: "Review findings", time: "09:00 – 10:00", isTask: false },
  { id: "prototype", day: 1, start: 1, title: "Prototype work", time: "10:00 – 11:00", isTask: true },
  { id: "meeting", day: 2, start: 5, title: "Prototype review", time: "14:00 – 15:00", isTask: false },
  { id: "writing", day: 3, start: 2, title: "Evaluation plan", time: "11:00 – 12:00", isTask: true },
  { id: "submit", day: 4, start: 6, title: "Submit research brief", time: "15:00 – 16:00", isTask: true },
] as const;
export type PreviewCalendarEvent = (typeof PREVIEW_CALENDAR_EVENTS)[number];
export const PREVIEW_MINI_CALENDAR_DAYS = Array.from({ length: 35 }, (_, index) => {
  const date = index - 2;
  return { key: index, date: date < 1 ? date + 30 : date > 31 ? date - 31 : date, currentMonth: date >= 1 && date <= 31 };
});

export const PREVIEW_FOCUS_STATS = [
  { label: "Focus time", value: "1h 40m" },
  { label: "Completed", value: "4", unit: "sessions" },
  { label: "Daily goal", value: "4 / 8", unit: "sessions" },
  { label: "Streak", value: "3", unit: "days" },
] as const;
export const PREVIEW_MEETINGS = [
  { title: "Prototype review", date: "Wed, Oct 28", time: "14:00 – 14:30", project: PREVIEW_PROJECT },
  { title: "Weekly project check-in", date: "Fri, Oct 30", time: "09:00 – 09:30", project: PREVIEW_PROJECT },
] as const;
