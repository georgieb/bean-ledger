-- Run this SQL in your Supabase SQL Editor
-- Go to: https://app.supabase.com/project/kefauqxsdugtbpyrvswp/sql

CREATE TABLE scheduled_roasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coffee_name text NOT NULL,
    green_coffee_name text NOT NULL,
    scheduled_date date NOT NULL,
    green_weight numeric(8, 2) NOT NULL,
    target_roast_level text NOT NULL,
    equipment_id uuid,
    notes text,
    priority text DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    completed boolean DEFAULT false NOT NULL,
    completed_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_scheduled_roasts_user_id ON scheduled_roasts(user_id);
CREATE INDEX idx_scheduled_roasts_scheduled_date ON scheduled_roasts(scheduled_date);
CREATE INDEX idx_scheduled_roasts_incomplete ON scheduled_roasts(user_id, completed, scheduled_date) WHERE completed = false;

-- Enable RLS (Row Level Security)
ALTER TABLE scheduled_roasts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own scheduled roasts" 
ON scheduled_roasts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled roasts" 
ON scheduled_roasts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled roasts" 
ON scheduled_roasts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled roasts" 
ON scheduled_roasts FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_scheduled_roasts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_scheduled_roasts_updated_at
    BEFORE UPDATE ON scheduled_roasts
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_roasts_updated_at();