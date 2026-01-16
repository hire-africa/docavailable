<?php

namespace App\Services;

use App\Models\TextSession;
use App\Models\CallSession;
use App\Models\Appointment;
use Illuminate\Support\Facades\Log;

/**
 * Session Context Guard
 * 
 * Defense-in-depth guardrails to ensure billing and chat cannot start
 * without verified real session context.
 * 
 * Architecture:
 * - Canonical "session context" rule: Only text_session_* or call_session records
 * - Chat/WebSocket guardrail: Require session-derived identity
 * - Billing guardrail: Only accept session identifiers or session records
 */
class SessionContextGuard
{
    /**
     * Validate that an identifier represents a real session context
     * 
     * Canonical "session context" rule:
     * - Text: text_session_* (or future text_session:{id})
     * - Call: call_session record (even if routed by direct_session_* today)
     * 
     * The system must not interpret a plain appointment id as permission
     * to start "live" behaviors.
     * 
     * @param string|int $identifier Appointment ID, text_session_*, or call_session ID
     * @return array ['is_valid' => bool, 'session_type' => 'text_session'|'call_session'|null, 'session_id' => int|null, 'reason' => string|null]
     */
    public static function validateSessionContext($identifier): array
    {
        $identifierStr = (string) $identifier;
        
        // Check if it's a text session identifier
        if (strpos($identifierStr, 'text_session_') === 0 || strpos($identifierStr, 'text_session:') === 0) {
            $sessionId = (int) str_replace(['text_session_', 'text_session:'], '', $identifierStr);
            
            // Verify session exists and is active
            $session = TextSession::find($sessionId);
            if (!$session) {
                return [
                    'is_valid' => false,
                    'session_type' => null,
                    'session_id' => null,
                    'reason' => 'text_session_not_found',
                ];
            }
            
            if (!in_array($session->status, [TextSession::STATUS_ACTIVE, TextSession::STATUS_WAITING_FOR_DOCTOR])) {
                return [
                    'is_valid' => false,
                    'session_type' => null,
                    'session_id' => null,
                    'reason' => 'text_session_not_active',
                    'current_status' => $session->status,
                ];
            }
            
            return [
                'is_valid' => true,
                'session_type' => 'text_session',
                'session_id' => $sessionId,
                'reason' => null,
            ];
        }

        if (strpos($identifierStr, 'call_session_') === 0 || strpos($identifierStr, 'call_session:') === 0) {
            $sessionId = (int) str_replace(['call_session_', 'call_session:'], '', $identifierStr);

            $callSession = CallSession::find($sessionId);
            if (!$callSession) {
                return [
                    'is_valid' => false,
                    'session_type' => null,
                    'session_id' => null,
                    'reason' => 'call_session_not_found',
                ];
            }

            if (!in_array($callSession->status, [
                CallSession::STATUS_ACTIVE,
                CallSession::STATUS_CONNECTING,
                CallSession::STATUS_WAITING_FOR_DOCTOR,
                CallSession::STATUS_ANSWERED,
            ])) {
                return [
                    'is_valid' => false,
                    'session_type' => null,
                    'session_id' => null,
                    'reason' => 'call_session_not_active',
                    'current_status' => $callSession->status,
                ];
            }

            return [
                'is_valid' => true,
                'session_type' => 'call_session',
                'session_id' => $sessionId,
                'reason' => null,
            ];
        }
        
        // Check if it's a call session ID (numeric)
        if (is_numeric($identifierStr)) {
            $sessionId = (int) $identifierStr;
            
            // Try to find as call session
            $callSession = CallSession::find($sessionId);
            if ($callSession) {
                if (!in_array($callSession->status, [
                    CallSession::STATUS_ACTIVE,
                    CallSession::STATUS_CONNECTING,
                    CallSession::STATUS_WAITING_FOR_DOCTOR,
                    CallSession::STATUS_ANSWERED,
                ])) {
                    return [
                        'is_valid' => false,
                        'session_type' => null,
                        'session_id' => null,
                        'reason' => 'call_session_not_active',
                        'current_status' => $callSession->status,
                    ];
                }
                
                return [
                    'is_valid' => true,
                    'session_type' => 'call_session',
                    'session_id' => $sessionId,
                    'reason' => null,
                ];
            }
            
            // Check if it's a text session ID (numeric, not prefixed)
            $textSession = TextSession::find($sessionId);
            if ($textSession) {
                if (!in_array($textSession->status, [TextSession::STATUS_ACTIVE, TextSession::STATUS_WAITING_FOR_DOCTOR])) {
                    return [
                        'is_valid' => false,
                        'session_type' => null,
                        'session_id' => null,
                        'reason' => 'text_session_not_active',
                        'current_status' => $textSession->status,
                    ];
                }
                
                return [
                    'is_valid' => true,
                    'session_type' => 'text_session',
                    'session_id' => $sessionId,
                    'reason' => null,
                ];
            }
        }
        
        // If it's a plain numeric ID that doesn't match any session, it's likely an appointment ID
        // This is NOT a valid session context
        if (is_numeric($identifierStr)) {
            Log::warning('SessionContextGuard: Plain numeric ID detected (likely appointment ID, not session)', [
                'identifier' => $identifierStr,
                'context' => 'validation_failed',
            ]);
            
            return [
                'is_valid' => false,
                'session_type' => null,
                'session_id' => null,
                'reason' => 'appointment_id_not_valid_session_context',
            ];
        }
        
        // Unknown format
        return [
            'is_valid' => false,
            'session_type' => null,
            'session_id' => null,
            'reason' => 'unknown_identifier_format',
        ];
    }

