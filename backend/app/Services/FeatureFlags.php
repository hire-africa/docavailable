<?php

namespace App\Services;

/**
 * Feature Flags Service
 * 
 * Environment-based feature flags for gradual rollout of session-gated architecture.
 * 
 * Usage:
 * - Set flags in .env file
 * - Defaults to false (safe, non-breaking)
 * - Can be toggled per environment without code changes
 */
class FeatureFlags
{
    /**
     * Check if session-gated chat enforcement is enabled
     * 
     * When enabled: Blocks appointment-based chat when session_id exists
     * When disabled: Allows legacy appointment-based chat (with warnings)
     */
    public static function enforceSessionGatedChat(): bool
    {
        return env('ENFORCE_SESSION_GATED_CHAT', false) === true || env('ENFORCE_SESSION_GATED_CHAT', 'false') === 'true';
    }

    /**
     * Check if session-gated billing enforcement is enabled
     * 
     * When enabled: Blocks appointment-based billing when session_id exists
     * When disabled: Allows legacy appointment-based billing (with warnings)
     */
    public static function enforceSessionGatedBilling(): bool
    {
        return env('ENFORCE_SESSION_GATED_BILLING', false) === true || env('ENFORCE_SESSION_GATED_BILLING', 'false') === 'true';
    }

    /**
     * Check if legacy appointment triggers should be disabled
     * 
     * When enabled: Disables ProcessAppointmentSessions and ActivateBookedAppointments
     * When disabled: Allows legacy triggers to run (with session_id filtering)
     */
    public static function disableLegacyAppointmentTriggers(): bool
    {
        return env('DISABLE_LEGACY_APPOINTMENT_TRIGGERS', false) === true || env('DISABLE_LEGACY_APPOINTMENT_TRIGGERS', 'false') === 'true';
    }

    /**
     * Check if legacy appointment chat should be allowed (temporary compatibility)
     * 
     * When enabled: Allows appointment-based chat even when session_id is null (waiting state)
     * When disabled: Blocks appointment-based chat when session_id is null
     */
    public static function allowLegacyAppointmentChat(): bool
    {
        return env('ALLOW_LEGACY_APPOINTMENT_CHAT', false) === true || env('ALLOW_LEGACY_APPOINTMENT_CHAT', 'false') === 'true';
    }
}
