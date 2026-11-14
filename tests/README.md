# Testing WorkspaceHub

Tests belong to the feature or service whose behavior they protect. Node projects use the existing `node:test` runner; User Service keeps JUnit/Maven. No additional runner dependency is required.

## Layout

```text
backend/<service>/src/**/<feature>.spec.{ts,cjs,mjs}   # Fast service tests
backend/<service>/tests/fixtures/                    # Reusable service fixtures
backend/<service>/tests/integration/*.test.cjs        # Explicit database tests
backend/user-service/src/test/java/                  # JUnit tests
frontend/web/{features,components,hooks,lib,store}/**/*.spec.*
tests/support/                                      # Discovery and TS loaders
tests/system/                                       # Cross-service contracts and integration harnesses
```

Aggregate policy tests stay beside the owning feature when they exercise several pieces of the same workflow. Files are retained for behavioral coverage, not deleted just because a refactor broke a fixture. Wrapper files that only import other discovered specs are unnecessary.

## Fast tests

Install each project's normal dependencies first. Generate its Prisma client where applicable. From a Node service or `frontend/web`:

```powershell
npm test
npm test -- --match recording
npm test -- --list
npm run test:typecheck
```

From the repository root:

```powershell
node tests/run-tests.mjs --all
node tests/run-tests.mjs --project frontend/web
node --test tests/support/discovery.spec.mjs backend/scripts/local-security/env-files.test.mjs
mvn -B -f backend/user-service/pom.xml test
```

`--all` runs the seven Node/web projects; Maven and shared tooling have the separate commands above. Discovery supports `.spec.ts`, `.spec.tsx`, `.spec.cjs` and `.spec.mjs`. `--match` filters filenames, not test titles.

The shared preloader compiles source TypeScript using the selected project's installed TypeScript, including Nest decorators and the web `@/` alias. Unit tests do not need a prior `dist` build. CSS imports are stubbed for server-rendered component tests; these are not browser or visual tests. Fixture-specific module loaders share one implementation and keep mocked module caches separate.

Fast tests do not load private `.env` files. Their default database/Redis URLs point at a non-service port, and providers are mocked by the tests. Do not add real credentials or calls to email/AI providers to unit fixtures. Unit files execute in separate Node processes, with at most two running concurrently.

Backend production builds exclude TypeScript spec files. `test:typecheck` checks those test sources separately; the web's normal typecheck already includes its specs.

## Integration tests

Integration tests are separate from `npm test` and CI's fast suite. List them without starting anything:

```powershell
node tests/run-tests.mjs --project backend/calendar-service --suite integration --list
node tests/run-tests.mjs --suite integration --list
```

Calendar and Notification each have `npm run test:integration`. They require `REMINDER_TEST_DATABASE_URL`, whose database name must be exactly `reminder_verification`, and the corresponding service migrations must already be applied. Never point them at application data. Without that variable, those tests skip rather than using `DATABASE_URL`.

Cross-service contract tests using mocks and temporary loopback servers:

```powershell
node tests/run-tests.mjs --suite system
```

These require the normal dependencies of the participating backend services and web. Docker integration remains explicitly opted in using its existing `WORKSPACEHUB_SECURITY_INTEGRATION` or `WORKSPACEHUB_MEETING_INTEGRATION` flag. See [system tests](system/README.md) and [meeting audit](../docs/testing/meeting-business-audit.md). The security and meeting harnesses create isolated infrastructure; their meeting suite does not run the AI summary pipeline.

No Python worker test files were removed or invented in this cleanup. The checked-in fast AI tests cover the Node API/pipeline with provider doubles; they do not certify real OCR, Whisper, model-provider quality, SMTP or LiveKit recording.

## CI

Changed Node/web projects run fast tests, application builds and test typechecking. AI API has a dedicated fast-test job. Shared discovery and env-tooling regressions run in the configuration job. Changes under `tests/` schedule the application checks through the release planner without requiring a runtime image change. Java continues to run Maven `verify`. Docker integration is not started by the fast-test job.
