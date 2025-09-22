import { useEffect, useRef, useState } from 'react';
import { InstantSessionConfig, InstantSessionMessageDetector, MessageDetectionEvents, TimerState } from '../services/instantSessionMessageDetector';

export interface UseInstantSessionDetectorOptions {
  sessionId: string;
  appointmentId: string;
  patientId: number;
  doctorId: number;
  authToken: string;
  enabled?: boolean;
}

export interface UseInstantSessionDetectorReturn {
  isConnected: boolean;
  timerState: TimerState;
  hasPatientSentMessage: boolean;
  hasDoctorResponded: boolean;
  isSessionActivated: boolean;
  isTimerActive: boolean;
  timeRemaining: number;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearState: () => Promise<void>;
}

export function useInstantSessionDetector(options: UseInstantSessionDetectorOptions): UseInstantSessionDetectorReturn {
  const {
    sessionId,
    appointmentId,
    patientId,
    doctorId,
    authToken,
    enabled = true
  } = options;

  console.log('🔧 [Hook] useInstantSessionDetector called with:', { sessionId, appointmentId, patientId, doctorId, enabled, hasAuthToken: !!authToken });
  
  const [isConnected, setIsConnected] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>({
    isActive: false,
    timeRemaining: 90,
    startTime: 0,
    endTime: 0
  });
  const [hasPatientSentMessage, setHasPatientSentMessage] = useState(false);
  const [hasDoctorResponded, setHasDoctorResponded] = useState(false);
  const [isSessionActivated, setIsSessionActivated] = useState(false);

  const detectorRef = useRef<InstantSessionMessageDetector | null>(null);

  // Initialize detector
  useEffect(() => {
    console.log('🔧 [Hook] Initializing detector:', { enabled, sessionId, appointmentId, patientId, doctorId, hasAuthToken: !!authToken });
    console.log('🔧 [Hook] Detector enabled condition:', {
      enabled,
      sessionId: !!sessionId,
      appointmentId: !!appointmentId,
      patientId: patientId > 0,
      doctorId: doctorId > 0,
      hasAuthToken: !!authToken
    });
    if (!enabled) {
      console.log('🔧 [Hook] Detector disabled, skipping initialization');
      return;
    }

    const config: InstantSessionConfig = {
      sessionId,
      appointmentId,
      patientId,
      doctorId,
      authToken
    };

    const events: MessageDetectionEvents = {
      onPatientMessageDetected: (message) => {
        console.log('👤 [Hook] Patient message detected:', message.id);
        setHasPatientSentMessage(true);
      },
      onDoctorMessageDetected: (message) => {
        console.log('👨‍⚕️ [Hook] Doctor message detected:', message.id);
        setHasDoctorResponded(true);
      },
      onTimerStarted: (timeRemaining) => {
        console.log('⏰ [Hook] Timer started, remaining:', timeRemaining);
        setTimerState(prev => ({
          ...prev,
          isActive: true,
          timeRemaining,
          startTime: Date.now(),
          endTime: Date.now() + (timeRemaining * 1000)
        }));
      },
      onTimerExpired: () => {
        console.log('⏰ [Hook] Timer expired');
        setTimerState(prev => ({
          ...prev,
          isActive: false,
          timeRemaining: 0
        }));
      },
      onSessionActivated: () => {
        console.log('✅ [Hook] Session activated');
        setIsSessionActivated(true);
      },
      onError: (error) => {
        console.error('❌ [Hook] Detector error:', error);
      }
    };

    detectorRef.current = new InstantSessionMessageDetector(config, events);

    return () => {
      if (detectorRef.current) {
        detectorRef.current.disconnect();
      }
    };
  }, [sessionId, appointmentId, patientId, doctorId, authToken, enabled]);

  // Connect when enabled
  useEffect(() => {
    console.log('🔌 [Hook] Connect effect triggered:', { enabled, hasDetector: !!detectorRef.current });
    if (enabled && detectorRef.current) {
      console.log('🔌 [Hook] Attempting to connect instant session detector');
      connect();
    } else {
      console.log('🔌 [Hook] Not connecting:', { enabled, hasDetector: !!detectorRef.current });
    }
  }, [enabled]);

  const connect = async (): Promise<void> => {
    if (!detectorRef.current) {
      console.log('❌ [Hook] No detector instance available');
      return;
    }

    try {
      console.log('🔌 [Hook] Connecting to WebRTC signaling...');
      await detectorRef.current.connect();
      console.log('✅ [Hook] Connected successfully');
      setIsConnected(true);
      
      // Update state from detector
      setHasPatientSentMessage(detectorRef.current.hasPatientSentMessage());
      setHasDoctorResponded(detectorRef.current.hasDoctorRespondedToMessage());
      setIsSessionActivated(detectorRef.current.isSessionActivated());
      setTimerState(detectorRef.current.getTimerState());
    } catch (error) {
      console.error('❌ [Hook] Failed to connect detector:', error);
      setIsConnected(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    if (detectorRef.current) {
      await detectorRef.current.disconnect();
      setIsConnected(false);
    }
  };

  const clearState = async (): Promise<void> => {
    if (detectorRef.current) {
      await detectorRef.current.clearSessionState();
      setHasPatientSentMessage(false);
      setHasDoctorResponded(false);
      setIsSessionActivated(false);
      setTimerState({
        isActive: false,
        timeRemaining: 90,
        startTime: 0,
        endTime: 0
      });
    }
  };

  // Update timer state periodically
  useEffect(() => {
    if (!timerState.isActive) return;

    const interval = setInterval(() => {
      if (detectorRef.current) {
        const currentState = detectorRef.current.getTimerState();
        setTimerState(currentState);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isActive]);

  return {
    isConnected,
    timerState,
    hasPatientSentMessage,
    hasDoctorResponded,
    isSessionActivated,
    isTimerActive: timerState.isActive,
    timeRemaining: timerState.timeRemaining,
    connect,
    disconnect,
    clearState
  };
}
