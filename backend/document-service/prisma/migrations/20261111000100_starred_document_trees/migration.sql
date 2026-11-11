BEGIN;

ALTER TABLE document_items ADD COLUMN is_starred boolean NOT NULL DEFAULT false;

-- Existing starred folders bring their complete personal tree into Starred.
WITH RECURSIVE starred_tree AS (
  SELECT d.id, d.owner_user_id FROM document_items d
  JOIN user_starred_documents s ON s.document_item_id = d.id AND s.user_id = d.owner_user_id
  WHERE d.project_id IS NULL
  UNION
  SELECT c.id, c.owner_user_id FROM document_items c
  JOIN starred_tree p ON c.parent_folder_id = p.id AND c.owner_user_id = p.owner_user_id
  WHERE c.project_id IS NULL
)
UPDATE document_items SET is_starred = true WHERE id IN (SELECT id FROM starred_tree);

DROP INDEX document_items_active_personal_root_name_unique;
CREATE UNIQUE INDEX document_items_active_personal_root_name_unique
  ON document_items (owner_user_id, is_starred, lower(name))
  WHERE is_archived = false AND parent_folder_id IS NULL AND project_id IS NULL;

-- Fail without changing data if detaching legacy stars would cause a root name conflict.
-- Descendants of starred folders keep their parent; standalone stars leave My Files.
UPDATE document_items d SET parent_folder_id = NULL
WHERE d.is_starred AND d.parent_folder_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_items p WHERE p.id = d.parent_folder_id AND p.is_starred);

INSERT INTO user_starred_documents (id, user_id, document_item_id, created_at)
SELECT gen_random_uuid(), owner_user_id, id, NOW() FROM document_items WHERE is_starred
ON CONFLICT (user_id, document_item_id) DO NOTHING;

COMMIT;
