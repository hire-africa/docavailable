export interface WebRTCSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-ended';
  appointmentId: string;
  userId: number;
  senderId?: number;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  timestamp: string;
}

export interface WebRTCSignalingConfig {
  baseUrl: string;
  appointmentId: string;
  apiKey: string;
}
