export interface CalendarEventMoveInfo {
  event: {
    id: string;
    start: Date | null;
    end: Date | null;
    allDay: boolean;
  };
  revert: () => void;
}
