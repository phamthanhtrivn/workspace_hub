# Project Member Permissions

## Goal
Replace the `ADMIN` role with per-member permissions while keeping `OWNER` as the only project authority.

## Tasks
- [x] Add failing backend tests for owner-only permission updates and permission-gated actions.
- [x] Add a safe SQL migration and Prisma fields, backfilling former Admins with all delegated permissions.
- [x] Replace Admin checks with member permission checks across tasks, sprints, members, and labels.
- [x] Replace the role update API with an owner-only member-permissions API.
- [x] Add frontend permission types, mutation hooks, and an accessible permissions dialog in the members panel.
- [x] Verify tests, Prisma schema, lint, type-check/build, migration behavior, and service startup.

## Done When
- [x] Projects expose only `OWNER` and `MEMBER`; Owner can configure six delegated permissions per Member; forbidden backend operations remain blocked even if UI is bypassed.

## Notes
- Existing Admins become Members with all six delegated permissions enabled.
- Existing Members inherit the four legacy project-wide member settings; sprint and label management remain disabled.
- Only Owner may change permissions or project settings; delegated members cannot grant permissions.
