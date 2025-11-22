-- Insert a test user
INSERT INTO users (id, name, email, password, role, created_at, updated_at)
VALUES ('user-test-123', 'Test User', 'test@example.com', 'hashed_password', 'admin', unixepoch(), unixepoch());

-- Insert some test events
INSERT INTO events (id, user_id, name, start_date, end_date, location, description, created_at, updated_at)
VALUES
  ('event-1', 'user-test-123', 'Summer BBQ 2024', unixepoch('2024-07-15 18:00:00'), unixepoch('2024-07-15 22:00:00'), 'Central Park', 'Join us for a fun summer barbecue with friends and family!', unixepoch(), unixepoch()),
  ('event-2', 'user-test-123', 'Tech Conference 2024', unixepoch('2024-09-20 09:00:00'), unixepoch('2024-09-22 17:00:00'), 'Convention Center Downtown', 'Annual technology conference featuring the latest in web development and AI.', unixepoch(), unixepoch()),
  ('event-3', 'user-test-123', 'Holiday Party', unixepoch('2024-12-20 19:00:00'), unixepoch('2024-12-20 23:00:00'), '123 Main St', 'Celebrate the holidays with coworkers and friends. Food and drinks provided!', unixepoch(), unixepoch());
