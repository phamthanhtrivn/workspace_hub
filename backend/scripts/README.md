# Backend maintenance and local tooling

Run these commands from the repository root. The top-level scripts are the common local entrypoints. Supporting modules and less frequent database/file maintenance commands stay in their own folders.

## Daily local setup

| Entrypoint | Purpose | Writes |
| --- | --- | --- |
| `prepare-local-security-env.mjs` | Prepare missing caller credentials and align existing local env files | Only with `--write`; backs up changed files |
| `validate-local-env.mjs` | Check env readers, variable placement and matching credentials | No |
| `prepare-local-docker-env.mjs` | Project host settings into the four private Docker env groups | Only with `--write`; backs up changed files |
| `validate-local-docker-env.mjs` | Check Docker/host env consistency | No |
| `check-ai-infrastructure.mjs` | Check AI dependencies, model settings and deployment parameters in an env file | No |
| `reset-local-workspace.mjs` | Inspect or reset local application rows, known queues and indexes | Only with `--apply`; follow the stop/backup procedure |

Use [local setup](../../docs/development/local-setup.md) for the command order and [environment configuration](../../docs/development/environment.md) for prerequisites. The supported local speech worker runs in the combined Docker stack.

## Database tools and private plan

`local-security/` owns the shared env parser, caller contract, database helpers and optional database-security operations:

| Command | Purpose |
| --- | --- |
| `local-security/prepare-local-database.mjs` | Create/inspect a private plan; `--apply` prepares restricted roles, `--verify` checks them, `--cutover` changes service env credentials |
| `local-security/migrate-local-security.mjs` | Inspect the security migration set; `--apply` backs up and restore-tests databases before applying that set |
| `local-security/rehearse-local-databases.mjs` | Apply full migration chains to uniquely named scratch databases, verify them and remove only those scratch databases |

These are explicit operations, not application startup hooks. The current local runtime shares the configured PostgreSQL login; restricted roles are optional and must not be enabled as a cleanup step. Full migration helpers are also used by the isolated system-test harnesses.

The private plan is **`backend/scripts/local-security/.env.db-plan.json`**. It stores administrator credentials, service database names and proposed role credentials. Database preparation, migration, rehearsal, reset and the optional file-cleanup database tests read it. Business services do not load it during normal startup.

Keep the file local and Git-ignored. Existing checkouts can still read `backend/.env.security-db-plan.json` if the new path is absent. Move an existing plan to the new path before using database tools; do not replace it with an empty file or regenerate passwords just to reorganize files. The tools reuse its contents.

## File-copy maintenance

`file-copy-maintenance/` groups the shared database runtime, its regression tests and two operator commands:

- `purge-legacy-file-references.mjs`: inspect/remove legacy document cards and linked Notebook sources while retaining original files and independent snapshots.
- `reconcile-notebook-snapshots.mjs`: inspect unbound Notebook copies and repair interrupted retention acknowledgements; applying cleanup requires stopped AI processes and `--offline`.

Both default to inspection. See [file-copy behavior and maintenance](../../docs/features/document-chat-sharing.md) before running an apply command.

## Tests and repository documentation

`tests/` under this directory contains regressions for the common Docker-env and reset entrypoints. Env/parser/private-plan tests stay beside the `local-security` helpers; file-copy tests stay with their owning maintenance module.

After installing the normal AI API dependencies, run:

```powershell
node --test tests/support/discovery.spec.mjs backend/scripts/local-security/*.test.mjs backend/scripts/tests/*.test.mjs backend/scripts/file-copy-maintenance/*.test.mjs
```

The file-copy suite's database cases remain opt-in through `WORKSPACEHUB_FILE_COPY_DB_TESTS`; the default run does not alter application databases. Do not run reset or migration apply commands to verify a folder reorganization.

The repository-root [`tests/`](../../tests/README.md) is separate: its runner, TypeScript loader and system harness are used by application `npm test` commands and CI. Keep it. The [`docs/`](../../docs/README.md) index groups active setup, architecture, feature, deployment and thesis material. Thesis HTML previews need their source adapters, CSS, font license and all runtime-loaded JavaScript chunks, even when those assets are generated files.
