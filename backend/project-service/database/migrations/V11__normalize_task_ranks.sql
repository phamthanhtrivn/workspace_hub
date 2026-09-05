-- Preserve numeric task ranks under VARCHAR ordering, including existing data.
UPDATE tasks SET rank = LPAD(rank, 20, '0')
WHERE rank ~ '^[0-9]+$' AND LENGTH(rank) < 20;
