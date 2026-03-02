import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import { environment } from '../config/environment';
import { SecureWebSocketService } from './secureWebSocketService';

let InCallManager: any = null;
try {
  InCallManager = require('react-native-incall-manager');
} catch (e) {
  InCallManager = null;
}

export interface AudioCallState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  callDuration: number;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'reconnecting';
}

export interface AudioCallEvents {
  onStateChange: (state: AudioCallState) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
  onError: (error: string) => void;
  onCallAnswered: () => void;
  onCallRejected: () => void;
  onCallTimeout: () => void;
}

class AudioCallService {
  private static instanceCounter = 0;
  private static activeInstance: AudioCallService | null = null;
  private instanceId: number;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingChannel: SecureWebSocketService | null = null;
  private callTimer: ReturnType<typeof setInterval> | null = null;
  private callStartTime: number = 0;
  private events: AudioCallEvents | null = null;
  private callTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reofferTimer: ReturnType<typeof setInterval> | null = null;
  private isCallAnswered: boolean = false;
  private appointmentId: string | null = null;
  private userId: string | null = null;
  private isIncoming: boolean = false;
  private isIncomingMode: boolean = false;
  private hasAccepted: boolean = false;
  private pendingCandidates: any[] = [];
  private pendingOffer: any = null;
  private hasEnded: boolean = false;
  private didConnect: boolean = false;
  private didEmitAnswered: boolean = false;
  private isReconnecting: boolean = false;
  private creatingOffer: boolean = false;
  private isInitializing: boolean = false;
  private messageQueue: any[] = [];
  private signalingFlushTimer: ReturnType<typeof setInterval> | null = null;
  private disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;

  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  private state: AudioCallState = {
    isConnected: false,
    isAudioEnabled: true,
    callDuration: 0,
    connectionState: 'disconnected',
  };

  constructor() {
    this.instanceId = ++AudioCallService.instanceCounter;
  }

  static getInstance(): AudioCallService {
    if (!AudioCallService.activeInstance) {
      AudioCallService.activeInstance = new AudioCallService();
    }
    return AudioCallService.activeInstance;
  }

  static clearInstance(): void {
    if (AudioCallService.activeInstance) {
      AudioCallService.activeInstance.endCall();
      AudioCallService.activeInstance = null;
    }
  }

