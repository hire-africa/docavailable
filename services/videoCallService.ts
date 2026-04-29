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

export interface VideoCallState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isFrontCamera: boolean;
  callDuration: number;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'reconnecting';
}

export interface VideoCallEvents {
  onStateChange: (state: VideoCallState) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
  onCallRejected: (rejectedBy?: string) => void;
  onCallTimeout: () => void;
  onCallAnswered?: () => void;
  onPeerMediaStateChange?: (payload: { audioEnabled: boolean; videoEnabled: boolean }) => void;
  onError?: (error: string) => void;
}

class VideoCallService {
  private static instanceCounter = 0;
  private static activeInstance: VideoCallService | null = null;
  private instanceId: number;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingChannel: SecureWebSocketService | null = null;
  private callTimer: ReturnType<typeof setInterval> | null = null;
  private callStartTime: number = 0;
  private events: VideoCallEvents | null = null;
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
  private isFrontCamera: boolean = true;
  private disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;

  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  private state: VideoCallState = {
    isConnected: false,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isFrontCamera: true,
    callDuration: 0,
    connectionState: 'disconnected',
  };

  constructor() {
    this.instanceId = ++VideoCallService.instanceCounter;
  }

  static getInstance(): VideoCallService {
    if (!VideoCallService.activeInstance) {
      VideoCallService.activeInstance = new VideoCallService();
    }
    return VideoCallService.activeInstance;
  }

  static clearInstance(): void {
    if (VideoCallService.activeInstance) {
      VideoCallService.activeInstance.destroyResources();
      VideoCallService.activeInstance = null;
    }
  }

