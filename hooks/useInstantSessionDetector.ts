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
  triggerPatientMessageDetection: (message: any) => void;
  triggerDoctorMessageDetection: (message: any) => void;
  updateAuthToken: (newAuthToken: string) => void;
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
    timeRemaining: 0,
    startTime: 0,
    endTime: 0
  });
  const [hasPatientSentMessage, setHasPatientSentMessage] = useState(false);
  const [hasDoctorResponded, setHasDoctorResponded] = useState(false);
  const [isSessionActivated, setIsSessionActivated] = useState(false);

  const detectorRef = useRef<InstantSessionMessageDetector | null>(null);

  // Initialize detector (singleton per sessionId)
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

    // Use global singleton to persist across navigation
    const g = global as any;
    if (!g.__instantDetectorMap) {
      g.__instantDetectorMap = new Map<string, InstantSessionMessageDetector>();
    }
    const map: Map<string, InstantSessionMessageDetector> = g.__instantDetectorMap;

    const existing = map.get(sessionId);
    if (existing) {
      console.log('🔁 [Hook] Reusing existing InstantSessionMessageDetector for session:', sessionId);
      detectorRef.current = existing;
    } else {
      console.log('🆕 [Hook] Creating new InstantSessionMessageDetector for session:', sessionId);
      detectorRef.current = new InstantSessionMessageDetector(config, events);
      map.set(sessionId, detectorRef.current);
    }

    // Seed local state from detector if available
    if (detectorRef.current) {
      setHasPatientSentMessage(detectorRef.current.hasPatientSentMessage());
      setHasDoctorResponded(detectorRef.current.hasDoctorRespondedToMessage());
      setIsSessionActivated(detectorRef.current.isSessionActivated());
      setTimerState(detectorRef.current.getTimerState());
    }

    return () => {
      // Do not disconnect or delete singleton on unmount; keep running across navigation
    };
  }, [sessionId, appointmentId, patientId, doctorId, authToken, enabled]);

  // Connect when enabled or when auth token changes
  useEffect(() => {
    console.log('🔌 [Hook] Connect effect triggered:', { enabled, hasDetector: !!detectorRef.current, hasAuthToken: !!authToken });
    if (enabled && detectorRef.current) {
      console.log('🔌 [Hook] Attempting to connect instant session detector');
      connect();
    } else {
      console.log('🔌 [Hook] Not connecting:', { enabled, hasDetector: !!detectorRef.current });
    }
  }, [enabled, authToken]);

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

      // Immediately rehydrate timer from backend after successful connect to avoid race conditions
      try {
        const { default: sessionService } = await import('../services/sessionService');
        const result = await sessionService.checkDoctorResponse(sessionId);
        if ((result as any)?.status === 'waiting' && typeof (result as any)?.timeRemaining === 'number') {
          const remaining = Math.max(0, Math.floor((result as any).timeRemaining));
          if (remaining > 0) {
            console.log('⏰ [Hook] Post-connect rehydrate with remaining:', remaining);
            detectorRef.current.resumeTimerWithRemaining(remaining);
            setTimerState(detectorRef.current.getTimerState());
            setHasPatientSentMessage(true);
          }
        }
      } catch (rehydrateError) {
        console.error('❌ [Hook] Post-connect rehydrate failed:', rehydrateError);
      }
    } catch (error) {
      console.error('❌ [Hook] Failed to connect detector:', error);
      setIsConnected(false);
    }
  };

  // On initial mount/when enabled, fetch authoritative remaining time and resume
  useEffect(() => {
    let cancelled = false;
    const rehydrate = async () => {
      try {
        if (!enabled || !sessionId) return;
        // Avoid racing before detector exists
        if (!detectorRef.current) return;

        // Import lazily to avoid cycles
        const { default: sessionService } = await import('../services/sessionService');
        const result = await sessionService.checkDoctorResponse(sessionId);
        if (cancelled) return;

        if ((result as any)?.status === 'waiting' && typeof (result as any)?.timeRemaining === 'number') {
          const remaining = Math.max(0, Math.floor((result as any).timeRemaining));
          if (remaining > 0) {
            console.log('⏰ [Hook] Rehydrating timer from backend with remaining:', remaining);
            // Ask detector to resume timer in-place
            detectorRef.current.resumeTimerWithRemaining(remaining);
            // Reflect immediately in hook state
            setTimerState(detectorRef.current.getTimerState());
            setHasPatientSentMessage(true);
          }
        }
      } catch (e) {
        console.error('❌ [Hook] Failed to rehydrate timer from backend:', e);
      }
    };

    rehydrate();
    return () => { cancelled = true; };
  }, [enabled, sessionId]);

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

  const triggerPatientMessageDetection = (message: any): void => {
    if (detectorRef.current) {
      detectorRef.current.triggerPatientMessageDetection(message);
    }
  };

  const triggerDoctorMessageDetection = (message: any): void => {
    if (detectorRef.current) {
      detectorRef.current.triggerDoctorMessageDetection(message);
    }
  };

  const updateAuthToken = (newAuthToken: string): void => {
    if (detectorRef.current) {
      detectorRef.current.updateAuthToken(newAuthToken);
    }
  };

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
    clearState,
    triggerPatientMessageDetection,
    triggerDoctorMessageDetection,
    updateAuthToken
  };
}
