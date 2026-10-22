import {
  presetReportRange, reportRangeErrors, sameReportRange,
  type PomodoroReportPreset, type PomodoroReportRange,
} from "./pomodoro-report";

export interface PomodoroReportRangeState {
  today: string;
  preset: PomodoroReportPreset | "custom";
  applied: PomodoroReportRange;
  draft: PomodoroReportRange;
}

type RangeAction =
  | { type: "day"; today: string }
  | { type: "preset"; preset: PomodoroReportPreset; today: string }
  | { type: "draft"; range: PomodoroReportRange }
  | { type: "apply"; today: string }
  | { type: "cancel" };

export function initialReportRange(today: string): PomodoroReportRangeState {
  const range = presetReportRange("week", new Date(`${today}T00:00:00`));
  return { today, preset: "week", applied: range, draft: range };
}

export function reportRangeReducer(state: PomodoroReportRangeState, action: RangeAction): PomodoroReportRangeState {
  switch (action.type) {
    case "day": {
      if (action.today === state.today) return state;
      const applied = state.preset === "custom" ? state.applied
        : presetReportRange(state.preset, new Date(`${action.today}T00:00:00`));
      return { ...state, today: action.today, applied,
        draft: sameReportRange(state.draft, state.applied) ? applied : state.draft };
    }
    case "preset": {
      const range = presetReportRange(action.preset, new Date(`${action.today}T00:00:00`));
      return { today: action.today, preset: action.preset, applied: range, draft: range };
    }
    case "draft": return { ...state, draft: action.range };
    case "apply": {
      if (Object.keys(reportRangeErrors(state.draft, new Date(`${action.today}T00:00:00`))).length) return state;
      return { ...state, today: action.today, preset: "custom", applied: state.draft };
    }
    case "cancel": return { ...state, draft: state.applied };
  }
}
