-- Allow bus tracking entries in the activity timeline.
-- Safe to run multiple times.

ALTER TABLE activity_timeline
  DROP CONSTRAINT IF EXISTS activity_timeline_activity_type_check;

ALTER TABLE activity_timeline
  ADD CONSTRAINT activity_timeline_activity_type_check
  CHECK (activity_type IN ('attendance', 'food', 'voucher', 'game', 'award', 'other', 'bus'));