  private async cancelCallInBackend(): Promise<void> {
    if (!this.appointmentId) return;
    try {
      const authToken = await this.getAuthToken();
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({
          call_type: 'video',
          appointment_id: this.appointmentId,
          session_duration: 0,
          was_connected: false
        })
      });
      const data = await response.json().catch(() => null);
      console.log('📥 [VideoCallService] cancel response:', response.status, JSON.stringify(data));
    } catch (e) {
      console.error('❌ [VideoCallService] Failed to cancel call session:', e);
    }
  }

  // Removed dead/non-functional declineCallInBackend (using cancelCallInBackend fallback instead)

  private releaseMediaStream(stream: MediaStream | null): void {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
          stream.removeTrack(track);
        } catch (e) {
          console.warn(`⚠️ [VideoCallService] Error stopping track: ${track.kind}`, e);
        }
      });
    }
  }

  async initializeForIncomingCall(appointmentId: string, userId: string, events: VideoCallEvents): Promise<void> {
    try {
      this.isIncoming = true;
      (global as any).currentCallType = 'video';
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
      console.error('❌ [VideoCallService] Failed to initialize incoming call:', error.message);
      this.updateState({ connectionState: 'failed' });
    }
  }

  async initialize(appointmentId: string, userId: string, doctorId: string | number | undefined, events: VideoCallEvents): Promise<void> {
    try {
      // Set global flag early to close the race condition window
      (global as any).activeVideoCall = true;
      (global as any).currentCallType = 'video';

      if (this.isInitializing) return;
      this.isInitializing = true;

      const g: any = global as any;
      if (g.activeAudioCall || g.activeVideoCall === true && VideoCallService.activeInstance !== this) {
        console.warn('⚠️ [VideoCallService] Another call is already active');
        this.isInitializing = false;
        (global as any).activeVideoCall = false; // Reset if blocked
        return;
      }
      this.isIncoming = false;
      this.events = events;
      this.appointmentId = appointmentId;
      this.userId = userId;
      this.updateState({ connectionState: 'connecting' });
      await this.connectSignaling(appointmentId, userId);
      this.localStream = await mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: true
      });
      await this.configureAudioRouting();
      await this.initializePeerConnection();
      await this.createOffer();
      this.startReofferLoop();
      this.startCallTimeout();
      this.isInitializing = false;
    } catch (error: any) {
      console.error('❌ [VideoCallService] Failed to initialize call:', error.message);
      // Clean up any resources acquired before the failure
      this.releaseMediaStream(this.localStream);
      this.localStream = null;
      if (this.signalingChannel) {
        try { this.signalingChannel.close(); } catch (e) { }
        this.signalingChannel = null;
      }
      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch (e) { }
        this.peerConnection = null;
      }
      this.clearReofferLoop();
      this.clearCallTimeout();
      (global as any).activeVideoCall = false;
      if ((global as any).currentCallType === 'video') (global as any).currentCallType = null;
      this.updateState({ connectionState: 'failed' });
      this.isInitializing = false;
    }
  }

  private updateState(updates: Partial<VideoCallState>): void {
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
      console.error('❌ [VideoCallService] Failed to create offer:', error);
    } finally {
      this.creatingOffer = false;
    }
  }

  private startReofferLoop(): void {
    this.clearReofferLoop();
    this.reofferTimer = setInterval(() => {
      if (this.peerConnection?.localDescription && this.state.connectionState === 'connecting') {
        console.log('🔄 [VideoCallService] Re-sending offer to ensure signaling delivery');
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
    this.events?.onCallAnswered?.();
  }

  private handleCallRejected(rejectedBy?: string): void {
    this.endCall();
    this.events?.onCallRejected(rejectedBy);
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
      console.error('❌ [VideoCallService] Failed to mark call as answered in backend:', error);
    }
  }

  private async updateCallSessionInBackend(duration: number, wasConnected: boolean): Promise<void> {
    if (!this.appointmentId) return;
    try {
      const authToken = await this.getAuthToken();
      const response = await fetch(`${environment.LARAVEL_API_URL}/api/call-sessions/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({
          call_type: 'video',
          appointment_id: this.appointmentId,
          session_duration: duration,
          was_connected: wasConnected
        })
      });
      const data = await response.json().catch(() => null);
      console.log('📥 [VideoCallService] end response:', response.status, JSON.stringify(data));
    } catch (error) {
      console.error('❌ [VideoCallService] Failed to update call session in backend:', error);
    }
  }

  async endCall(): Promise<void> {
    if (this.hasEnded) return;
    this.hasEnded = true;
    this.stopCallTimer();
    this.clearCallTimeout();
    this.clearReofferLoop();

    if (this.signalingFlushTimer) {
      clearInterval(this.signalingFlushTimer);
      this.signalingFlushTimer = null;
    }
    this.messageQueue = [];

    const wasConnected = this.state.isConnected;
    const duration = Math.floor((Date.now() - this.callStartTime) / 1000);

    if (!wasConnected) {
      await this.cancelCallInBackend();
    } else {
      await this.updateCallSessionInBackend(duration, true);
    }
    this.sendSignalingMessage({ type: 'call-ended', senderId: this.userId, appointmentId: this.appointmentId });

    await new Promise(resolve => setTimeout(resolve, 500));

    if (this.signalingChannel) {
      this.signalingChannel.close();
      this.signalingChannel = null;
    }

    this.releaseMediaStream(this.localStream);
    this.localStream = null;
    this.releaseMediaStream(this.remoteStream);
    this.remoteStream = null;

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    await this.resetAudioRouting();
    this.updateState({ isConnected: false, connectionState: 'disconnected' });
    this.events?.onCallEnded();
    (global as any).activeVideoCall = false;
    if ((global as any).currentCallType === 'video') (global as any).currentCallType = null;
  }

  async declineCall(isDoctor: boolean = false): Promise<void> {
    if (this.hasEnded) return;
    this.hasEnded = true;

    this.stopCallTimer();
    this.clearCallTimeout();
    this.clearReofferLoop();

    if (this.signalingFlushTimer) {
      clearInterval(this.signalingFlushTimer);
      this.signalingFlushTimer = null;
    }
    this.messageQueue = [];

    // Send rejection with context
    this.sendSignalingMessage({
      type: 'call-rejected',
      senderId: this.userId,
      appointmentId: this.appointmentId,
      rejectedBy: isDoctor ? 'doctor' : 'patient',
    });

    // Simplify: treat decline same as cancel-before-connected
    // This avoids the broken /call-sessions/decline endpoint (500)
    await this.cancelCallInBackend();

    await new Promise(resolve => setTimeout(resolve, 500));

    if (this.signalingChannel) {
      this.signalingChannel.close();
      this.signalingChannel = null;
    }

    this.releaseMediaStream(this.localStream);
    this.localStream = null;
    this.releaseMediaStream(this.remoteStream);
    this.remoteStream = null;

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    await this.resetAudioRouting();
    this.updateState({ isConnected: false, connectionState: 'disconnected' });
    this.events?.onCallEnded();
    (global as any).activeVideoCall = false;
    if ((global as any).currentCallType === 'video') (global as any).currentCallType = null;
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

  toggleVideo(): boolean {
    if (this.localStream) {
      const track = this.localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        this.updateState({ isVideoEnabled: track.enabled });
        return track.enabled;
      }
    }
    return false;
  }

  async switchCamera(): Promise<void> {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack && (videoTrack as any)._switchCamera) {
        (videoTrack as any)._switchCamera();
        this.isFrontCamera = !this.isFrontCamera;
        this.updateState({ isFrontCamera: this.isFrontCamera });
      }
    }
  }

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
      console.error('❌ [VideoCallService] Failed to handle ICE candidate:', error);
    }
  }

  private async initializePeerConnection(): Promise<void> {
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (error) {
        console.error('❌ [VideoCallService] Error closing peer connection:', error);
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
        console.error('❌ [VideoCallService] Error in track listener:', error);
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
      console.log(`📡 [VideoCallService] Connection state changed: ${state}`);
      if (state === 'connected') {
        this.markConnectedOnce();
      } else if (state === 'disconnected' || state === 'failed') {
        if (this.isInitializing || (!this.isIncoming && !this.isCallAnswered)) return;
        // Grace period: only reconnect if we were connected for at least 3s
        if (this.didConnect && (Date.now() - this.callStartTime) < 3000) return;
        this.attemptReconnection();
      }
    });
    this.peerConnection.addEventListener('iceconnectionstatechange', () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log(`🧊 [VideoCallService] ICE connection state changed: ${state}`);
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
    // CRITICAL: Once connected, never re-process offers — they are stale re-offers
    if (this.didConnect) {
      console.log('⏭️ [VideoCallService] Ignoring offer — already connected');
      return;
    }
    if (this.hasAccepted && this.peerConnection.remoteDescription) return;
    try {
      const state = this.peerConnection.signalingState;
      if (state !== 'stable') {
        if (state === 'have-local-offer') {
          await this.peerConnection.setLocalDescription({ type: 'rollback' } as any);
        } else {
          // Don't destroy the PC — just log and return
          console.log(`⚠️ [VideoCallService] Ignoring offer in signalingState: ${state}`);
          return;
        }
      }
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.processPendingCandidates();
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
      this.events?.onCallAnswered?.();
    } catch (error) {
      console.error('❌ [VideoCallService] Failed to handle offer:', error);
    }
  }

  private async handleAnswer(answer: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) return;
    try {
      if (this.peerConnection.signalingState === 'have-local-offer') {
        await this.peerConnection.setRemoteDescription(answer);
        this.processPendingCandidates();
        this.isCallAnswered = true;
        this.clearCallTimeout();
        this.updateState({ connectionState: 'connected', isConnected: true });
        if (!this.didEmitAnswered) {
          this.didEmitAnswered = true;
          this.events?.onCallAnswered?.();
        }
        this.clearReofferLoop();
        this.markConnectedOnce();
      }
    } catch (error) {
      console.error('❌ [VideoCallService] Failed to handle answer:', error);
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

  private processPendingCandidates(): void {
    if (this.peerConnection?.remoteDescription) {
      console.log(`📥 [VideoCallService] Processing ${this.pendingCandidates.length} pending candidates`);
      this.pendingCandidates.forEach(async candidate => {
        try {
          await this.peerConnection!.addIceCandidate(candidate);
        } catch (error) {
          console.error('❌ [VideoCallService] Failed to add pending candidate:', error);
        }
      });
      this.pendingCandidates = [];
    }
  }

  async acceptIncomingCall(): Promise<void> {
    await this.processIncomingCall();
  }

  async processIncomingCall(): Promise<void> {
    try {
      // CRITICAL: Never re-process if already connected
      if (this.didConnect || this.peerConnection?.connectionState === 'connected') {
        console.log('⏭️ [VideoCallService] Skipping processIncomingCall — already connected');
        return;
      }
      if (!this.isConnectedToSignaling()) {
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
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: true
      });
      await this.configureAudioRouting();
      await this.initializePeerConnection();
      await this.handleOffer(offer);
      this.hasAccepted = true;
    } catch (error) {
      console.error('❌ [VideoCallService] Failed to process incoming call:', error);
      // Clean up any resources acquired before the failure
      this.releaseMediaStream(this.localStream);
      this.localStream = null;
      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch (e) { }
        this.peerConnection = null;
      }
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
      console.error('❌ [VideoCallService] Reconnection attempt failed:', error);
    }
    this.isReconnecting = false;
  }

  private async connectSignaling(appointmentId: string, userId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const signalingUrl = environment.WEBRTC_SIGNALING_URL;

      // Determine user type
      let userType = (global as any).userType;
      if (!userType) {
        userType = (global as any).isDoctor ? 'doctor' : 'patient';
      }

      const wsUrl = `${signalingUrl}?appointmentId=${encodeURIComponent(appointmentId)}&userId=${encodeURIComponent(userId)}&userType=${encodeURIComponent(userType)}`;
      try {
        this.signalingChannel = new SecureWebSocketService({
          url: wsUrl,
          onOpen: () => {
            console.log('✅ [VideoCallService] Signaling connected, flushing queue');
            this.flushSignalingQueue();
            resolve();
          },
          onMessage: async (message: any) => {
            try {
              // message is already parsed by SecureWebSocketService
              switch (message.type) {
                case 'offer':
                  // CRITICAL: Ignore offers once connected — prevents PC churn
                  if (this.didConnect) {
                    console.log('⏭️ [VideoCallService] Ignoring offer — call already connected');
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
                case 'call-rejected': this.handleCallRejected(message.rejectedBy); break;
                case 'call-timeout': this.handleCallTimeout(); break;
                case 'resend-offer-request':
                  if (!this.isIncoming && !this.isIncomingMode && this.peerConnection) {
                    console.log('🔄 [VideoCallService] Received resend-offer-request, creating new offer');
                    await this.createOffer();
                  }
                  break;
              }
            } catch (error) {
              console.error('❌ [VideoCallService] Error processing signaling message:', error);
            }
          },
          onClose: () => { this.updateState({ connectionState: 'disconnected' }); },
        });
        await this.signalingChannel.connect();
      } catch (error) { reject(error); }
    });
  }

  private isConnectedToSignaling(): boolean {
    return this.signalingChannel?.readyState === 1;
  }

  private async configureAudioRouting(): Promise<void> {
    try {
      if (InCallManager) InCallManager.start({ media: 'video' });
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
    } catch (error) {
      console.error('❌ [VideoCallService] Failed to configure audio routing:', error);
    }
  }

  private async resetAudioRouting(): Promise<void> {
    try {
      if (InCallManager) InCallManager.stop();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
    } catch (error) {
      console.error('❌ [VideoCallService] Failed to reset audio routing:', error);
    }
  }

  private async getAuthToken(): Promise<string> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return await AsyncStorage.getItem('auth_token') || '';
    } catch (error) {
      console.error('❌ [VideoCallService] Failed to get auth token:', error);
      return '';
    }
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

    // Fix: clear signaling flush timer and queue (was missing)
    if (this.signalingFlushTimer) {
      clearInterval(this.signalingFlushTimer);
      this.signalingFlushTimer = null;
    }
    this.messageQueue = [];

    // Fix: close signaling channel (was missing)
    if (this.signalingChannel) {
      try { this.signalingChannel.close(); } catch (e) { }
      this.signalingChannel = null;
    }

    // Fix: clear disconnect grace timer (was missing)
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);
      this.disconnectGraceTimer = null;
    }

    this.releaseMediaStream(this.localStream);
    this.localStream = null;
    this.releaseMediaStream(this.remoteStream);
    this.remoteStream = null;

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.state = {
      isConnected: false,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isFrontCamera: true,
      callDuration: 0,
      connectionState: 'disconnected'
    };

    // Clear global flags in reset to prevent stale state blocking new calls
    (global as any).activeVideoCall = false;
    if ((global as any).currentCallType === 'video') (global as any).currentCallType = null;
  }

  /**
   * SYNC-SAFE: Immediately releases ALL native resources without any awaits.
   * Designed to be called from React cleanup functions (useEffect return),
   * clearInstance(), or any context that cannot await async methods.
   * Does NOT send backend notifications — use endCall() for graceful termination.
   */
  destroyResources(): void {
    if (this.hasEnded) {
      console.log('⏭️ [VideoCallService] destroyResources skipped — already ended');
      return;
    }
    console.log('🧹 [VideoCallService] destroyResources — sync cleanup');

    // 0. Capture appointmentId before nulling — needed for backend cancel
    const appointmentId = this.appointmentId;
    const wasConnected = this.state.isConnected;

    // 1. Stop all timers
    this.stopCallTimer();
    this.clearCallTimeout();
    this.clearReofferLoop();
    if (this.signalingFlushTimer) {
      clearInterval(this.signalingFlushTimer);
      this.signalingFlushTimer = null;
    }
    this.messageQueue = [];
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);
      this.disconnectGraceTimer = null;
    }

    // 2. Release media streams (sync on RN WebRTC)
    this.releaseMediaStream(this.localStream);
    this.localStream = null;
    this.releaseMediaStream(this.remoteStream);
    this.remoteStream = null;

    // 3. Close peer connection
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) { }
      this.peerConnection = null;
    }

    // 4. Close signaling channel
    if (this.signalingChannel) {
      try { this.signalingChannel.close(); } catch (e) { }
      this.signalingChannel = null;
    }

    // 5. Reset all flags
    this.hasEnded = true;
    this.isInitializing = false;
    this.creatingOffer = false;
    this.isReconnecting = false;
    this.didConnect = false;
    this.didEmitAnswered = false;
    this.isCallAnswered = false;

    // 6. Reset global flags
    (global as any).activeVideoCall = false;
    if ((global as any).currentCallType === 'video') (global as any).currentCallType = null;

    // 7. Reset audio routing (fire & forget — ok if this fails)
    this.resetAudioRouting().catch(() => { });

    // 8. Null events to prevent callbacks into unmounted components
    this.events = null;

    // 9. Reset state
    this.state = {
      isConnected: false,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isFrontCamera: true,
      callDuration: 0,
      connectionState: 'disconnected'
    };

    // 10. Fire-and-forget backend cancel so DB doesn't stay stuck on "connecting"
    //     Only for calls that never connected (connected calls should use endCall() for billing)
    if (appointmentId && !wasConnected) {
      this.appointmentId = appointmentId; // Temporarily restore for the cancel call
      this.cancelCallInBackend().catch((e) => {
        console.warn('⚠️ [VideoCallService] destroyResources: backend cancel failed (non-fatal):', e);
      }).finally(() => {
        this.appointmentId = null;
      });
    } else {
      this.appointmentId = null;
    }
  }

  getState(): VideoCallState { return this.state; }
  getLocalStream(): MediaStream | null { return this.localStream; }
  getRemoteStream(): MediaStream | null { return this.remoteStream; }
}

export { VideoCallService };
export default VideoCallService.getInstance();
