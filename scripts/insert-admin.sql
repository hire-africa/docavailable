-- Insert Admin Account Directly into Database
-- Run this script in your database to create the first admin account

INSERT INTO users (
    first_name,
    last_name,
    email,
    password,
    display_name,
    user_type,
    status,
    email_verified_at,
    created_at,
    updated_at
) VALUES (
    'Admin',
    'User',
    'admin@doc.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- This is the hash for '000000009'
    'Admin User',
    'admin',
    'active',
    NOW(),
    NOW(),
    NOW()
);

-- Verify the insertion
SELECT id, first_name, last_name, email, user_type, status, created_at 
FROM users 
WHERE email = 'admin@doc.com'; 