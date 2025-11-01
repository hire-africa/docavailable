import RNCallKeep from 'react-native-callkeep';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

class CallKeepService {
  private initialized = false;
  private currentCallId: string | null = null;

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
        hasVideo
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
    return uuidv4();
  }
}

export default new CallKeepService();
