import { useEffect, useRef, useState } from 'react';
import { MediaStream } from 'react-native-webrtc';
import { AudioCallService, AudioCallState } from '../services/audioCallService';
import { VideoCallService, VideoCallState } from '../services/videoCallService';

export interface CallEvents {
  onCallAnswered?: () => void;
  onCallEnded?: () => void;
  onCallTimeout?: () => void;
  onCallRejected?: (rejectedBy?: string) => void;
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
  declineCall: (isDoctor: boolean) => Promise<void>;
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
        await audioCallService.current.initialize(appointmentId, userId, undefined, {
          onCallAnswered: () => {
            events.onCallAnswered?.();
          },
          onCallEnded: () => {
            events.onCallEnded?.();
          },
          onCallTimeout: () => {
            events.onCallTimeout?.();
          },
          onCallRejected: (rejectedBy?: string) => {
            events.onCallRejected?.(rejectedBy);
          },
          onRemoteStream: (stream) => {
            events.onRemoteStream?.(stream as any as MediaStream);
          },
          onStateChange: (state: AudioCallState) => {
            setCallState({
              ...callState,
              ...state,
              isVideoEnabled: false
            });
            events.onStateChange?.(state);
          },
          onError: (error) => {
            events.onError?.(error);
          }
        });
      } else if (callType === 'video') {
        videoCallService.current = VideoCallService.getInstance();
        await videoCallService.current.initialize(appointmentId, userId, undefined, {
          onCallEnded: () => {
            events.onCallEnded?.();
          },
          onCallTimeout: () => {
            events.onCallTimeout?.();
          },
          onCallRejected: (rejectedBy?: string) => {
            events.onCallRejected?.(rejectedBy);
          },
          onRemoteStream: (stream) => {
            events.onRemoteStream?.(stream as any as MediaStream);
          },
          onStateChange: (state: VideoCallState) => {
            setCallState(state);
            events.onStateChange?.(state);
          },
          onCallAnswered: () => {
            events.onCallAnswered?.();
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
          onStateChange: (state: AudioCallState) => {
            setCallState({
              ...callState,
              ...state,
              isVideoEnabled: false
            });
            events.onStateChange?.(state);
          },
          onRemoteStream: (stream) => {
            events.onRemoteStream?.(stream as any as MediaStream);
          },
          onCallEnded: () => {
            events.onCallEnded?.();
          },
          onCallRejected: (rejectedBy?: string) => {
            events.onCallRejected?.(rejectedBy);
          },
          onCallTimeout: () => {
            events.onCallTimeout?.();
          },
          onCallAnswered: () => {
            events.onCallAnswered?.();
          },
          onError: (error) => {
            events.onError?.(error);
          }
        });
      } else if (callType === 'video') {
        videoCallService.current = VideoCallService.getInstance();
        await videoCallService.current.initializeForIncomingCall(appointmentId, userId, {
          onStateChange: (state: VideoCallState) => {
            setCallState(state);
            events.onStateChange?.(state);
          },
          onRemoteStream: (stream) => {
            events.onRemoteStream?.(stream as any as MediaStream);
          },
          onCallEnded: () => {
            events.onCallEnded?.();
          },
          onCallRejected: (rejectedBy?: string) => {
            events.onCallRejected?.(rejectedBy);
          },
          onCallTimeout: () => {
            events.onCallTimeout?.();
          },
          onCallAnswered: () => {
            events.onCallAnswered?.();
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

  const declineCall = async (isDoctor: boolean) => {
    if (audioCallService.current) {
      await audioCallService.current.declineCall(isDoctor);
    }
    if (videoCallService.current) {
      await videoCallService.current.declineCall(isDoctor);
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
          setLocalStream(stream as any as MediaStream);
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
    endCall,
    declineCall
  };
}
