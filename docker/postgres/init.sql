-- Runs once, when the postgres-data volume is first created.
-- The image already creates fpa_events (POSTGRES_DB); this adds the
-- integration-test database. The test helpers refuse names without "test".
CREATE DATABASE fpa_events_test;
