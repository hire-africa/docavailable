import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message } from './messageStorageService';

// Full ended session payload stored locally
export interface EndedSession {
  appointment_id: number;
  doctor_id?: number;
  doctor_name?: string;
  doctor_profile_picture_url?: string;
  doctor_profile_picture?: string;
  patient_id: number;
  patient_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  ended_at: string;
  session_duration?: number; // minutes
  session_summary?: string;
  messages: Message[];
  message_count: number;
}

// Lightweight metadata for list rendering (used by messages tab)
export interface EndedSessionMetadata {
  appointmentId: number;
  patient_id: number;
  doctor_name?: string;
  doctor_profile_picture_url?: string;
  doctor_profile_picture?: string;
  appointment_date?: string;
  ended_at: string;
  session_duration?: number; // minutes
}

const SESSION_KEY = (appointmentId: number) => `ended_session:${appointmentId}`;
const META_KEY = (appointmentId: number) => `ended_session_meta:${appointmentId}`;
const INDEX_KEY = (userId: number, userType: 'patient' | 'doctor') => `ended_sessions_idx:${userType}:${userId}`; // stores number[] of appointmentIds
const MAX_SESSIONS_PER_PATIENT = 50;
const MAX_SESSIONS_PER_DOCTOR = 50;

async function addToUserIndex(userId: number, userType: 'patient' | 'doctor', appointmentId: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY(userId, userType));
    const list: number[] = raw ? JSON.parse(raw) : [];
    const dedup = [appointmentId, ...list.filter(id => id !== appointmentId)].slice(0, userType === 'patient' ? MAX_SESSIONS_PER_PATIENT : MAX_SESSIONS_PER_DOCTOR);
    await AsyncStorage.setItem(INDEX_KEY(userId, userType), JSON.stringify(dedup));
  } catch (e) {
    console.error(`Error updating ended sessions index for ${userType}:`, e);
  }
}

async function removeFromUserIndex(userId: number, userType: 'patient' | 'doctor', appointmentId: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY(userId, userType));
    const list: number[] = raw ? JSON.parse(raw) : [];
    const next = list.filter(id => id !== appointmentId);
    await AsyncStorage.setItem(INDEX_KEY(userId, userType), JSON.stringify(next));
  } catch (e) {
    console.error(`Error removing from ended sessions index for ${userType}:`, e);
  }
}

