BEGIN;
SELECT pg_advisory_xact_lock(8087001);
ALTER TABLE notebook_ai.work_assistant_sessions ADD COLUMN IF NOT EXISTS context_type text;
-- Legacy personal conversations could contain several page scopes. Keep them in
-- Dashboard only; never copy potentially mixed history into another context.
UPDATE notebook_ai.work_assistant_sessions
 SET context_type=CASE WHEN project_id IS NULL THEN 'dashboard' ELSE 'project_detail' END
 WHERE context_type IS NULL;
ALTER TABLE notebook_ai.work_assistant_sessions ALTER COLUMN context_type SET NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='notebook_ai.work_assistant_sessions'::regclass AND conname='work_assistant_context_valid') THEN
  ALTER TABLE notebook_ai.work_assistant_sessions ADD CONSTRAINT work_assistant_context_valid CHECK (
   (context_type IN ('dashboard','projects','calendar') AND project_id IS NULL)
   OR (context_type='project_detail' AND project_id IS NOT NULL)
  );
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS work_assistant_context_list
 ON notebook_ai.work_assistant_sessions(owner_id,context_type,project_id,updated_at DESC,id DESC);
COMMIT;
