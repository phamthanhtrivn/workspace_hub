# Work assistant speed and context validation — 2026-11-10

The current bounded history was tested against a four-message baseline and twenty-message history with the former per-message character limits but no shared byte budget. Production behavior was not changed during this validation.

## Method and scope

- Current branch: `fix/ai`, based on `8704ee1d`, including the uncommitted `work-history.ts` implementation.
- Synthetic conversation fixtures only; no private user tasks or conversation contents were sent to the provider.
- The same `workAnswer` orchestration and configured provider/model were used. Each fixture variant used the same question and facts; variant order rotated between scenarios. Streaming retries were disabled.
- Nine primary cases were attempted: three workloads × three history variants. Two raw twenty-message cases exceeded the existing admission budget and were rejected before a provider call. Seven primary requests plus two diagnostic follow-ups reached the real provider: **nine live calls total**.
- Configured limits observed for the live run: 5 requests/minute and 10,000 estimated tokens/minute. The runner deliberately spaced calls to respect those limits. Scheduler spacing is excluded from the latency below; it is not application queue latency.
- Provider first-text/completion times below measure model orchestration after admission. They exclude database reads, gateway authentication, browser paint, and deliberate benchmark spacing. There is one paired observation per workload, not a load test or statistical performance guarantee.
- Each primary fixture starts with 22 stored messages. The two outside the window are removed; one of the remaining twenty is explicitly hidden. The twenty-message variants therefore send 19 visible messages. Positional tests separately exercise all twenty visible positions.

## Live speed comparison

Seconds from admission to first text / completed response:

| Workload | Four messages | Current bounded twenty | Raw twenty |
| --- | --- | --- | --- |
| Short conversation | 3.475 / 4.258 | 2.908 / 4.234 | 3.048 / 4.167 |
| Long ASCII conversation | 11.313 / 12.329 | 13.303 / 14.444 | Rejected before provider call |
| Long Vietnamese/Unicode conversation | 11.177 / 12.151 | 14.081 / 15.611 | Rejected before provider call |

The short fixture did not show a material completion-time penalty. Current bounded twenty was slower on both long fixtures: +2.115 s and +3.460 s to completion. The raw twenty histories occupied 24,602 and 32,773 serialized bytes and could not fit the configured conservative token budget with the system prompt/output reservation. Current bounded history fit at 12,000 bytes in both cases. These observations do not establish that it will always be slower or faster for other prompts or provider load.

Local history preparation over 250 iterations had a median of 0.637 ms and p95 of 0.863 ms in the primary run. Its cost was much smaller than model generation in this sample. True provider input usage and the application's byte-based admission estimate differ; the latter is intentionally conservative.

## Context retention

The current algorithm applies two independent truncation stages:

1. Each historical user message is limited to 1,000 UTF-16 characters; each assistant message to 1,500.
2. All selected messages share a 12,000-byte serialized JSON budget. Newer text is allocated first; older messages may retain only a short prefix.

It retains up to twenty message records, not the full text of twenty arbitrary messages.

Deterministic markers were placed separately at every message position:

| Fixture | Marker at start | Marker at middle | Marker at tail |
| --- | --- | --- | --- |
| Short messages | 20/20 | 20/20 | 20/20 |
| Long ASCII messages | 20/20 | 9/20, positions 12–20 | 0/20 |
| Long Unicode messages | 20/20 | 6/20, positions 15–20 | 0/20 |

Tail markers in the long fixtures occur after the per-message character caps, so they are already absent before the shared budget is applied. This is not a semantic model failure: the model never receives those markers. Middle-marker losses demonstrate the additional shared-budget effect.

Live semantic checks found:

- Current bounded twenty recovered the early plan label in the short fixture. The four-message baseline could not, because that turn was outside its window.
- Recent plan labels, the most recent correction, and the current project total were correct in all three primary bounded-history requests.
- Hidden-message and outside-window labels remained unavailable; the model returned null for those fields in all primary cases.
- In both long bounded fixtures, the early plan label had been removed by truncation. The model incorrectly reused an unrelated old preference label instead of returning null for the missing early plan.
- Two follow-ups used independently random labels to exclude a shared-suffix guessing explanation. With the early fact still truncated, the model again returned the wrong old preference. When that same kind of fact was placed at the beginning of the oldest selected message, it survived the budget and was recovered correctly.

The supported claim is therefore: **recent context is preserved better than older detail; complete twenty-message recall is not guaranteed, and missing older facts can lead to a wrong answer.** The current implementation should not be represented as lossless memory.

## Regression and runtime verification

- All 24 focused backend/frontend regression tests passed.
- 124 deterministic combinations checked message count, byte bounds, hidden messages, Unicode round trips, and JSON escaping.
- Nine positional workloads checked all twenty positions at start/middle/tail.
- The compiled API, real isolated PostgreSQL/Redis, and desktop/mobile browser acceptance passed progressive rendering, completed-only persistence, stopping, and interrupted provider behavior. A follow-up acceptance also denied both history reads and generation against another account's session (HTTP 404, no model calls), and verified a new conversation sends none of the old history. This acceptance uses fixture Auth/Project/Calendar responses and a fixture provider, so it does not imply the entire normal local stack is configured.
- The final browser run recorded first visible content at approximately 1.424 s with a deliberately delayed fixture provider; API first SSE content was approximately 77 ms, with final completion near 2.583 s. The provider intentionally waited 2.5 s between chunks. These fixture timings must not be mixed with the live provider table.
- The persistent local test account requested during validation is `ai-test@workspacehub.local`, role `USER`. Registration, verification of that new account, and login returned HTTP 200. Its password is stored outside Git in `E:/KLTN/hoho/.tmp/local-ai-test-account/credentials.json`. Existing local User Service migrations were reconciled transactionally to allow startup; no existing account password or role was changed.

## Reproduction and artifacts

```powershell
node --test backend/security-tests/work-assistant-streaming.test.mjs backend/security-tests/work-assistant-streaming-frontend.test.mjs backend/security-tests/work-assistant-frontend.test.mjs
node backend/security-tests/work-assistant-context-benchmark.mjs
node backend/security-tests/work-assistant-context-benchmark.mjs --live
node backend/security-tests/work-assistant-context-benchmark.mjs --live --followup
node backend/security-tests/work-assistant-runtime.mjs
```

`--live` explicitly contacts the configured provider. The main comparison makes at most nine calls; the follow-up mode makes at most two additional calls and waits for the prior run's quota window. This validation's main run made seven calls and its follow-up made two. Unknown provider outcomes are not retried.

Raw results are under `.tmp/work-assistant-deep-validation/context-benchmark.json` and `context-followup.json`. Runtime screenshots/results are in `workspacehub-work-assistant-runtime` under the operating system temporary directory. Provider credentials and account passwords are not in this report.

## Recommended next change

Keep twenty stored turns and streaming, but use a compact factual memory or a cached summary of older turns with source-turn references and revocation rules. Keep recent turns verbatim. State when older detail is unavailable instead of treating a short prefix as complete memory. Retest missing-fact behavior and latency before claiming improved long-conversation recall. No such behavior change was made as part of this test-only request.
