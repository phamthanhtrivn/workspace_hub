# Pomodoro Config Consistency Fixes

## Goal

Keep timer labels, Calendar task duration, and settings validation consistent with the saved Pomodoro configuration.

## Tasks

- [x] Add failing tests for break labels, custom durations, Calendar scheduling, and minimum cycle length.
- [x] Make the primary action label match the active timer mode.
- [x] Render configured focus and break durations in the mode tabs.
- [x] Schedule Calendar tasks using the configured focus duration.
- [x] Enforce the correct minimum for every numeric setting.
- [x] Run Pomodoro tests, lint, type checks, and runtime page verification.

## Done When

- [x] All four reported inconsistencies have regression tests and the Pomodoro suite passes.
