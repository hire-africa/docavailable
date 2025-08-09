-- Fix Subscription Table - Run Missing Migrations
-- This script adds all missing columns to the subscriptions table

-- Migration: 2025_07_15_000012_add_text_sessions_to_subscriptions_table.php
-- Add text_sessions_remaining and appointments_remaining columns
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS text_sessions_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointments_remaining INTEGER DEFAULT 0;

-- Migration: 2025_07_18_143314_add_voice_video_fields_to_subscriptions_table.php
-- Add voice and video call related columns
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS voice_calls_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_calls_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_voice_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_video_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS plan_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migration: 2025_07_19_100108_add_missing_subscription_columns.php
-- Add total_text_sessions column
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS total_text_sessions INTEGER DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON subscriptions(is_active);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;

-- Show current subscription table structure
\d subscriptions; 