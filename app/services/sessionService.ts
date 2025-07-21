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
  async endSession(sessionId: string): Promise<{
    status: string;
    sessionsUsed: number;
  }> {
    try {
      const response = await apiService.post(`/text-sessions/${sessionId}/end`);
      return response.data;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  /**
   * Submit rating for session
   */
  async submitRating(sessionId: string, rating: number, comment: string): Promise<{
    reviewId: string;
    rating: number;
  }> {
    try {
      const response = await apiService.post(`/text-sessions/${sessionId}/rating`, {
        rating,
        comment
      });
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