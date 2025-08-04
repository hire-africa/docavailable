import apiService from './apiService';

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
  }> {
    try {
      const response = await apiService.get(`/text-sessions/${sessionId}/check-response`);
      return response.data;
    } catch (error) {
      console.error('Error checking doctor response:', error);
      return { status: 'error' };
    }
  }

  /**
   * End session manually
   */
  async endSession(sessionId: string, sessionType: 'text' | 'appointment' = 'text'): Promise<{
    status: string;
    sessionsUsed: number;
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
        // Text session response format - check if it has the expected structure
        if (response.data && response.data.success) {
          console.log('🔍 Text session ended successfully');
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
        // Appointment response format - convert to expected format
        return {
          status: response.data.success ? 'success' : 'error',
          sessionsUsed: 1 // Default to 1 session used
        };
      }
    } catch (error) {
      console.error('Error ending session:', error);
      console.error('Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        statusText: error?.response?.statusText
      });
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
      return response.data;
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
   * Check if session should auto-end based on time or sessions
   */
  shouldAutoEndSession(
    sessionState: SessionState,
    elapsedMinutes: number
  ): boolean {
    if (!sessionState.isActive) return false;

    // Check if max duration reached
    if (sessionState.maxDurationMinutes && elapsedMinutes >= sessionState.maxDurationMinutes) {
      return true;
    }

    // Check if no sessions remaining
    if (sessionState.remainingSessions <= 0) {
      return true;
    }

    return false;
  }

  /**
   * Calculate sessions to deduct based on elapsed time
   */
  calculateSessionsToDeduct(elapsedMinutes: number): number {
    return Math.max(1, Math.ceil(elapsedMinutes / 10));
  }
}

export default new SessionService(); 