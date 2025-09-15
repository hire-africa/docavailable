-- Check Database Schema - Identify Missing Columns
-- This script checks what columns exist in the subscriptions table

-- Check if subscriptions table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions'
) as table_exists;

-- Show current subscription table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for specific missing columns
SELECT 
    'text_sessions_remaining' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'text_sessions_remaining'
    ) as exists
UNION ALL
SELECT 
    'appointments_remaining' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'appointments_remaining'
    ) as exists
UNION ALL
SELECT 
    'voice_calls_remaining' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'voice_calls_remaining'
    ) as exists
UNION ALL
SELECT 
    'video_calls_remaining' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'video_calls_remaining'
    ) as exists
UNION ALL
SELECT 
    'total_text_sessions' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'total_text_sessions'
    ) as exists
UNION ALL
SELECT 
    'total_voice_calls' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'total_voice_calls'
    ) as exists
UNION ALL
SELECT 
    'total_video_calls' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'total_video_calls'
    ) as exists
UNION ALL
SELECT 
    'plan_name' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'plan_name'
    ) as exists
UNION ALL
SELECT 
    'plan_price' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'plan_price'
    ) as exists
UNION ALL
SELECT 
    'plan_currency' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'plan_currency'
    ) as exists
UNION ALL
SELECT 
    'activated_at' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'activated_at'
    ) as exists
UNION ALL
SELECT 
    'expires_at' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'expires_at'
    ) as exists
UNION ALL
SELECT 
    'is_active' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'is_active'
    ) as exists;

-- Check payment_transactions table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'payment_transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position; 