    /**
     * Guardrail: Require session context for chat/WebSocket operations
     * 
     * The signaling/chat layer must require a session-derived identity before allowing:
     * - sending chat messages
     * - session activation events
     * - session-ended events
     * 
     * Appointments may only receive read-only notifications (schedule changes),
     * not "live chat".
     * 
     * @param string|int $identifier
     * @param string $operation 'send_message' | 'activate_session' | 'end_session'
     * @return array ['allowed' => bool, 'reason' => string|null]
     */
    public static function requireSessionContextForChat($identifier, string $operation = 'send_message'): array
    {
        $validation = self::validateSessionContext($identifier);
        
        if (!$validation['is_valid']) {
            Log::warning('SessionContextGuard: Chat operation blocked - invalid session context', [
                'identifier' => $identifier,
                'operation' => $operation,
                'reason' => $validation['reason'],
            ]);
            
            return [
                'allowed' => false,
                'reason' => $validation['reason'] ?? 'invalid_session_context',
            ];
        }
        
        return [
            'allowed' => true,
            'reason' => null,
            'session_type' => $validation['session_type'],
            'session_id' => $validation['session_id'],
        ];
    }

    /**
     * Guardrail: Require session context for billing operations
     * 
     * All billing entrypoints must only accept:
     * - a session identifier, or
     * - data that resolves to an existing session record with session state
     *   proving it is active/connected
     * 
     * @param string|int $identifier
     * @param string $operation 'deduct' | 'credit' | 'process_payment'
     * @return array ['allowed' => bool, 'reason' => string|null, 'session' => mixed|null]
     */
    public static function requireSessionContextForBilling($identifier, string $operation = 'deduct'): array
    {
        $validation = self::validateSessionContext($identifier);
        
        if (!$validation['is_valid']) {
            Log::warning('SessionContextGuard: Billing operation blocked - invalid session context', [
                'identifier' => $identifier,
                'operation' => $operation,
                'reason' => $validation['reason'],
            ]);
            
            return [
                'allowed' => false,
                'reason' => $validation['reason'] ?? 'invalid_session_context',
                'session' => null,
            ];
        }
        
        // For call sessions, also verify connected_at (billing requirement)
        if ($validation['session_type'] === 'call_session') {
            $callSession = CallSession::find($validation['session_id']);
            if (!$callSession || !$callSession->connected_at) {
                Log::warning('SessionContextGuard: Billing operation blocked - call session not connected', [
                    'identifier' => $identifier,
                    'operation' => $operation,
                    'session_id' => $validation['session_id'],
                ]);
                
                return [
                    'allowed' => false,
                    'reason' => 'call_session_not_connected',
                    'session' => null,
                ];
            }
        }
        
        return [
            'allowed' => true,
            'reason' => null,
            'session_type' => $validation['session_type'],
            'session_id' => $validation['session_id'],
        ];
    }

    /**
     * Guardrail: Check if appointment has session_id and warn/refuse legacy billing
     * 
     * Once session_id is populated for new flows, any appointment endpoint that
     * attempts billing should detect session_id != NULL and refuse/redirect logically.
     * 
     * For now, start with logging-only warnings to avoid behavior change.
     * 
     * @param \App\Models\Appointment $appointment
     * @param string $endpointName Name of the endpoint/function attempting billing
     * @return array ['should_proceed' => bool, 'warning' => string|null]
     */
    public static function checkAppointmentBillingGuardrail(Appointment $appointment, string $endpointName): array
    {
        if ($appointment->session_id !== null) {
            Log::warning('SessionContextGuard: Legacy appointment billing attempted on appointment with session_id', [
                'appointment_id' => $appointment->id,
                'session_id' => $appointment->session_id,
                'endpoint' => $endpointName,
                'warning' => 'Billing should come from session completion, not appointment endpoint',
            ]);
            
            // For now, allow but log warning (phased compatibility)
            // TODO: In later phase, return should_proceed=false and redirect to session-based billing
            return [
                'should_proceed' => true, // Allow for now (legacy compatibility)
                'warning' => 'appointment_has_session_id_use_session_billing',
            ];
        }
        
        return [
            'should_proceed' => true,
            'warning' => null,
        ];
    }
}
