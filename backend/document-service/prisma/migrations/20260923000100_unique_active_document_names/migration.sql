CREATE UNIQUE INDEX IF NOT EXISTS document_items_active_child_name_unique
  ON document_items (parent_folder_id, lower(name))
  WHERE is_archived = false AND parent_folder_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS document_items_active_personal_root_name_unique
  ON document_items (owner_user_id, lower(name))
  WHERE is_archived = false AND parent_folder_id IS NULL AND project_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS document_items_active_project_root_name_unique
  ON document_items (project_id, lower(name))
  WHERE is_archived = false AND parent_folder_id IS NULL AND project_id IS NOT NULL;
