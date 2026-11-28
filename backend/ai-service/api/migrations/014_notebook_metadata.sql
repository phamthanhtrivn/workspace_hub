BEGIN;
ALTER TABLE notebook_ai.notebooks
  ADD COLUMN description varchar(1000) NOT NULL DEFAULT '',
  ADD COLUMN category varchar(50) NOT NULL DEFAULT '',
  ADD COLUMN color_theme varchar(16) NOT NULL DEFAULT 'navy'
    CHECK (color_theme IN ('navy', 'ocean', 'sky', 'emerald'));
COMMIT;
