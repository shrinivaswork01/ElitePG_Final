ALTER TABLE tasks ADD COLUMN complaint_id uuid REFERENCES complaints(id) ON DELETE CASCADE;
