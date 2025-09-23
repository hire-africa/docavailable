import { apiService } from './apiService';

export interface SessionState {
  isLocked: boolean;
  isActive: boolean;
  canSendMessages: boolean;
  sessionId?: string;
  hasRated: boolean;
  sessionEnded: boolean;
  remainingSessions: number;
  consultationType: 'text' | 'voice' | 'video';
  status: 'waiting_for_doctor' | 'active' | 'expired' | 'ended';
  timeRemaining?: number;
  maxDurationMinutes?: number;
}

export interface SessionEndOptions {
  onEndSession: () => void;
  onContinue: () => void;
  onRate: (rating: number, comment: string) => void;
}

class SessionService {
  /**
   * Check if doctor has responded within 90 seconds
   */
  async checkDoctorResponse(sessionId: string): Promise<{
    status: string;
    timeRemaining?: number;
    message?: string;
    remainingTimeMinutes?: number;
    remainingSessions?: number;
  }> {
    try {
      console.log('🔍 [SessionService] Checking doctor response for session:', sessionId);
      console.log('🔍 [SessionService] Current timestamp:', new Date().toISOString());
      
      const response = await apiService.get(`/text-sessions/${sessionId}/check-response`);
      
      console.log('🔍 [SessionService] Raw API response:', response);
      
      // Add proper error checking
      if (!response) {
        console.error('❌ [SessionService] Invalid response from checkDoctorResponse API');
        return { status: 'error', message: 'Invalid response from server' };
      }
      
      // Check if the API response indicates an error
      if (response.success === false) {
        console.error('❌ [SessionService] API returned error:', response.message);
        return { status: 'error', message: response.message || 'API error' };
      }
      
      console.log('🔍 [SessionService] Processed response:', {
        success: response.success,
        status: (response as any).status,
        timeRemaining: (response as any).timeRemaining,
        message: response.message,
        remainingTimeMinutes: (response as any).remainingTimeMinutes,
        remainingSessions: (response as any).remainingSessions
      });
      
      return response;
    } catch (error) {
      console.error('❌ [SessionService] Error checking doctor response:', error);
      return { status: 'error', message: 'Failed to check session status' };
    }
  }

  /**
   * End session manually
   */
  async endSession(sessionId: string, sessionType: 'text' | 'appointment' = 'text'): Promise<{
    status: string;
    sessionsUsed: number;
    sessionData?: any;
    paymentData?: any;
  }> {
    try {
      let endpoint;
      if (sessionType === 'text') {
        endpoint = `/text-sessions/${sessionId}/end`;
      } else {
        endpoint = `/appointments/${sessionId}/end-session`;
      }
      
      console.log('🔍 Calling endpoint:', endpoint);
      console.log('🔍 Session type:', sessionType);
      console.log('🔍 Session ID:', sessionId);
      
      const response = await apiService.post(endpoint);
      
      console.log('🔍 Response received:', response);
      console.log('🔍 Response data:', response.data);
      
      // Handle different response formats
      if (sessionType === 'text') {
        // New text session response format with payment_processing and session objects
        if ((response.data as any) && (response.data as any).payment_processing && (response.data as any).session) {
          console.log('🔍 Payment processing detected');
          const paymentProcessing = (response.data as any).payment_processing;
          const session = (response.data as any).session;
          
          // Check if payment processing was successful
          const paymentSuccess = paymentProcessing.doctor_payment_success && paymentProcessing.patient_deduction_success;
          
          return {
            status: paymentSuccess ? 'success' : 'success_with_warnings',
            sessionsUsed: paymentProcessing.patient_sessions_deducted || 1,
            sessionData: session,
            paymentData: paymentProcessing
          };
        } else if ((response.data as any) && (response.data as any).success) {
          // Fallback for old format
          console.log('🔍 Text session ended successfully (old format)');
          return {
            status: 'success',
            sessionsUsed: 1
          };
        } else if ((response.data as any) && (response.data as any).already_ended === true) {
          // Handle case where session is already ended
          console.log('🔍 Text session already ended:', response.data);
          return {
            status: 'success',
            sessionsUsed: 1,
            sessionData: (response.data as any).session
          };
        } else if ((response.data as any) && (response.data as any).message) {
          // Handle cases where session is not found or already ended
          console.log('🔍 Text session response:', (response.data as any).message);
          if ((response.data as any).message.includes('already been ended') || 
              (response.data as any).message.includes('not found')) {
            // Treat as success since the session is effectively ended
            return {
              status: 'success',
              sessionsUsed: 1
            };
          } else {
            console.error('🔍 Text session response format error:', response.data);
            return {
              status: 'error',
              sessionsUsed: 0
            };
          }
        } else {
          console.error('🔍 Text session response format error:', response.data);
          return {
            status: 'error',
            sessionsUsed: 0
          };
        }
      } else {
        // Appointment response format - convert to expected format
        return {
          status: (response.data as any).success ? 'success' : 'error',
          sessionsUsed: 1 // Default to 1 session used
        };
      }
    } catch (error) {
      console.error('Error ending session:', error);
      console.error('Error details:', {
        message: (error as any)?.message,
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
        data: (error as any)?.response?.data,
        statusText: (error as any)?.response?.statusText
      });
      
      // Handle specific error cases
      if ((error as any)?.response?.status === 404) {
        // Session not found - treat as success since it's effectively ended
        console.log('🔍 Session not found (404) - treating as success');
        return {
          status: 'success',
          sessionsUsed: 1
        };
      }
      
      throw error;
    }
  }

