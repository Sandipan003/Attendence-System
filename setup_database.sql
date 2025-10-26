-- Modern Class Attendance System - Database Setup
-- Run this script in your Supabase SQL Editor

-- Step 1: Create the attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    browser_fingerprint TEXT,
    is_duplicate BOOLEAN DEFAULT FALSE,
    is_manually_edited BOOLEAN DEFAULT FALSE,
    edited_by TEXT,
    edited_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Create the timeslot table
CREATE TABLE IF NOT EXISTS timeslot (
    id INTEGER PRIMARY KEY DEFAULT 1,
    start_hour INTEGER NOT NULL,
    start_minute INTEGER NOT NULL,
    end_hour INTEGER NOT NULL,
    end_minute INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Insert default time slot (8:30 PM - 9:30 PM IST for testing)
INSERT INTO timeslot (id, start_hour, start_minute, end_hour, end_minute) 
VALUES (1, 20, 30, 21, 30)
ON CONFLICT (id) DO UPDATE SET
    start_hour = EXCLUDED.start_hour,
    start_minute = EXCLUDED.start_minute,
    end_hour = EXCLUDED.end_hour,
    end_minute = EXCLUDED.end_minute,
    updated_at = CURRENT_TIMESTAMP;

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeslot ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for attendance table
CREATE POLICY "Allow anonymous insert on attendance"
ON attendance FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous select on attendance"
ON attendance FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous update on attendance"
ON attendance FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anonymous delete on attendance"
ON attendance FOR DELETE TO anon USING (true);

-- Step 6: Create RLS policies for timeslot table
CREATE POLICY "Allow anonymous select on timeslot"
ON timeslot FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous update on timeslot"
ON timeslot FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anonymous insert on timeslot"
ON timeslot FOR INSERT TO anon WITH CHECK (true);

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_roll_number ON attendance("rollNumber");

-- Step 8: Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 9: Verify the setup
SELECT 'Database setup completed successfully!' as status;

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('attendance', 'timeslot');

-- Check if time slot is set
SELECT * FROM timeslot;
