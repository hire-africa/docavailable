/**
 * Session Context Types
 * 
 * Implements the architecture decision: Use context_type and context_id envelope
 * for all real-time channels (WebRTC, WebSocket, etc.)
 */

export type ContextType = 'text_session' | 'call_session' | 'appointment';

export interface SessionContext {
  context_type: ContextType;
  context_id: number;
}

/**
 * Convert context to a standardized string format for routing
 * Format: "{context_type}:{context_id}"
 */
export function contextToString(context: SessionContext): string {
  return `${context.context_type}:${context.context_id}`;
}

/**
 * Parse a context string back to SessionContext
 * Format: "{context_type}:{context_id}"
 */
export function parseContextString(contextString: string): SessionContext | null {
  const parts = contextString.split(':');
  if (parts.length !== 2) {
    return null;
  }
  
  const [context_type, context_id_str] = parts;
  const context_id = parseInt(context_id_str, 10);
  
  if (isNaN(context_id) || !['text_session', 'call_session', 'appointment'].includes(context_type)) {
    return null;
  }
  
  return {
    context_type: context_type as ContextType,
    context_id
  };
}

/**
 * Response from POST /appointments/{id}/start-session
 */
export interface StartSessionResponse {
  success: boolean;
  context_type: ContextType;
  context_id: number;
  session?: {
    id: number;
    status: string;
    started_at?: string;
  };
  message?: string;
}