export const endedSessionStorageService = {
  // Store a full ended session and update metadata and index
  async storeEndedSession(session: EndedSession): Promise<void> {
    try {
      const meta: EndedSessionMetadata = {
        appointmentId: session.appointment_id,
        patient_id: session.patient_id,
        doctor_name: session.doctor_name,
        doctor_profile_picture_url: session.doctor_profile_picture_url,
        doctor_profile_picture: session.doctor_profile_picture,
        appointment_date: session.appointment_date,
        ended_at: session.ended_at,
        session_duration: session.session_duration,
      };

      await AsyncStorage.setItem(SESSION_KEY(session.appointment_id), JSON.stringify(session));
      await AsyncStorage.setItem(META_KEY(session.appointment_id), JSON.stringify(meta));
      await addToUserIndex(session.patient_id, 'patient', session.appointment_id);
      // Also add to doctor's index if doctor_id is available
      if (session.doctor_id) {
        await addToUserIndex(session.doctor_id, 'doctor', session.appointment_id);
      }
    } catch (error) {
      console.error('Error storing ended session:', error);
      throw error;
    }
  },

  // Store ended session for both patient and doctor
  async storeEndedSessionForBoth(session: EndedSession): Promise<void> {
    try {
      const meta: EndedSessionMetadata = {
        appointmentId: session.appointment_id,
        patient_id: session.patient_id,
        doctor_name: session.doctor_name,
        doctor_profile_picture_url: session.doctor_profile_picture_url,
        doctor_profile_picture: session.doctor_profile_picture,
        appointment_date: session.appointment_date,
        ended_at: session.ended_at,
        session_duration: session.session_duration,
      };

      await AsyncStorage.setItem(SESSION_KEY(session.appointment_id), JSON.stringify(session));
      await AsyncStorage.setItem(META_KEY(session.appointment_id), JSON.stringify(meta));
      
      // Add to both patient and doctor indexes
      await addToUserIndex(session.patient_id, 'patient', session.appointment_id);
      if (session.doctor_id) {
        await addToUserIndex(session.doctor_id, 'doctor', session.appointment_id);
      }
    } catch (error) {
      console.error('Error storing ended session for both parties:', error);
      throw error;
    }
  },

  // Backwards-compat simple wrapper
  async saveEndedSession(appointmentId: number, sessionData: any): Promise<void> {
    const endedAt = new Date().toISOString();
    const messages: Message[] = Array.isArray(sessionData?.messages) ? sessionData.messages : [];
    const session: EndedSession = {
      appointment_id: appointmentId,
      doctor_id: sessionData?.doctor_id,
      doctor_name: sessionData?.doctor_name,
      doctor_profile_picture_url: sessionData?.doctor_profile_picture_url,
      doctor_profile_picture: sessionData?.doctor_profile_picture,
      patient_id: sessionData?.patient_id,
      patient_name: sessionData?.patient_name,
      appointment_date: sessionData?.appointment_date,
      appointment_time: sessionData?.appointment_time,
      ended_at: sessionData?.ended_at || endedAt,
      session_duration: sessionData?.session_duration,
      session_summary: sessionData?.session_summary,
      messages,
      message_count: messages.length,
    };
    await this.storeEndedSession(session);
  },

  // List all ended sessions metadata for a user (patient or doctor)
  async getEndedSessionsByUser(userId: number, userType: 'patient' | 'doctor'): Promise<EndedSessionMetadata[]> {
    try {
      const raw = await AsyncStorage.getItem(INDEX_KEY(userId, userType));
      const ids: number[] = raw ? JSON.parse(raw) : [];
      const metas: EndedSessionMetadata[] = [];
      for (const id of ids) {
        const metaRaw = await AsyncStorage.getItem(META_KEY(id));
        if (metaRaw) {
          try {
            metas.push(JSON.parse(metaRaw));
          } catch {}
        }
      }
      // Sort by ended_at desc if available
      metas.sort((a, b) => {
        const tA = a.ended_at ? new Date(a.ended_at).getTime() : 0;
        const tB = b.ended_at ? new Date(b.ended_at).getTime() : 0;
        return tB - tA;
      });
      return metas;
    } catch (error) {
      console.error(`Error loading ended sessions for ${userType}:`, error);
    return [];
    }
  },

  // Backwards compatibility for patient-specific method
  async getEndedSessionsByPatient(patientId: number): Promise<EndedSessionMetadata[]> {
    return this.getEndedSessionsByUser(patientId, 'patient');
  },

  // New method for doctor-specific sessions
  async getEndedSessionsByDoctor(doctorId: number): Promise<EndedSessionMetadata[]> {
    return this.getEndedSessionsByUser(doctorId, 'doctor');
  },

  // Optional: list all ended sessions (not filtered) – not used but kept for completeness
  async getEndedSessions(): Promise<EndedSessionMetadata[]> {
    // This would require scanning all META_KEY entries; avoid for now
    return [];
  },
  
  async getEndedSession(appointmentId: number): Promise<EndedSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY(appointmentId));
      return raw ? (JSON.parse(raw) as EndedSession) : null;
    } catch (error) {
      console.error('Error loading ended session:', error);
      return null;
    }
  },

  async deleteEndedSession(appointmentId: number): Promise<void> {
    try {
      // Need patient id to update index
      const metaRaw = await AsyncStorage.getItem(META_KEY(appointmentId));
      const meta: EndedSessionMetadata | null = metaRaw ? JSON.parse(metaRaw) : null;
      await AsyncStorage.removeItem(SESSION_KEY(appointmentId));
      await AsyncStorage.removeItem(META_KEY(appointmentId));
      if (meta?.patient_id) {
        await removeFromUserIndex(meta.patient_id, 'patient', appointmentId);
        // Also remove from doctor's index if we have the session data
        const sessionRaw = await AsyncStorage.getItem(SESSION_KEY(appointmentId));
        if (sessionRaw) {
          try {
            const session: EndedSession = JSON.parse(sessionRaw);
            if (session.doctor_id) {
              await removeFromUserIndex(session.doctor_id, 'doctor', appointmentId);
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('Error deleting ended session:', error);
      throw error;
    }
  },

  async exportEndedSession(appointmentId: number): Promise<string> {
    try {
      const session = await this.getEndedSession(appointmentId);
      return JSON.stringify(session || {}, null, 2);
    } catch (error) {
      console.error('Error exporting ended session:', error);
    return '';
  }
  },
}; 