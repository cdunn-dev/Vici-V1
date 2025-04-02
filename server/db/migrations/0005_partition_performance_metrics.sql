-- Create a new partitioned table
CREATE TABLE performance_metrics_partitioned (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id),
    workout_id UUID NOT NULL REFERENCES workouts(id),
    metric_type TEXT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    deleted_by INTEGER REFERENCES users(id),
    version INTEGER DEFAULT 1,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,
    archived_by INTEGER REFERENCES users(id)
) PARTITION BY RANGE (recorded_at);

-- Create partitions for the last 12 months and next 12 months
DO $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Create partitions for past months
    FOR i IN -12..12 LOOP
        partition_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
        partition_name := 'performance_metrics_' || to_char(partition_date, 'YYYY_MM');
        start_date := partition_date;
        end_date := partition_date + interval '1 month';
        
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF performance_metrics_partitioned
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

-- Create indexes on the partitioned table
CREATE INDEX idx_performance_metrics_partitioned_user_id ON performance_metrics_partitioned(user_id);
CREATE INDEX idx_performance_metrics_partitioned_workout_id ON performance_metrics_partitioned(workout_id);
CREATE INDEX idx_performance_metrics_partitioned_metric_type ON performance_metrics_partitioned(metric_type);
CREATE INDEX idx_performance_metrics_partitioned_recorded_at ON performance_metrics_partitioned(recorded_at);
CREATE INDEX idx_performance_metrics_partitioned_deleted_at ON performance_metrics_partitioned(deleted_at);
CREATE INDEX idx_performance_metrics_partitioned_is_archived ON performance_metrics_partitioned(is_archived);

-- Copy data from the old table to the new partitioned table
INSERT INTO performance_metrics_partitioned
SELECT * FROM performance_metrics;

-- Drop the old table and rename the new one
DROP TABLE performance_metrics;
ALTER TABLE performance_metrics_partitioned RENAME TO performance_metrics;

-- Create a function to automatically create new partitions
CREATE OR REPLACE FUNCTION create_performance_metrics_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Create partition for next month if it doesn't exist
    partition_date := date_trunc('month', CURRENT_DATE + interval '13 months');
    partition_name := 'performance_metrics_' || to_char(partition_date, 'YYYY_MM');
    start_date := partition_date;
    end_date := partition_date + interval '1 month';
    
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF performance_metrics
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to create new partitions monthly
SELECT cron.schedule(
    'create-performance-metrics-partition',
    '0 0 1 * *',  -- Run at midnight on the first day of each month
    'SELECT create_performance_metrics_partition()'
); 