import { RealTimeEventService } from './realTimeEventService';
import { SecureWebSocketService } from './secureWebSocketService';

/**
 * Global Event Service handles the persistent WebSocket connection
 * for real-time system updates (appointments, payments, etc.)
 */
export class GlobalEventService {
    private static instance: GlobalEventService | null = null;
    private ws: SecureWebSocketService | null = null;
    private userId: string | null = null;
    private userType: 'patient' | 'doctor' | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isManuallyClosed = false;

    private buildUrl(): string {
        // Use the same host as the signaling server, which is defined in env
        // Based on .env: EXPO_PUBLIC_WEBRTC_SIGNALING_URL=wss://docavailable.org/call-signaling
        // We use the same host but the /global-events path
        const baseUrl = process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL || 'wss://docavailable.org/call-signaling';
        const url = new URL(baseUrl);
        url.pathname = '/global-events';
        url.searchParams.set('userId', this.userId || '');
        url.searchParams.set('userType', this.userType || '');
        return url.toString();
    }

    static getInstance(): GlobalEventService {
        if (!this.instance) {
            this.instance = new GlobalEventService();
        }
        return this.instance;
    }

    /**
     * Start the global event listener for a user
     */
    async connect(userId: string, userType: 'patient' | 'doctor') {
        if (this.ws && this.userId === userId) {
            console.log('📡 [GlobalEvent] Already connected for user:', userId);
            return;
        }

        this.disconnect();
        this.userId = userId;
        this.userType = userType;
        this.isManuallyClosed = false;

        const url = this.buildUrl();
        console.log('📡 [GlobalEvent] Connecting to:', url);

        this.ws = new SecureWebSocketService({
            url,
            onOpen: () => {
                console.log('✅ [GlobalEvent] Connection established');
                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                    this.reconnectTimeout = null;
                }
            },
            onMessage: (data) => {
                try {
                    this.handleIncomingEvent(data);
                } catch (error) {
                    console.error('❌ [GlobalEvent] Error handling event:', error);
                }
            },
            onClose: (event) => {
                console.log('🔌 [GlobalEvent] Connection closed:', event.code, event.reason);
                if (!this.isManuallyClosed) {
                    this.scheduleReconnect();
                }
            },
            onError: (error) => {
                console.error('❌ [GlobalEvent] Socket error:', error);
            }
        });

        try {
            await this.ws.connect();
        } catch (error) {
            console.error('❌ [GlobalEvent] Failed to connect:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle incoming events and route them to RealTimeEventService
     */
    private handleIncomingEvent(data: any) {
        if (!data || !data.type) return;

        console.log('📨 [GlobalEvent] Received event:', data.type);

        switch (data.type) {
            case 'appointment_created':
            case 'appointment_confirmed':
            case 'appointment_cancelled':
            case 'appointment_completed':
            case 'appointment_updated': {
                const action = data.type.replace('appointment_', '');
                RealTimeEventService.handleAppointmentEvent(
                    action as any,
                    data.appointment || data.data,
                    this.userType as any
                );
                break;
            }
            case 'session_started':
            case 'session_ended':
            case 'session_completed': {
                const action = data.type.replace('session_', '');
                RealTimeEventService.handleSessionEvent(
                    action as any,
                    data.session || data.data,
                    this.userType as any
                );
                break;
            }
            case 'payment_received':
            case 'payment_processed':
            case 'payment_deducted': {
                const action = data.type.replace('payment_', '');
                RealTimeEventService.handlePaymentEvent(
                    action as any,
                    data.payment || data.data,
                    this.userType as any
                );
                break;
            }
            case 'new_message': {
                RealTimeEventService.handleMessageEvent(
                    'received',
                    data.message || data.data,
                    this.userType as any
                );
                break;
            }
            case 'notification-connection-established':
                console.log('🤝 [GlobalEvent] Handshake confirmed');
                break;
            default:
                console.log('❓ [GlobalEvent] Unhandled event type:', data.type);
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout || this.isManuallyClosed) return;

        console.log('🔄 [GlobalEvent] Scheduling reconnect in 5s...');
        this.reconnectTimeout = setTimeout(() => {
            if (this.userId && this.userType) {
                this.connect(this.userId, this.userType);
            }
        }, 5000);
    }

    /**
     * Stop the global event listener
     */
    disconnect() {
        this.isManuallyClosed = true;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        console.log('🔌 [GlobalEvent] Disconnected');
    }
}

export const globalEventService = GlobalEventService.getInstance();
export default globalEventService;
