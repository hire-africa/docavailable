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
    const audioService = audioCallService.current ?? (callType === 'audio' ? AudioCallService.getInstance() : null);
    const videoService = videoCallService.current ?? (callType === 'video' ? VideoCallService.getInstance() : null);

    if (audioService) {
      audioService.endCall();
    }
    if (videoService) {
      videoService.endCall();
    }
  };

  const declineCall = async (isDoctor: boolean) => {
    const audioService = audioCallService.current ?? (callType === 'audio' ? AudioCallService.getInstance() : null);
    const videoService = videoCallService.current ?? (callType === 'video' ? VideoCallService.getInstance() : null);

    // ✅ Ensure appointmentId and userId are set before decline — singleton may not have been initialized by this hook
    if (audioService && !(audioService as any).appointmentId) {
      (audioService as any).appointmentId = appointmentId;
      (audioService as any).userId = userId;
    }
    if (videoService && !(videoService as any).appointmentId) {
      (videoService as any).appointmentId = appointmentId;
      (videoService as any).userId = userId;
    }

    if (audioService) {
      await audioService.declineCall(isDoctor);
    }
    if (videoService) {
      await videoService.declineCall(isDoctor);
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
      // Sync-safe cleanup: uses destroyResources() instead of async endCall()
      // because React cleanup functions are synchronous
      const audioService = audioCallService.current ?? (callType === 'audio' ? AudioCallService.getInstance() : null);
      const videoService = videoCallService.current ?? (callType === 'video' ? VideoCallService.getInstance() : null);

      if (audioService) {
        audioService.destroyResources();
      }
      if (videoService) {
        videoService.destroyResources();
      }
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
