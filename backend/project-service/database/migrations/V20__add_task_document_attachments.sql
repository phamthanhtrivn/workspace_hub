CREATE TABLE IF NOT EXISTS task_document_attachments (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    project_id UUID NOT NULL,
    document_item_id UUID NOT NULL,
    source VARCHAR(30) NOT NULL,
    name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    attached_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_task_document_attachments_task_project
        FOREIGN KEY (task_id, project_id) REFERENCES tasks (id, project_id) ON DELETE CASCADE,
    CONSTRAINT uk_task_document_attachments_task_document
        UNIQUE (task_id, document_item_id),
    CONSTRAINT chk_task_document_attachments_source
        CHECK (source IN ('DEVICE_UPLOAD', 'MY_FILES', 'PROJECT_DOCUMENT'))
);

CREATE INDEX IF NOT EXISTS idx_task_document_attachments_project_created
    ON task_document_attachments (project_id, created_at);

CREATE INDEX IF NOT EXISTS idx_task_document_attachments_document
    ON task_document_attachments (document_item_id);
