import { DATE_RANGE_MESSAGES } from "@/lib/date-range";

export const PROJECT_DATE_TIME_ZONE = "Asia/Ho_Chi_Minh";

export const PROJECT_DATE_MESSAGES = {
  startDateInPast: DATE_RANGE_MESSAGES.startInPast,
  startDateRequiredForEndDate: DATE_RANGE_MESSAGES.startRequired,
  endDateBeforeStartDate: DATE_RANGE_MESSAGES.endBeforeStart,
} as const;

export {
  WORKSPACE_COLOR_OPTIONS as PROJECT_COLOR_OPTIONS,
  WORKSPACE_ICON_OPTIONS as PROJECT_ICON_OPTIONS,
} from "@/components/ui/custom/appearance.constants";
