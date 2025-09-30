import { useEffect, useRef, useState } from 'react';
import { AudioCallService } from '../services/audioCallService';
import { VideoCallService } from '../services/videoCallService';

export interface CallEvents {
  onCallAnswered?: () => void;
  onCallEnded?: () => void;
  onCallTimeout?: () => void;
  onCallRejected?: () => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onStateChange?: (state: any) => void;
  onError?: (error: string) => void;
}

export interface UseCallSetupOptions {
  appointmentId: string;
  userId: string;
  isDoctor: boolean;
  callType: 'audio' | 'video';
  isIncomingCall?: boolean;
  events: CallEvents;
}

export interface UseCallSetupReturn {
  callState: any;
  isInitializing: boolean;
  isRinging: boolean;
  localStream: MediaStream | null;
  audioCallService: React.MutableRefObject<AudioCallService | null>;
  videoCallService: React.MutableRefObject<VideoCallService | null>;
  initializeCall: () => Promise<void>;
  initializeIncomingCall: () => Promise<void>;
  endCall: () => void;
}

export function useCallSetup({
  appointmentId,
  userId,
  isDoctor,
  callType,
  isIncomingCall = false,
  events
}: UseCallSetupOptions): UseCallSetupReturn {
  const [callState, setCallState] = useState({
    isConnected: false,
    isAudioEnabled: true,
    isVideoEnabled: true,
    connectionState: 'disconnected',
    callDuration: 0,
  });
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const audioCallService = useRef<AudioCallService | null>(null);
  const videoCallService = useRef<VideoCallService | null>(null);

  const initializeCall = async () => {
    try {
      setIsInitializing(true);
      
      if (callType === 'audio') {
        audioCallService.current = AudioCallService.getInstance();
        await audioCallService.current.initialize(appointmentId, userId, {
          onCallAnswered: () => {
            events.onCallAnswered?.();
          },
          onCallEnded: () => {
            events.onCallEnded?.();
          },
          onCallTimeout: () => {
            events.onCallTimeout?.();
          },
          onCallRejected: () => {
            events.onCallRejected?.();
          },
          onRemoteStream: (stream) => {
            events.onRemoteStream?.(stream);
          },
          onStateChange: (state) => {
            setCallState(state);
            events.onStateChange?.(state);
          },
          onError: (error) => {
            events.onError?.(error);
          }
        });
      } else if (callType === 'video') {
        videoCallService.current = new VideoCallService();
        await videoCallService.current.initialize(appointmentId, userId, {
          onCallEnded: () => {
            events.onCallEnded?.();
          },
          onCallTimeout: () => {
            events.onCallTimeout?.();
          },
          onCallRejected: () => {
            events.onCallRejected?.();
          },
          onRemoteStream: (stream) => {
            events.onRemoteStream?.(stream);
          },
          onStateChange: (state) => {
            setCallState(state);
            events.onStateChange?.(state);
          }
        });
      }
    } catch (error) {
      events.onError?.(`Failed to initialize call: ${error}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const initializeIncomingCall = async () => {
    try {
      setIsInitializing(true);
      
      if (callType === 'audio') {
        audioCallService.current = AudioCallService.getInstance();
        await audioCallService.current.initializeForIncomingCall(appointmentId, userId, {
          onStateChange: (state) => {
            setCallState(state);
            events.onStateChange?.(state);
          },
          onRemoteStream: (stream) => {
            events.onRemoteStream?.(stream);
          },
          onCallEnded: () => {
            events.onCallEnded?.();
          },
          onCallRejected: () => {
            events.onCallRejected?.();
          },
          onCallTimeout: () => {
            events.onCallTimeout?.();
          },
          onError: (error) => {
            events.onError?.(error);
          }
        });
      } else if (callType === 'video') {
        videoCallService.current = new VideoCallService();
        await videoCallService.current.initializeForIncomingCall(appointmentId, userId, {
          onStateChange: (state) => {
            setCallState(state);
            events.onStateChange?.(state);
          },
          onRemoteStream: (stream) => {
            events.onRemoteStream?.(stream);
          },
          onCallEnded: () => {
            events.onCallEnded?.();
          },
          onCallRejected: () => {
            events.onCallRejected?.();
          },
          onCallTimeout: () => {
            events.onCallTimeout?.();
          },
          onError: (error) => {
            events.onError?.(error);
          }
        });
      }
    } catch (error) {
      events.onError?.(`Failed to initialize incoming call: ${error}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const endCall = () => {
    if (audioCallService.current) {
      audioCallService.current.endCall();
    }
    if (videoCallService.current) {
      videoCallService.current.endCall();
    }
  };

  // Setup call on mount
  useEffect(() => {
    const setupCall = async () => {
      if (!isIncomingCall) {
        await initializeCall();
      } else {
        await initializeIncomingCall();
      }
    };
    
    setupCall();
    
    return () => {
      endCall();
    };
  }, [isIncomingCall]);

  // Handle connection state changes
  useEffect(() => {
    if (callState.connectionState === 'connected') {
      setIsInitializing(false);
      setIsRinging(false);
    } else if (callState.connectionState === 'connecting') {
      setIsRinging(true);
    }
  }, [callState.connectionState]);

  // Monitor local stream availability for video calls
  useEffect(() => {
    if (callType === 'video' && videoCallService.current && !localStream) {
      const checkLocalStream = () => {
        const stream = videoCallService.current?.getLocalStream();
        if (stream) {
          setLocalStream(stream);
        }
      };
      
      checkLocalStream();
      const timeout = setTimeout(checkLocalStream, 1000);
      return () => clearTimeout(timeout);
    }
  }, [callType, videoCallService.current, localStream]);

  return {
    callState,
    isInitializing,
    isRinging,
    localStream,
    audioCallService,
    videoCallService,
    initializeCall,
    initializeIncomingCall,
    endCall
  };
}
