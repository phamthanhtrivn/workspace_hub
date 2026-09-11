# Fix project permissions

- [x] Add regression tests for public access, archived writes, and inherited sprint changes.
- [x] Remove `PUBLIC` visibility and migrate legacy public projects to `MEMBERS_ONLY`.
- [x] Make archived projects read-only while preserving the owner restore flow.
- [x] Allow task creators to create inside planned sprints; require sprint-management permission only when moving existing tasks across sprints.
- [x] Let active assignees view task details, manage checklists, comment, and move their assigned tasks by updating status/rank without granting full task-edit or sprint-management permission.
- [x] Align member creation defaults and restrict direct member addition to the owner.
- [x] Hide task creation actions in the frontend when permission is absent.
- [x] Run backend/frontend tests, lint, type checks, and review the final diff. Full builds remain blocked by active Windows file locks; no-emit type checks passed for changed code.
