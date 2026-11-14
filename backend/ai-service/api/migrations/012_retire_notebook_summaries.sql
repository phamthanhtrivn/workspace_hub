UPDATE notebook_ai.artifacts
SET status='CANCELLED', in_flight=false, updated_at=now()
WHERE kind IN ('OVERVIEW','SUMMARY') AND status IN ('QUEUED','RUNNING');
