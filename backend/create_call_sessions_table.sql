-- Create call_sessions table
CREATE TABLE call_sessions (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    call_type VARCHAR(255) NOT NULL CHECK (call_type IN ('voice', 'video')),
    appointment_id VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'connecting' CHECK (status IN ('active', 'ended', 'expired', 'waiting_for_doctor', 'connecting')),
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP NOT NULL,
    reason TEXT NULL,
    sessions_used INTEGER NOT NULL DEFAULT 1,
    sessions_remaining_before_start INTEGER NOT NULL,
    is_connected BOOLEAN NOT NULL DEFAULT false,
    call_duration INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_call_sessions_patient_id FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_sessions_doctor_id FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX call_sessions_appointment_id_index ON call_sessions (appointment_id);
CREATE INDEX call_sessions_patient_id_status_index ON call_sessions (patient_id, status);
CREATE INDEX call_sessions_doctor_id_status_index ON call_sessions (doctor_id, status);
CREATE INDEX call_sessions_call_type_status_index ON call_sessions (call_type, status);
CREATE INDEX call_sessions_last_activity_at_index ON call_sessions (last_activity_at);
