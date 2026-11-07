import { DATE_RANGE_MESSAGES } from "@/lib/date-range";

export const PROJECT_DATE_TIME_ZONE = "Asia/Ho_Chi_Minh";

export const PROJECT_DATE_MESSAGES = {
  startDateInPast: DATE_RANGE_MESSAGES.startInPast,
  startDateRequiredForEndDate: DATE_RANGE_MESSAGES.startRequired,
  endDateBeforeStartDate: DATE_RANGE_MESSAGES.endBeforeStart,
} as const;

export const PROJECT_COLOR_OPTIONS = [
  "#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#ec4899",
  "#0ea5e9", "#8b5cf6", "#14b8a6", "#f97316", "#64748b",
] as const;

export const PROJECT_ICON_OPTIONS = [
  "🚀", "📚", "📊", "💡", "🎯", "🔧", "📝", "🎨",
  "⚡", "🏆", "💼", "🎓", "🧪", "📱", "🌐", "🔒",
] as const;
