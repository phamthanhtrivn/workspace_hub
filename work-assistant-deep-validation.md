# Work assistant speed and context validation

Test the current implementation without changing production behavior.

- [x] Compare four-message, raw twenty-message and bounded twenty-message history on the same synthetic fixtures.
- [x] Test exact retention at positions 1–20, character/byte truncation, hidden messages, older-than-window data, corrections, Unicode and escaping.
- [x] Run up to nine sequential live-provider requests, counterbalance variant order and measure first text, completion, usage and recall separately.
- [x] Re-run compiled API/browser acceptance and deterministic regression tests; record limits and reproducible results.

Keep sample counts explicit. A retained message does not imply its full text survives truncation. Provider timing is observational, not a guaranteed speedup. Use synthetic data only and do not replay requests with unknown provider outcomes.

Findings and exact measurements: `docs/testing/work-assistant-speed-context.md`. Twenty short turns preserve all positional markers; long-turn prefixes lose older middle/tail details. The live model sometimes substitutes an unrelated old fact when the requested early fact is no longer present. This test request did not change production memory behavior.
