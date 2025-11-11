/**
 * Call Deduplication Service
 * 
 * Prevents multiple incoming call screens from appearing when the same call
 * is received through multiple channels (WebSocket, Firebase, CallKeep, etc.)
 */

interface ActiveCall {
  appointmentId: string;
  callType: 'audio' | 'video';
  timestamp: number;
  source: 'websocket' | 'firebase' | 'callkeep' | 'native';
}

class CallDeduplicationService {
  private activeCalls: Map<string, ActiveCall> = new Map();
  private readonly CALL_TIMEOUT = 30000; // 30 seconds
  private readonly DEBOUNCE_WINDOW = 2000; // 2 seconds - ignore duplicates within this window

  /**
   * Check if a call should be shown or if it's a duplicate
   * @returns true if call should be shown, false if it's a duplicate
   */
  shouldShowCall(
    appointmentId: string,
    callType: 'audio' | 'video',
    source: 'websocket' | 'firebase' | 'callkeep' | 'native'
  ): boolean {
    const callKey = this.getCallKey(appointmentId, callType);
    const now = Date.now();
    const existingCall = this.activeCalls.get(callKey);

    // Check if this exact call is already active
    if (existingCall) {
      const timeSinceCall = now - existingCall.timestamp;
      
      // If call was shown recently (within debounce window), it's a duplicate
      if (timeSinceCall < this.DEBOUNCE_WINDOW) {
        console.log(`🚫 [CallDedup] Duplicate call blocked:`, {
          appointmentId,
          callType,
          source,
          existingSource: existingCall.source,
          timeSinceCall: `${timeSinceCall}ms`,
          reason: 'within_debounce_window'
        });
        return false;
      }
      
      // If call is older than timeout, allow new call (might be a retry)
      if (timeSinceCall > this.CALL_TIMEOUT) {
        console.log(`✅ [CallDedup] Allowing call (previous timed out):`, {
          appointmentId,
          callType,
          source,
          timeSinceCall: `${timeSinceCall}ms`
        });
        this.registerCall(appointmentId, callType, source);
        return true;
      }
      
      // Call is active but not a duplicate (different timing)
      console.log(`⚠️ [CallDedup] Call already active but outside debounce:`, {
        appointmentId,
        callType,
        source,
        existingSource: existingCall.source,
        timeSinceCall: `${timeSinceCall}ms`
      });
      return false;
    }

    // No existing call, register and allow
    console.log(`✅ [CallDedup] New call registered:`, {
      appointmentId,
      callType,
      source
    });
    this.registerCall(appointmentId, callType, source);
    return true;
  }

  /**
   * Register a call as active
   */
  private registerCall(
    appointmentId: string,
    callType: 'audio' | 'video',
    source: 'websocket' | 'firebase' | 'callkeep' | 'native'
  ): void {
    const callKey = this.getCallKey(appointmentId, callType);
    const call: ActiveCall = {
      appointmentId,
      callType,
      timestamp: Date.now(),
      source
    };
    
    this.activeCalls.set(callKey, call);
    
    // Auto-cleanup after timeout
    setTimeout(() => {
      this.clearCall(appointmentId, callType);
    }, this.CALL_TIMEOUT);
  }

  /**
   * Clear a call (when answered, rejected, or timed out)
   */
  clearCall(appointmentId: string, callType: 'audio' | 'video'): void {
    const callKey = this.getCallKey(appointmentId, callType);
    const removed = this.activeCalls.delete(callKey);
    
    if (removed) {
      console.log(`🧹 [CallDedup] Call cleared:`, {
        appointmentId,
        callType
      });
    }
    
    // Also clear global flag for backward compatibility
    const globalKey = `incomingCall_${appointmentId}_${callType}`;
    if ((global as any)[globalKey]) {
      (global as any)[globalKey] = false;
      console.log(`🧹 [CallDedup] Global flag cleared:`, globalKey);
    }
  }

  /**
   * Clear all calls (useful for cleanup)
   */
  clearAllCalls(): void {
    console.log(`🧹 [CallDedup] Clearing all calls (${this.activeCalls.size} active)`);
    this.activeCalls.clear();
  }

  /**
   * Get active calls count
   */
  getActiveCallsCount(): number {
    return this.activeCalls.size;
  }

  /**
   * Get call key for deduplication
   */
  private getCallKey(appointmentId: string, callType: 'audio' | 'video'): string {
    return `${appointmentId}_${callType}`;
  }

  /**
   * Check if a specific call is currently active
   */
  isCallActive(appointmentId: string, callType: 'audio' | 'video'): boolean {
    const callKey = this.getCallKey(appointmentId, callType);
    return this.activeCalls.has(callKey);
  }
}

// Export singleton instance
export default new CallDeduplicationService();
