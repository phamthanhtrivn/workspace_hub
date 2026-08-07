export const PROJECT_ICONS = [
  "🚀",
  "📚",
  "📊",
  "💡",
  "🎯",
  "🔧",
  "📝",
  "🎨",
  "⚡",
  "🏆",
  "💼",
  "🎓",
  "🧪",
  "📱",
  "🌐",
  "🔒",
] as const;

export type ProjectIcon = (typeof PROJECT_ICONS)[number];

export const DEFAULT_PROJECT_ICON = "📁";
