-- Add common fields to all tables
ALTER TABLE users
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN created_by INTEGER REFERENCES users(id),
ADD COLUMN updated_by INTEGER REFERENCES users(id),
ADD COLUMN deleted_by INTEGER REFERENCES users(id),
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN archived_by INTEGER REFERENCES users(id);

ALTER TABLE runner_profiles
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN created_by INTEGER REFERENCES users(id),
ADD COLUMN updated_by INTEGER REFERENCES users(id),
ADD COLUMN deleted_by INTEGER REFERENCES users(id),
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN archived_by INTEGER REFERENCES users(id);

ALTER TABLE training_plans
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN created_by INTEGER REFERENCES users(id),
ADD COLUMN updated_by INTEGER REFERENCES users(id),
ADD COLUMN deleted_by INTEGER REFERENCES users(id),
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN archived_by INTEGER REFERENCES users(id);

ALTER TABLE workout_templates
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN created_by INTEGER REFERENCES users(id),
ADD COLUMN updated_by INTEGER REFERENCES users(id),
ADD COLUMN deleted_by INTEGER REFERENCES users(id),
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN archived_by INTEGER REFERENCES users(id);

ALTER TABLE workouts
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN created_by INTEGER REFERENCES users(id),
ADD COLUMN updated_by INTEGER REFERENCES users(id),
ADD COLUMN deleted_by INTEGER REFERENCES users(id),
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN archived_by INTEGER REFERENCES users(id);

ALTER TABLE performance_metrics
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN created_by INTEGER REFERENCES users(id),
ADD COLUMN updated_by INTEGER REFERENCES users(id),
ADD COLUMN deleted_by INTEGER REFERENCES users(id),
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN archived_by INTEGER REFERENCES users(id);

ALTER TABLE workout_notes
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN created_by INTEGER REFERENCES users(id),
ADD COLUMN updated_by INTEGER REFERENCES users(id),
ADD COLUMN deleted_by INTEGER REFERENCES users(id),
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN archived_by INTEGER REFERENCES users(id);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  changes JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create indexes for soft delete and archival
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_is_archived ON users(is_archived);
CREATE INDEX idx_runner_profiles_deleted_at ON runner_profiles(deleted_at);
CREATE INDEX idx_runner_profiles_is_archived ON runner_profiles(is_archived);
CREATE INDEX idx_training_plans_deleted_at ON training_plans(deleted_at);
CREATE INDEX idx_training_plans_is_archived ON training_plans(is_archived);
CREATE INDEX idx_workout_templates_deleted_at ON workout_templates(deleted_at);
CREATE INDEX idx_workout_templates_is_archived ON workout_templates(is_archived);
CREATE INDEX idx_workouts_deleted_at ON workouts(deleted_at);
CREATE INDEX idx_workouts_is_archived ON workouts(is_archived);
CREATE INDEX idx_performance_metrics_deleted_at ON performance_metrics(deleted_at);
CREATE INDEX idx_performance_metrics_is_archived ON performance_metrics(is_archived);
CREATE INDEX idx_workout_notes_deleted_at ON workout_notes(deleted_at);
CREATE INDEX idx_workout_notes_is_archived ON workout_notes(is_archived); 