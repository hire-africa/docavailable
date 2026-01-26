import RNCallKeep from 'react-native-callkeep';
import 'react-native-get-random-values';

class CallKeepService {
  private initialized = false;
  private currentCallId: string | null = null;

  private uuidv4(): string {
    if ((global as any)?.crypto?.randomUUID) {
      return (global as any).crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    (global as any).crypto?.getRandomValues?.(bytes);
    // Per RFC 4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const b = Array.from(bytes, toHex);
    return (
      b[0] + b[1] + b[2] + b[3] + '-' +
      b[4] + b[5] + '-' +
      b[6] + b[7] + '-' +
      b[8] + b[9] + '-' +
      b[10] + b[11] + b[12] + b[13] + b[14] + b[15]
    );
  }

  async setup() {
    if (this.initialized) return;

    try {
      const options = {
        ios: {
          appName: 'DocAvailable',
          supportsVideo: true,
        },
        android: {
          alertTitle: 'Permissions Required',
          alertDescription: 'DocAvailable needs access to your phone accounts',
          cancelButton: 'Cancel',
          okButton: 'OK',
          imageName: 'ic_launcher',
          additionalPermissions: [],
          selfManaged: false,
          foregroundService: {
            channelId: 'com.docavailable.callkeep',
            channelName: 'Incoming Calls',
            notificationTitle: 'DocAvailable is running',
            notificationIcon: 'ic_launcher',
          },
        },
      };

      await RNCallKeep.setup(options);
      this.initialized = true;

      console.log('CallKeep initialized successfully');
    } catch (error) {
      console.error('CallKeep setup error:', error);
    }
  }

  async displayIncomingCall(
    callId: string,
    callerName: string,
    appointmentId: string,
    callType: string
  ) {
    try {
      await this.setup();

      this.currentCallId = callId;

      // Store metadata for retrieval when call is answered
      const handle = appointmentId;
      const hasVideo = callType === 'video';

      RNCallKeep.displayIncomingCall(
        callId,
        handle,
        callerName,
        'generic',
        hasVideo,
        {
          alertTitle: 'Incoming Call',
          alertDescription: 'Call from ' + callerName,
          android: {
            ringtoneUri: 'content://settings/system/ringtone',
            skipCallLog: false,
            skipNotification: false,
          },
        }
      );

      console.log('CallKeep: Incoming call displayed', {
        callId,
        callerName,
        appointmentId,
        callType,
      });
    } catch (error) {
      console.error('CallKeep displayIncomingCall error:', error);
    }
  }

  async answerCall(callId: string) {
    try {
      RNCallKeep.answerIncomingCall(callId);
      console.log('CallKeep: Call answered', callId);
    } catch (error) {
      console.error('CallKeep answerCall error:', error);
    }
  }

  async endCall(callId: string) {
    try {
      RNCallKeep.endCall(callId);
      if (this.currentCallId === callId) {
        this.currentCallId = null;
      }
      console.log('CallKeep: Call ended', callId);
    } catch (error) {
      console.error('CallKeep endCall error:', error);
    }
  }

  async endAllCalls() {
    try {
      RNCallKeep.endAllCalls();
      this.currentCallId = null;
      console.log('CallKeep: All calls ended');
    } catch (error) {
      console.error('CallKeep endAllCalls error:', error);
    }
  }

  async rejectCall(callId: string) {
    try {
      RNCallKeep.rejectCall(callId);
      if (this.currentCallId === callId) {
        this.currentCallId = null;
      }
      console.log('CallKeep: Call rejected', callId);
    } catch (error) {
      console.error('CallKeep rejectCall error:', error);
    }
  }

  getCurrentCallId(): string | null {
    return this.currentCallId;
  }

  generateCallId(): string {
    return this.uuidv4();
  }
}

export default new CallKeepService();
