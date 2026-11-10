# Live model context validation — 2026-11-10

Six live requests used the configured `gpt-6.1-sol` model through the compiled AI
API, its real PostgreSQL conversation store, history window, token admission and
streaming SDK. The application code tested was commit `917bc918` on `fix/ai`;
this follow-up changes the test harness and documentation only.

## Results

| Context | History sent | Facts recalled / transmitted | First text | Complete | Strict case result |
| --- | ---: | ---: | ---: | ---: | --- |
| Dashboard, short | 20 messages / 1,635 bytes | 6/6 | 3.673 s | 5.849 s | Pass |
| Projects, long ASCII | 20 messages / 12,000 bytes | 4/4 | 4.035 s | 5.657 s | Pass |
| Calendar, long Vietnamese | 20 messages / 12,000 bytes | 4/4 | 2.800 s | 4.849 s | Pass |
| Project A, short | 20 messages / 1,635 bytes | 6/6 | 16.390 s | 19.307 s | Fail: context-label consistency |
| Project B, short | 20 messages / 1,635 bytes | 6/6 | 3.967 s | 6.783 s | Pass |
| New Conversation in Project B | 0 messages / 2 bytes | No historical facts available | 12.011 s | 14.024 s | Pass |

The model recalled **26/26 transmitted historical facts**. Four of the original
30 facts were absent from long-history prompts because of truncation; it returned
null for those fields. Each outside-window fact was also unavailable. This is not
lossless retention of all content in twenty messages.

All six captured model inputs excluded the other conversations' independent random
fact values. No response contained those foreign values. The new conversation
sent no historical messages and returned null for all historical label fields.
Every case used current task metrics and the correct fresh project scope instead
of the stale count of 99 in the history.

The strict overall result is **5/6**, not a full pass. In Project A, the top-level
`secret` contained the exact current-context value, but
`other_contexts.project_a` was null when the test expected the same value again.
Other fields and isolation checks passed. This is an inconsistency in assigning
the recalled fact to a repeated context-label field, not an observed cross-context
history leak. The field name `other_contexts` may have encouraged excluding the
current context; that is an interpretation, not a proven cause. Expected values
were not changed after seeing the response, and the failed case was not retried.

Median time from starting the API request to its first answer delta was **3.967 s**;
median completion was **5.849 s**. The slowest case took 19.307 s. These measurements
include API authentication, database/context reads, the local forwarding bridge,
SDK and real provider generation; they exclude browser rendering. A deliberate
61.5-second minimum interval between call starts respected the configured rolling
minute limits and is excluded from each request's timing. There was one sample per
scenario; these results do not establish latency percentiles or a production SLA.

## Method

Each context had a separate conversation with 22 synthetic stored messages. The
first two included an outside-window marker. The remaining 20 included independently
random labels in the oldest message, an early note, a middle note, a recent note,
a corrected preference and a long note's tail. Three workloads used short text;
Projects used long ASCII text and Calendar used long Vietnamese text.

The test restored each context through HTTP before asking a structured recall
question. Expected answers were derived from the history actually captured at the
model HTTP boundary, after the application's 20-message and 12,000-byte limits.
The question also requested values associated with the other four contexts, current
open-task totals and the current Project Detail ID. The sixth request explicitly
created a new Project B conversation and asked again, testing whether old history
was reused. Every live call used the application's normal system prompt,
temperature, no-retry model client and configured token admission limit.

Only generated fixture data was sent to the provider. Authentication and Project/
Calendar services were fixtures, while the conversation API, persistence, history
selection, truncation and model execution were real. The tests seed historical
messages directly; they do not generate twenty conversational replies per context.
They test selected facts within the window, not semantic recall of every word or
every message. The run does not exercise live-model browser rendering; separate
browser tests cover route switching and cancellation.

## Reproduction

From the repository root, with the usual local Docker images available and provider
configuration in `backend/ai-service/.env`:

```powershell
node backend/security-tests/work-assistant-runtime.mjs --live-context
```

This opt-in mode calls the configured real provider at most six times, spaces
requests for quota, saves `result-live-context.json` under the operating-system
temporary directory's `workspacehub-work-assistant-runtime` folder, then removes
its isolated containers and processes. It leaves the regular application database
unchanged. A semantic failure makes the command exit nonzero and is retained in
the report.

The committed [raw results](work-assistant-live-context-results.json) contain only
synthetic fixture data and answers, not provider credentials. Historical facts
are regenerated independently on each run. Do not relabel this six-request sample
as a guarantee that the model never invents a missing fact: the earlier
[speed/context comparison](work-assistant-speed-context.md) observed such errors
with different prompts and fixtures.

## Additional validation

- Existing regression tests: 30/30 passed.
- Deterministic history properties: 124 combinations and nine positional workloads
  passed; local history preparation over 250 samples had median 0.581 ms and p95
  0.709 ms. These are CPU preparation times, separate from live response latency.
- New harness modules passed Node syntax checks.
- Default database/browser acceptance: final rerun passed, including all 13 context
  checks and no browser JavaScript errors. An earlier run during the live batch
  timed out after 30 seconds in the browser-navigation phase. The isolated rerun
  passed after enabling fuller selector diagnostics; the original timeout's cause
  was not established.
