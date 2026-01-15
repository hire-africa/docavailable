/**
 * Session Creation Service
 * 
 * Reusable service for creating instant "Talk Now" sessions (text or call).
 * 
 * Architecture:
 * - Thin orchestration wrapper around existing HTTP calls only
 * - No side effects: does not connect sockets, start billing, trigger payouts, or alter lifecycle
 * - Headless: no UI side effects (no router.push, modals, alerts)
 * - Preserves exact request shapes for compatibility
 * 
 * This service extracts common session creation logic while preserving identical behavior
 * to the existing implementation.
 */

import { environment } from '../config/environment';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SessionType = 'text' | 'call';
export type CallType = 'voice' | 'video';
export type SessionSource = 'INSTANT' | 'APPOINTMENT';

export interface CreateSessionParams {
  type: SessionType;
  doctorId: number;
  reason?: string;
  callType?: CallType; // Required for type === 'call'
  source: SessionSource; // Accepted but not sent to backend yet (to avoid behavior change)
}

export interface TextSessionResult {
  success: true;
  sessionId: number;
  chatId: string; // Computed as text_session_${sessionId}
  rawResponseData: any; // Passthrough to avoid behavioral differences
}

export interface CallSessionResult {
  success: true;
  appointmentId: string; // The generated direct_session_* string or API-returned appointment_id
  rawResponseData: any; // Passthrough to avoid behavioral differences
}

export interface SessionCreationError {
  success: false;
  status: number;
  message: string;
  body?: any; // Full error response body
}

export type CreateSessionResult = TextSessionResult | CallSessionResult | SessionCreationError;

/**
 * Create a session (text or call) for instant "Talk Now" functionality.
 * 
 * This is a pure orchestration wrapper that:
 * - Makes the exact same HTTP calls as current implementations
 * - Preserves request body shapes exactly
 * - Returns structured results for callers to handle UI/navigation
 * 
 * @param params - Session creation parameters
 * @returns Structured result with session identifiers or error details
 */
export async function createSession(params: CreateSessionParams): Promise<CreateSessionResult> {
  const { type, doctorId, reason, callType, source } = params;

  // Validation
  if (!doctorId || doctorId <= 0) {
    return {
      success: false,
      status: 400,
      message: 'Invalid doctor ID',
    };
  }

  if (type === 'call' && !callType) {
    return {
      success: false,
      status: 400,
      message: 'callType is required for call sessions',
    };
  }

  // Get auth token
  let token: string | null = null;
  try {
    token = await AsyncStorage.getItem('auth_token');
  } catch (error) {
    console.error('❌ [SessionCreationService] Failed to get auth token:', error);
    return {
      success: false,
      status: 401,
      message: 'Authentication required',
    };
  }

  if (!token) {
    return {
      success: false,
      status: 401,
      message: 'Authentication required',
    };
  }

  try {
    if (type === 'text') {
      // Text session: POST /api/text-sessions/start
      // Request shape: { doctor_id, reason? } (reason only if provided)
      const requestBody: any = {
        doctor_id: doctorId,
      };

      // Only include reason if provided (preserves exact behavior)
      if (reason !== undefined && reason !== null && reason.trim() !== '') {
        requestBody.reason = reason;
      }

      console.log('📱 [SessionCreationService] Creating text session:', {
        doctorId,
        hasReason: !!reason,
        source, // Logged but not sent to backend
      });

      const response = await fetch(`${environment.LARAVEL_API_URL}/api/text-sessions/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [SessionCreationService] Text session creation failed:', {
          status: response.status,
          message: data.message || 'Failed to start text session',
        });

        return {
          success: false,
          status: response.status,
          message: data.message || 'Failed to start text session',
          body: data,
        };
      }

      // Extract session_id from response (preserves exact field names)
      const sessionId = data.data?.session_id || data.data?.id;
      if (!sessionId) {
        console.error('❌ [SessionCreationService] No session_id in response:', data);
        return {
          success: false,
          status: 500,
          message: 'Invalid response: missing session_id',
          body: data,
        };
      }

      // Compute chatId as text_session_${sessionId} (matches current call sites)
      const chatId = `text_session_${sessionId}`;

      console.log('✅ [SessionCreationService] Text session created:', {
        sessionId,
        chatId,
      });

      return {
        success: true,
        sessionId: Number(sessionId),
        chatId,
        rawResponseData: data, // Passthrough for caller compatibility
      };
    } else {
      // Call session: POST /api/call-sessions/start
      // Request shape: { call_type: 'voice'|'video', appointment_id: direct_session_${Date.now()}, doctor_id, reason? }
      
      // Generate appointment_id exactly as current implementations do
      const appointmentId = `direct_session_${Date.now()}`;

      const requestBody: any = {
        call_type: callType === 'audio' ? 'voice' : callType, // Backend expects 'voice' not 'audio'
        appointment_id: appointmentId,
        doctor_id: doctorId,
      };

      // Only include reason if provided (preserves exact behavior)
      if (reason !== undefined && reason !== null && reason.trim() !== '') {
        requestBody.reason = reason;
      }

      console.log('📞 [SessionCreationService] Creating call session:', {
        callType,
        appointmentId,
        doctorId,
        hasReason: !!reason,
        source, // Logged but not sent to backend
      });

      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [SessionCreationService] Call session creation failed:', {
          status: response.status,
          message: data.message || 'Failed to start call session',
        });

        return {
          success: false,
          status: response.status,
          message: data.message || 'Failed to start call session',
          body: data,
        };
      }

      // Use API-returned appointment_id if available, otherwise use the generated one
      const finalAppointmentId = data.data?.appointment_id || appointmentId;

      console.log('✅ [SessionCreationService] Call session created:', {
        appointmentId: finalAppointmentId,
        callType,
      });

      return {
        success: true,
        appointmentId: finalAppointmentId,
        rawResponseData: data, // Passthrough for caller compatibility
      };
    }
  } catch (error: any) {
    console.error('❌ [SessionCreationService] Error creating session:', error);

    return {
      success: false,
      status: error.status || 500,
      message: error.message || 'Network error occurred',
      body: error,
    };
  }
}