  private releaseMediaStream(stream: MediaStream | null): void {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        stream.removeTrack(track);
      });
    }
  }

  async initializeForIncomingCall(appointmentId: string, userId: string, events: AudioCallEvents): Promise<void> {
    try {
      this.isIncoming = true;
      (global as any).currentCallType = 'audio';
      if (!appointmentId || appointmentId === 'null') throw new Error('Invalid appointmentId');
      this.events = events;
      this.appointmentId = appointmentId;
      this.userId = userId;
      this.isCallAnswered = false;
      this.hasAccepted = false;
      this.isIncomingMode = true;
      this.pendingCandidates = [];
      this.hasEnded = false;
      this.updateState({ connectionState: 'connecting' });
    } catch (error: any) {
      console.error('❌ [AudioCallService] Failed to initialize incoming call:', error.message);
      this.events?.onError(`Failed to initialize incoming call: ${error.message}`);
      this.updateState({ connectionState: 'failed' });
    }
  }

  async initialize(appointmentId: string, userId: string, doctorId: string | number | undefined, events: AudioCallEvents): Promise<void> {
    try {
      if (this.isInitializing) return;
      this.isInitializing = true;
      if ((global as any).activeVideoCall) {
        events?.onError?.('Another call is active');
        this.isInitializing = false;
        return;
      }
      (global as any).activeAudioCall = true;
      (global as any).currentCallType = 'audio';
      this.isIncoming = false;
      this.events = events;
      this.appointmentId = appointmentId;
      this.userId = userId;
      this.updateState({ connectionState: 'connecting' });
      await this.connectSignaling(appointmentId, userId);
      this.localStream = await mediaDevices.getUserMedia({
        video: false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any
      });
      await this.configureAudioRouting();
      await this.initializePeerConnection();
      await this.createOffer();
      this.startReofferLoop();
      this.startCallTimeout();
      this.isInitializing = false;
    } catch (error: any) {
      console.error('❌ [AudioCallService] Failed to initialize call:', error.message);
      this.events?.onError(`Failed to initialize call: ${error.message}`);
      this.updateState({ connectionState: 'failed' });
      this.isInitializing = false;
    }
  }

  private updateState(updates: Partial<AudioCallState>): void {
    this.state = { ...this.state, ...updates };
    this.events?.onStateChange(this.state);
  }

  private markConnectedOnce(): void {
    if (this.didConnect) return;
    this.didConnect = true;
    this.updateState({ isConnected: true, connectionState: 'connected' });
    this.startCallTimer();
  }

  private startCallTimer(): void {
    if (this.callTimer) return;
    this.callStartTime = Date.now();
    this.callTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
      this.updateState({ callDuration: elapsed });
    }, 1000);
  }

  private stopCallTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }

  private async createOffer(): Promise<void> {
    if (!this.peerConnection || this.creatingOffer) return;
    this.creatingOffer = true;
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.sendSignalingMessage({
        type: 'offer',
        offer: offer,
        senderId: this.userId,
        appointmentId: this.appointmentId,
        userId: this.userId,
        userType: (global as any).userType || 'patient'
      });
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to create offer:', error);
    } finally {
      this.creatingOffer = false;
    }
  }

  private startReofferLoop(): void {
    this.clearReofferLoop();
    this.reofferTimer = setInterval(() => {
      if (this.peerConnection?.localDescription && this.state.connectionState === 'connecting') {
        console.log('🔄 [AudioCallService] Re-sending offer to ensure signaling delivery');
        this.sendSignalingMessage({
          type: 'offer',
          offer: this.peerConnection.localDescription,
          senderId: this.userId,
          appointmentId: this.appointmentId,
          userId: this.userId,
          userType: (global as any).userType || 'patient'
        });
      }
    }, 4000); // 4-second interval for stability
  }

  private startCallTimeout(): void {
    this.clearCallTimeout();
    this.callTimeoutTimer = setTimeout(() => {
      if (!this.isCallAnswered && !this.hasEnded) {
        this.handleCallTimeout();
      }
    }, 60000);
  }

  private clearCallTimeout(): void {
    if (this.callTimeoutTimer) {
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }
  }

  private handleCallAnswered(): void {
    this.isCallAnswered = true;
    this.clearCallTimeout();
    this.updateState({ isConnected: true, connectionState: 'connected' });
    this.events?.onCallAnswered();
  }

  private handleCallRejected(): void {
    this.endCall();
    this.events?.onCallRejected();
  }

  private handleCallTimeout(): void {
    this.endCall();
    this.events?.onCallTimeout();
  }

  private async markCallAsAnsweredInBackend(): Promise<void> {
    if (!this.appointmentId) return;
    try {
      const authToken = await this.getAuthToken();
      await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ appointment_id: this.appointmentId, caller_id: this.userId, action: 'answered' })
      });
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to mark call as answered in backend:', error);
    }
  }

  private async updateCallSessionInBackend(duration: number, wasConnected: boolean): Promise<void> {
    if (!this.appointmentId) return;
    try {
      const authToken = await this.getAuthToken();
      await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({
          call_type: 'voice',
          appointment_id: this.appointmentId,
          session_duration: duration,
          was_connected: wasConnected
        })
      });
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to update call session in backend:', error);
    }
  }

  async endCall(): Promise<void> {
    if (this.hasEnded) return;
    this.hasEnded = true;
    this.stopCallTimer();
    this.clearCallTimeout();
    this.clearReofferLoop();
    const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
    this.updateCallSessionInBackend(duration, this.state.isConnected);
    this.sendSignalingMessage({ type: 'call-ended', senderId: this.userId, appointmentId: this.appointmentId });
    this.releaseMediaStream(this.localStream);
    this.localStream = null;

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    await this.resetAudioRouting();
    this.updateState({ isConnected: false, connectionState: 'disconnected' });
    this.events?.onCallEnded();
    (global as any).activeAudioCall = false;
    if ((global as any).currentCallType === 'audio') (global as any).currentCallType = null;
  }

  async reset(): Promise<void> {
    this.hasEnded = false;
    this.didConnect = false;
    this.didEmitAnswered = false;
    this.isCallAnswered = false;
    this.isInitializing = false;
    this.creatingOffer = false;
    this.stopCallTimer();
    this.clearCallTimeout();
    this.clearReofferLoop();
    this.releaseMediaStream(this.localStream);
    this.localStream = null;

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.state = { isConnected: false, isAudioEnabled: true, callDuration: 0, connectionState: 'disconnected' };
  }

  toggleAudio(): boolean {
    if (this.localStream) {
      const track = this.localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        this.updateState({ isAudioEnabled: track.enabled });
        return track.enabled;
      }
    }
    return false;
  }

  async toggleSpeaker(enabled: boolean): Promise<void> {
    try {
      if (InCallManager) {
        InCallManager.setForceSpeakerphoneOn(enabled);
        InCallManager.setSpeakerphoneOn(enabled);
      }
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: !enabled,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      } as any);
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to toggle speaker:', error);
    }
  }

  getState(): AudioCallState { return this.state; }
  getLocalStream(): MediaStream | null { return this.localStream; }
  getRemoteStream(): MediaStream | null { return this.remoteStream; }

  private clearReofferLoop(): void {
    if (this.reofferTimer) {
      clearInterval(this.reofferTimer);
      this.reofferTimer = null;
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) return;
    try {
      if (!this.peerConnection.remoteDescription) {
        this.pendingCandidates.push(candidate as any);
        return;
      }
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to handle ICE candidate:', error);
    }
  }

  private async initializePeerConnection(): Promise<void> {
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (error) {
        console.error('❌ [AudioCallService] Error closing peer connection:', error);
      }
    }
    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }
    this.peerConnection.addEventListener('track', (event) => {
      try {
        const stream = event.streams[0] || this.remoteStream || new MediaStream();
        if (!event.streams[0]) {
          const alreadyHas = stream.getTracks().some(t => t.id === event.track.id);
          if (!alreadyHas) { try { stream.addTrack(event.track); } catch (e) { } }
        }
        this.remoteStream = stream;
        this.events?.onRemoteStream(stream);
        this.markConnectedOnce();
      } catch (error) {
        console.error('❌ [AudioCallService] Error in track listener:', error);
      }
    });
    this.peerConnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        if (this.peerConnection?.remoteDescription) {
          this.sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            senderId: this.userId,
            userType: (global as any).userType || 'patient'
          });
        } else {
          this.pendingCandidates.push(event.candidate as any);
        }
      }
    });
    this.peerConnection.addEventListener('connectionstatechange', () => {
      const state = this.peerConnection?.connectionState;
      console.log(`📡 [AudioCallService] Connection state changed: ${state}`);
      if (state === 'connected') {
        this.markConnectedOnce();
      } else if (state === 'disconnected' || state === 'failed') {
        if (this.isInitializing || (!this.isIncoming && !this.isCallAnswered)) return;
        if (this.didConnect && (Date.now() - this.callStartTime) < 3000) return;
        this.attemptReconnection();
      }
    });
    this.peerConnection.addEventListener('iceconnectionstatechange', () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log(`🧊 [AudioCallService] ICE connection state changed: ${state}`);
      if (state === 'failed') {
        if (this.isInitializing || (!this.isIncoming && !this.isCallAnswered)) return;
        if (this.didConnect && (Date.now() - this.callStartTime) < 3000) return;
        this.attemptReconnection();
      }
      // Don't reconnect on ICE 'disconnected' — it's often transient
    });
  }

  private async handleOffer(offer: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) return;
    if (this.didConnect) {
      console.log('⏭️ [AudioCallService] Ignoring offer — already connected');
      return;
    }
    if (this.hasAccepted && this.peerConnection.remoteDescription) return;
    try {
      const state = this.peerConnection.signalingState;
      if (state !== 'stable') {
        if (state === 'have-local-offer') {
          await this.peerConnection.setLocalDescription({ type: 'rollback' } as any);
        } else {
          console.log(`⚠️ [AudioCallService] Ignoring offer in signalingState: ${state}`);
          return;
        }
      }
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.sendSignalingMessage({
        type: 'answer',
        answer,
        senderId: this.userId,
        appointmentId: this.appointmentId,
        userId: this.userId,
        userType: (global as any).userType || 'patient'
      });
      this.isCallAnswered = true;
      this.updateState({ connectionState: 'connected', isConnected: true });
      this.events?.onCallAnswered();
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to handle offer:', error);
    }
  }

  private async handleAnswer(answer: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) return;
    try {
      if (this.peerConnection.signalingState === 'have-local-offer') {
        await this.peerConnection.setRemoteDescription(answer);
        this.isCallAnswered = true;
        this.clearCallTimeout();
        this.updateState({ connectionState: 'connected', isConnected: true });
        if (!this.didEmitAnswered) {
          this.didEmitAnswered = true;
          this.events?.onCallAnswered();
        }
        this.clearReofferLoop();
        this.markConnectedOnce();
      }
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to handle answer:', error);
    }
  }

  private sendSignalingMessage(message: any): void {
    if (this.signalingChannel?.readyState === 1) {
      this.signalingChannel.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
      if (!this.signalingFlushTimer) {
        this.signalingFlushTimer = setInterval(() => {
          if (this.signalingChannel?.readyState === 1) {
            this.flushSignalingQueue();
            if (this.signalingFlushTimer) {
              clearInterval(this.signalingFlushTimer);
              this.signalingFlushTimer = null;
            }
          }
        }, 500);
      }
    }
  }

  private flushSignalingQueue(): void {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      this.signalingChannel?.send(JSON.stringify(msg));
    }
  }

  async acceptIncomingCall(): Promise<void> {
    await this.processIncomingCall();
  }

  async processIncomingCall(): Promise<void> {
    try {
      if (this.didConnect || this.peerConnection?.connectionState === 'connected') {
        console.log('⏭️ [AudioCallService] Skipping processIncomingCall — already connected');
        return;
      }
      if (this.signalingChannel?.readyState !== 1) {
        await this.connectSignaling(this.appointmentId!, this.userId!);
      }
      await this.markCallAsAnsweredInBackend();
      const offer = this.pendingOffer || (global as any).pendingOffer;
      if (!offer) {
        this.sendSignalingMessage({ type: 'resend-offer-request', appointmentId: this.appointmentId, userId: this.userId });
        this.hasAccepted = true;
        return;
      }
      this.localStream = await mediaDevices.getUserMedia({
        video: false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any
      });
      await this.configureAudioRouting();
      await this.initializePeerConnection();
      await this.handleOffer(offer);
      this.hasAccepted = true;
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to process incoming call:', error);
    }
  }

  private async attemptReconnection(): Promise<void> {
    if (this.isReconnecting || this.hasEnded) return;
    this.isReconnecting = true;
    this.updateState({ connectionState: 'reconnecting' });
    try {
      if (this.peerConnection) this.peerConnection.close();
      await this.initializePeerConnection();
      if (!this.isIncoming) await this.createOffer();
    } catch (error) {
      console.error('❌ [AudioCallService] Reconnection attempt failed:', error);
    }
    this.isReconnecting = false;
  }

  private async connectSignaling(appointmentId: string, userId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const signalingUrl = environment.WEBRTC_SIGNALING_URL;

      // Determine user type - if appointment ID starts with text_session_, it's a doctor if we're not the patient
      let userType = (global as any).userType;
      if (!userType) {
        // Fallback: if we are in doctor mode globally or have doctor in params
        userType = (global as any).isDoctor ? 'doctor' : 'patient';
      }

      const wsUrl = `${signalingUrl}?appointmentId=${encodeURIComponent(appointmentId)}&userId=${encodeURIComponent(userId)}&userType=${encodeURIComponent(userType)}`;
      try {
        this.signalingChannel = new SecureWebSocketService({
          url: wsUrl,
          onOpen: () => {
            this.flushSignalingQueue();
            resolve();
          },
          onMessage: async (message: any) => {
            try {
              // message is already parsed by SecureWebSocketService
              switch (message.type) {
                case 'offer':
                  if (this.didConnect) {
                    console.log('⏭️ [AudioCallService] Ignoring offer — call already connected');
                    break;
                  }
                  if (this.isIncoming || this.isIncomingMode) {
                    this.pendingOffer = message.offer;
                    if (this.hasAccepted) await this.processIncomingCall();
                  } else {
                    await this.handleOffer(message.offer);
                  }
                  break;
                case 'answer': await this.handleAnswer(message.answer); break;
                case 'ice-candidate': await this.handleIceCandidate(message.candidate); break;
                case 'call-ended': this.endCall(); break;
                case 'call-answered': this.handleCallAnswered(); break;
                case 'call-rejected': this.handleCallRejected(); break;
                case 'call-timeout': this.handleCallTimeout(); break;
                case 'resend-offer-request':
                  if (!this.isIncoming && !this.isIncomingMode && this.peerConnection) {
                    console.log('🔄 [AudioCallService] Received resend-offer-request, creating new offer');
                    await this.createOffer();
                  }
                  break;
              }
            } catch (error) {
              console.error('❌ [AudioCallService] Error processing signaling message:', error);
            }
          },
          onClose: () => { this.updateState({ connectionState: 'disconnected' }); },
        });
        await this.signalingChannel.connect();
      } catch (error) { reject(error); }
    });
  }

  private async configureAudioRouting(): Promise<void> {
    try {
      if (InCallManager) InCallManager.start({ media: 'audio' });
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to configure audio routing:', error);
    }
  }

  private async resetAudioRouting(): Promise<void> {
    try {
      if (InCallManager) InCallManager.stop();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to reset audio routing:', error);
    }
  }

  private async getAuthToken(): Promise<string> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return await AsyncStorage.getItem('auth_token') || '';
    } catch (error) {
      console.error('❌ [AudioCallService] Failed to get auth token:', error);
      return '';
    }
  }
}

export { AudioCallService };
export default AudioCallService.getInstance();