  /**
   * Submit rating for session
   */
  async submitRating(sessionId: string, rating: number, comment: string, doctorId?: number, patientId?: number): Promise<{
    reviewId: string;
    rating: number;
  }> {
    try {
      // Use the doctor rating endpoint for both text sessions and appointments
      const endpoint = `/doctor-ratings/${doctorId}/${patientId}`;
      const payload = {
        rating,
        comment,
        chatId: sessionId
      };
      
      console.log('🔍 Submitting rating to endpoint:', endpoint);
      console.log('🔍 Payload:', payload);
      const response = await apiService.post(endpoint, payload);
      return (response.data as any);
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  }

  /**
   * Get session state based on session type and status
   */
  getSessionState(
    sessionType: 'instant' | 'appointment',
    sessionStatus: string,
    consultationType: 'text' | 'voice' | 'video',
    remainingSessions: number,
    timeRemaining?: number,
    maxDurationMinutes?: number
  ): SessionState {
    let isLocked = false;
    let isActive = false;
    let canSendMessages = false;

    if (sessionType === 'instant') {
      // For instant sessions
      if (sessionStatus === 'waiting_for_doctor') {
        isLocked = false;
        isActive = true;
        canSendMessages = true; // Patient can send one message
      } else if (sessionStatus === 'active') {
        isLocked = false;
        isActive = true;
        canSendMessages = true; // Both can send messages
      } else if (sessionStatus === 'expired') {
        isLocked = true;
        isActive = false;
        canSendMessages = false;
      } else {
        isLocked = true;
        isActive = false;
        canSendMessages = false;
      }
    } else {
      // For appointment sessions
      if (sessionStatus === 'confirmed' || sessionStatus === 'in_progress') {
        isLocked = false;
        isActive = true;
        canSendMessages = true;
      } else {
        isLocked = true;
        isActive = false;
        canSendMessages = false;
      }
    }

    return {
      isLocked,
      isActive,
      canSendMessages,
      hasRated: false,
      sessionEnded: false,
      remainingSessions,
      consultationType,
      status: sessionStatus as any,
      timeRemaining,
      maxDurationMinutes
    };
  }

  /**
   * Calculate sessions to deduct based on elapsed time
   * Auto-deductions happen at 10-minute intervals
   * Manual end always adds 1 session
   */
  calculateSessionsToDeduct(elapsedMinutes: number, isManualEnd: boolean = false): number {
    const autoDeductions = Math.floor(elapsedMinutes / 10);
    const manualDeduction = isManualEnd ? 1 : 0;
    return autoDeductions + manualDeduction;
  }

  /**
   * Calculate total allowed time based on sessions remaining
   */
  calculateTotalAllowedTime(sessionsRemaining: number): number {
    return sessionsRemaining * 10; // minutes
  }

  /**
   * Get time remaining until next auto-deduction
   */
  getTimeUntilNextDeduction(elapsedMinutes: number): number {
    const nextDeductionMinute = Math.ceil(elapsedMinutes / 10) * 10;
    return Math.max(0, nextDeductionMinute - elapsedMinutes);
  }

  /**
   * Check if session should auto-end based on total time
   */
  shouldAutoEndSession(
    sessionState: SessionState,
    elapsedMinutes: number
  ): boolean {
    if (!sessionState.isActive) return false;

    // Check if total time reached
    const totalAllowedTime = this.calculateTotalAllowedTime(sessionState.remainingSessions);
    if (elapsedMinutes >= totalAllowedTime) {
      return true;
    }

    // Check if no sessions remaining
    if (sessionState.remainingSessions <= 0) {
      return true;
    }

    return false;
  }

  /**
   * Get session billing information
   */
  getSessionBillingInfo(elapsedMinutes: number, isManualEnd: boolean = false) {
    const autoDeductions = Math.floor(elapsedMinutes / 10);
    const manualDeduction = isManualEnd ? 1 : 0;
    const totalDeductions = autoDeductions + manualDeduction;
    const timeUntilNextDeduction = this.getTimeUntilNextDeduction(elapsedMinutes);
    
    return {
      autoDeductions,
      manualDeduction,
      totalDeductions,
      timeUntilNextDeduction,
      elapsedMinutes
    };
  }
}

export default new SessionService(); 