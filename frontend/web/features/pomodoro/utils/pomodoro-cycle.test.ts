import { describe, expect, it } from "vitest";
import { getNextPomodoroCycleStep } from "./pomodoro-cycle";

describe("getNextPomodoroCycleStep", () => {
  it("runs focus, short break, focus, long break, then repeats", () => {
    const afterFirstFocus = getNextPomodoroCycleStep("FOCUS", 0, 2);
    expect(afterFirstFocus).toEqual({ mode: "SHORT_BREAK", cycleCount: 1 });

    const afterShortBreak = getNextPomodoroCycleStep(
      afterFirstFocus.mode,
      afterFirstFocus.cycleCount,
      2,
    );
    expect(afterShortBreak).toEqual({ mode: "FOCUS", cycleCount: 1 });

    const afterSecondFocus = getNextPomodoroCycleStep(
      afterShortBreak.mode,
      afterShortBreak.cycleCount,
      2,
    );
    expect(afterSecondFocus).toEqual({ mode: "LONG_BREAK", cycleCount: 0 });

    const afterLongBreak = getNextPomodoroCycleStep(
      afterSecondFocus.mode,
      afterSecondFocus.cycleCount,
      2,
    );
    expect(afterLongBreak).toEqual({ mode: "FOCUS", cycleCount: 0 });
  });
});
