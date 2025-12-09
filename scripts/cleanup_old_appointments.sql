-- Clean up old appointments that may have timezone issues
-- This will delete appointments that are older than today or have invalid data

-- Delete appointments that are in the past (older than today)
DELETE FROM appointments 
WHERE appointment_date < CURDATE() 
   OR (appointment_date = CURDATE() AND appointment_time < CURTIME());

-- Delete appointments with status 0 (pending) that are very old
DELETE FROM appointments 
WHERE status = 0 
  AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Delete appointments that don't have appointment_type set
DELETE FROM appointments 
WHERE appointment_type IS NULL 
   OR appointment_type = '';

-- Show remaining appointments count
SELECT COUNT(*) as remaining_appointments FROM appointments;
