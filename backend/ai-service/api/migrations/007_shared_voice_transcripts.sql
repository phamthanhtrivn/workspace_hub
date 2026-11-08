BEGIN;
LOCK TABLE notebook_ai.voice_transcripts IN ACCESS EXCLUSIVE MODE;

-- Preserve the best existing result when several readers transcribed one attachment.
WITH ranked AS (
  SELECT run_id, row_number() OVER (
    PARTITION BY media_id, chat_type
    ORDER BY CASE status
      WHEN 'COMPLETED' THEN 0 WHEN 'RUNNING' THEN 1 WHEN 'QUEUED' THEN 2 ELSE 3 END,
      updated_at DESC, run_id
  ) AS position
  FROM notebook_ai.voice_transcripts
)
DELETE FROM notebook_ai.voice_transcripts AS transcript
USING ranked
WHERE transcript.run_id = ranked.run_id AND ranked.position > 1;

ALTER TABLE notebook_ai.voice_transcripts DROP CONSTRAINT voice_transcripts_pkey;
ALTER TABLE notebook_ai.voice_transcripts ADD PRIMARY KEY (media_id, chat_type);
COMMIT;
