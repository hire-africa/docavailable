-- Add voice calls to user's subscription directly in the database
-- This will add 10 voice calls and 5 video calls to user ID 1

-- First, let's check the current subscription
SELECT 
    id,
    user_id,
    voice_calls_remaining,
    video_calls_remaining,
    text_sessions_remaining,
    created_at,
    updated_at
FROM subscriptions 
WHERE user_id = 1;

-- Update the subscription to add voice and video calls
UPDATE subscriptions 
SET 
    voice_calls_remaining = voice_calls_remaining + 10,
    video_calls_remaining = video_calls_remaining + 5,
    updated_at = NOW()
WHERE user_id = 1;

-- Verify the update
SELECT 
    id,
    user_id,
    voice_calls_remaining,
    video_calls_remaining,
    text_sessions_remaining,
    created_at,
    updated_at
FROM subscriptions 
WHERE user_id = 1;
