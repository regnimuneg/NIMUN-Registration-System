-- Speeds up scanner reads and tracking updates that repeatedly filter by user/type
-- and then order or narrow by activity time.

CREATE INDEX IF NOT EXISTS idx_activity_user_type_created
ON activity_timeline(user_id, activity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_user_type_title_created
ON activity_timeline(user_id, activity_type, title, created_at DESC);
