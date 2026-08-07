-- The default database (workspace_hub) is created by POSTGRES_DB in docker-compose.yml.
-- These databases are used by the other services in the shared PostgreSQL instance.
SELECT 'CREATE DATABASE project_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'project_db')\gexec
SELECT 'CREATE DATABASE user_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'user_db')\gexec
SELECT 'CREATE DATABASE notification_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notification_db')\gexec
SELECT 'CREATE DATABASE communication_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'communication_db')\gexec
SELECT 'CREATE DATABASE document_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'document_db')\gexec
