-- Keep the historical default for a retired field without deleting legacy preferences.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'account_settings'
          AND column_name = 'allow_search_by_email'
    ) THEN
        ALTER TABLE account_settings ALTER COLUMN allow_search_by_email SET DEFAULT true;
    END IF;
END $$;
