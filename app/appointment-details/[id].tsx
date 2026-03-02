import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AudioCallModal from '../../components/AudioCallModal';
import DirectBookingModal from '../../components/DirectBookingModal';
import { SessionType } from '../../components/SessionTypeSelectionModal';
import VideoCallModal from '../../components/VideoCallModal';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../services/apiService';

const AppointmentDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, userData } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session flow state
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [showDirectBookingModal, setShowDirectBookingModal] = useState(false);
  const [showAudioCallModal, setShowAudioCallModal] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [directSessionId, setDirectSessionId] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);

  // Live clock for time-based button state (updates every 30s)
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 30000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        console.log(`🔍 [AppointmentDetails] Fetching appointment ${id} for user ${user.id}`);
        const response: any = await apiService.get(`/appointments/${id}`);

        if (response.success && response.data) {
          // Map the response data to match expected format
          const data: any = response.data;
          const appt = {
            id: data.id,
            doctorName: data.doctor_name || 'Unknown Doctor',
            doctor_name: data.doctor_name,
            patient_name: data.patient_name,
            appointment_date: data.date || data.appointment_date,
            appointment_time: data.time || data.appointment_time,
            date: data.date || data.appointment_date,
            time: data.time || data.appointment_time,
            status: data.status,
            appointment_type: data.appointment_type || data.consultation_type,
            type: data.appointment_type || data.consultation_type,
            reason: data.reason,
            consultation_type: data.consultation_type,
            notes: data.notes,
            created_at: data.created_at,
            updated_at: data.updated_at,
            actual_start_time: data.actual_start_time,
            actual_end_time: data.actual_end_time,
            sessions_deducted: data.sessions_deducted,
            no_show: data.no_show,
            completed_at: data.completed_at,
            earnings_awarded: data.earnings_awarded,
            session_id: data.session_id,
            patient_id: data.patient_id,
            doctor_id: data.doctor_id,
          };
          setAppointment(appt);
        } else {
          setError(response.message || 'Failed to load appointment.');
        }
      } catch (e: any) {
        console.error('❌ [AppointmentDetails] Error fetching appointment:', e);
        const errorMessage = e?.response?.data?.message || e?.message || 'Failed to load appointment details.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [id, user?.id]);

  // Load user subscription on mount
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const response: any = await apiService.get('/subscription');
        if (response.success && response.data) {
          const sub: any = response.data;
          setCurrentSubscription({
            ...sub,
            voiceCallsRemaining: sub.voiceCallsRemaining ?? sub.voice_calls_remaining ?? 0,
            videoCallsRemaining: sub.videoCallsRemaining ?? sub.video_calls_remaining ?? 0,
            textSessionsRemaining: sub.textSessionsRemaining ?? sub.text_sessions_remaining ?? 0,
            isActive: sub.isActive ?? sub.is_active ?? false,
          });
        } else {
          setCurrentSubscription(null);
        }
      } catch (error) {
        console.error('❌ [AppointmentDetails] Error loading subscription:', error);
        setCurrentSubscription(null);
      }
    };
    loadSubscription();
  }, []);

  // ── Time-based session button logic ──────────────────────────────
  const getAppointmentDateTime = useCallback((): Date | null => {
    if (!appointment) return null;
    const dateStr = appointment.appointment_date || appointment.date;
    const timeStr = appointment.appointment_time || appointment.time;
    if (!dateStr || !timeStr) return null;
    try {
      // Normalise date to YYYY-MM-DD
      let isoDate = dateStr;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        isoDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
      return new Date(`${isoDate}T${timeStr}`);
    } catch {
      return null;
    }
  }, [appointment]);

  type SessionButtonState = 'too_early' | 'enabled' | 'expired';

  const getSessionButtonState = useCallback((): { state: SessionButtonState; minutesUntil?: number } => {
    const apptTime = getAppointmentDateTime();
    if (!apptTime || isNaN(apptTime.getTime())) return { state: 'enabled' }; // fallback: allow

    const enableTime = new Date(apptTime.getTime() - 10 * 60 * 1000); // 10 min before
    const disableTime = new Date(apptTime.getTime() + 30 * 60 * 1000); // 30 min after

    if (now < enableTime) {
      const minutesUntil = Math.ceil((enableTime.getTime() - now.getTime()) / 60000);
      return { state: 'too_early', minutesUntil };
    }
    if (now > disableTime) {
      return { state: 'expired' };
    }
    return { state: 'enabled' };
  }, [now, getAppointmentDateTime]);

  // ── Determine if appointment is confirmed ────────────────────────
  const isConfirmed = useCallback((): boolean => {
    if (!appointment) return false;
    const s = String(appointment.status).toLowerCase();
    return s === 'confirmed' || s === '1';
  }, [appointment]);

  // ── Map appointment type to SessionType ──────────────────────────
  const getSessionType = useCallback((): SessionType => {
    const t = (appointment?.appointment_type || appointment?.type || '').toLowerCase();
    if (t === 'voice' || t === 'audio') return 'audio';
    if (t === 'video') return 'video';
    return 'text';
  }, [appointment]);

  // ── Start Session handler (same as doctor-details Talk Now) ──────
  const handleStartSession = () => {
    if (!appointment) return;
    setShowDirectBookingModal(true);
  };

  const handleDirectBookingConfirm = async (reason: string, sessionType: SessionType) => {
    if (!appointment || !user) return;

    if (startingSession || callInitiated) {
      Alert.alert('Please Wait', 'A session is already being started.');
      return;
    }

    try {
      setStartingSession(true);
      setCallInitiated(true);

      const { createSession } = await import('../../services/sessionCreationService');

      const result = await createSession({
        type: sessionType === 'text' ? 'text' : 'call',
        doctorId: appointment.doctor_id,
        reason: reason || appointment.reason || 'Scheduled appointment',
        callType: sessionType === 'audio' ? 'voice' : sessionType === 'video' ? 'video' : undefined,
        source: 'INSTANT',
        appointmentId: String(appointment.id),
      });

      if (!result.success) {
        const errorMsg = ('message' in result && (result as any).message)
          ? String((result as any).message)
          : 'Failed to create session';
        Alert.alert('Session Creation Failed', errorMsg);
        setStartingSession(false);
        setCallInitiated(false);
        return;
      }

      setShowDirectBookingModal(false);

      if (sessionType === 'text' && 'sessionId' in result) {
        router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: result.chatId } });
      } else if (sessionType === 'audio' || sessionType === 'video') {
        if (!('appointmentId' in result) || !result.appointmentId) {
          Alert.alert('Call Setup Failed', 'Session created but appointment ID is missing.');
          setStartingSession(false);
          setCallInitiated(false);
          return;
        }

        const routingId = result.appointmentId;

        // Clear global flags
        const g: any = global as any;
        g.activeAudioCall = false;
        g.activeVideoCall = false;
        g.currentCallType = null;

        setDirectSessionId(routingId);
        if (sessionType === 'audio') {
          setShowAudioCallModal(true);
        } else {
          setShowVideoCallModal(true);
        }
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';
      Alert.alert('Session Failed', `Failed to start ${sessionType} session.\n\n${errorMsg}`);
      setCallInitiated(false);
    } finally {
      setStartingSession(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const getStatusColor = (status: any) => {
    const statusStr = String(status).toLowerCase();
    if (statusStr === 'confirmed' || statusStr === '1') return '#4CAF50';
    if (statusStr === 'pending' || statusStr === '0') return '#FFC107';
    if (statusStr === 'cancelled' || statusStr === '2') return '#F44336';
    if (statusStr === 'completed' || statusStr === '3') return '#2196F3';
    return '#9E9E9E';
  };

  const getStatusLabel = (status: any) => {
    const statusStr = String(status).toLowerCase();
    if (statusStr === 'confirmed' || statusStr === '1') return 'Confirmed';
    if (statusStr === 'pending' || statusStr === '0') return 'Pending';
    if (statusStr === 'cancelled' || statusStr === '2') return 'Cancelled';
    if (statusStr === 'completed' || statusStr === '3') return 'Completed';
    return 'Unknown';
  };

  const getAppointmentTypeIcon = (type: string): any => {
    const typeStr = (type || '').toLowerCase();
    if (typeStr === 'text') return 'chatbubbles';
    if (typeStr === 'voice' || typeStr === 'audio') return 'call';
    if (typeStr === 'video') return 'videocam';
    return 'calendar';
  };

  const getAppointmentTypeColor = (type: string) => {
    const typeStr = (type || '').toLowerCase();
    if (typeStr === 'text') return '#4CAF50';
    if (typeStr === 'voice' || typeStr === 'audio') return '#FFC107';
    if (typeStr === 'video') return '#2196F3';
    return '#9E9E9E';
  };

  const formatTimeDisplay = (timeStr: string): string => {
    if (!timeStr) return 'N/A';
    if (timeStr.includes(':') && timeStr.split(':').length === 3) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    try {
      let date: Date;
      if (dateStr.includes('-')) {
        date = new Date(dateStr + 'T00:00:00');
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isPending = useCallback((): boolean => {
    if (!appointment) return false;
    const s = String(appointment.status).toLowerCase();
    return s === 'pending' || s === '0';
  }, [appointment]);

  const formatPickedAtTime = (createdAt?: string | null): string | null => {
    if (!createdAt) return null;
    try {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  const sessionButtonInfo = appointment ? getSessionButtonState() : { state: 'too_early' as SessionButtonState };
  const sessionType = appointment ? getSessionType() : 'text';
  const doctorName = appointment?.doctorName || appointment?.doctor_name || 'Dr. Unknown';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading appointment...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={48} color="#F44336" />
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : appointment ? (
        <>
          {/* Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: getStatusColor(appointment.status) }]}>
            <View style={styles.statusBannerContent}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.statusBannerText}>
                {getStatusLabel(appointment.status)}
              </Text>
            </View>
          </View>

          {/* Main Card */}
          <View style={styles.mainCard}>
            {/* Pending reassurance */}
            {isPending() && (user?.user_type || userData?.user_type) !== 'doctor' && (
              <View style={styles.pendingBanner}>
                <Ionicons name="time-outline" size={18} color="#7A5A00" />
                <Text style={styles.pendingBannerText}>
                  Doctors typically respond within 5-6 hours.
                  {formatPickedAtTime(appointment.created_at)
                    ? ` Time picked at ${formatPickedAtTime(appointment.created_at)}.`
                    : ''}
                </Text>
              </View>
            )}

            {/* Doctor Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="person" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.sectionTitle}>Doctor</Text>
              </View>
              <Text style={styles.doctorName}>
                {doctorName}
              </Text>
            </View>

            {/* Appointment Type */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFF9E6' }]}>
                  <Ionicons
                    name={getAppointmentTypeIcon(appointment.appointment_type || appointment.type)}
                    size={24}
                    color={getAppointmentTypeColor(appointment.appointment_type || appointment.type)}
                  />
                </View>
                <Text style={styles.sectionTitle}>Type</Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={[styles.typeText, { color: getAppointmentTypeColor(appointment.appointment_type || appointment.type) }]}>
                  {(appointment.appointment_type || appointment.type || 'Consultation').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Date & Time Section */}
            <View style={styles.dateTimeSection}>
              <View style={[styles.dateTimeCard, { marginRight: 6 }]}>
                <View style={[styles.dateTimeIconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="calendar" size={20} color="#2196F3" />
                </View>
                <View style={styles.dateTimeContent}>
                  <Text style={styles.dateTimeLabel}>Date</Text>
                  <Text style={styles.dateTimeValue}>
                    {formatDateDisplay(appointment.appointment_date || appointment.date || '')}
                  </Text>
                </View>
              </View>

              <View style={[styles.dateTimeCard, { marginLeft: 6 }]}>
                <View style={[styles.dateTimeIconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="time" size={20} color="#FF9800" />
                </View>
                <View style={styles.dateTimeContent}>
                  <Text style={styles.dateTimeLabel}>Time</Text>
                  <Text style={styles.dateTimeValue}>
                    {formatTimeDisplay(appointment.appointment_time || appointment.time || '')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Reason Section — only for completed/cancelled */}
            {!isConfirmed() && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                    <Ionicons name="document-text" size={24} color="#9C27B0" />
                  </View>
                  <Text style={styles.sectionTitle}>Reason</Text>
                </View>
                <View style={styles.reasonCard}>
                  <Text style={styles.reasonText}>
                    {appointment.reason || 'No reason provided'}
                  </Text>
                </View>
              </View>
            )}

            {/* Additional Info */}
            {appointment.notes && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="clipboard" size={24} color="#009688" />
                  </View>
                  <Text style={styles.sectionTitle}>Notes</Text>
                </View>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{appointment.notes}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Start Session Section — only for patient and confirmed appointments */}
          {isConfirmed() && (user?.user_type || userData?.user_type) !== 'doctor' && (
            <View style={styles.sessionContainer}>
              {/* Expired message */}
              {sessionButtonInfo.state === 'expired' && (
                <View style={styles.expiredBanner}>
                  <Ionicons name="time-outline" size={20} color="#F44336" />
                  <Text style={styles.expiredText}>
                    Appointment time has passed. This session can no longer be started.
                  </Text>
                </View>
              )}

              {/* Countdown message */}
              {sessionButtonInfo.state === 'too_early' && sessionButtonInfo.minutesUntil != null && (
                <View style={styles.countdownBanner}>
                  <Ionicons name="hourglass-outline" size={20} color="#FF9800" />
                  <Text style={styles.countdownText}>
                    Session can be started in {sessionButtonInfo.minutesUntil} {sessionButtonInfo.minutesUntil === 1 ? 'minute' : 'minutes'}
                  </Text>
                </View>
              )}

              {/* Start Session button */}
              <TouchableOpacity
                style={[
                  styles.startSessionButton,
                  sessionButtonInfo.state !== 'enabled' && styles.startSessionButtonDisabled,
                ]}
                onPress={handleStartSession}
                disabled={sessionButtonInfo.state !== 'enabled'}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={getAppointmentTypeIcon(appointment.appointment_type || appointment.type)}
                  size={22}
                  color={sessionButtonInfo.state === 'enabled' ? '#fff' : '#999'}
                />
                <Text style={[
                  styles.startSessionButtonText,
                  sessionButtonInfo.state !== 'enabled' && styles.startSessionButtonTextDisabled,
                ]}>
                  Start Session
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.actionsContainer, { paddingBottom: 40 }]}>
            {appointment.session_id && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton, { marginBottom: 12 }]}
                onPress={() => {
                  if (appointment.appointment_type === 'text') {
                    router.push(`/chat/text_session_${appointment.session_id}`);
                  } else {
                    router.push(`/chat/${appointment.id}`);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubbles" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Open Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : null}

      {/* ── Session Modals ──────────────────────────────────────── */}
      <DirectBookingModal
        visible={showDirectBookingModal}
        onClose={() => setShowDirectBookingModal(false)}
        onConfirm={handleDirectBookingConfirm}
        doctorName={doctorName}
        sessionType={sessionType}
        loading={startingSession}
        subscription={currentSubscription}
      />

      {directSessionId && (
        <AudioCallModal
          visible={showAudioCallModal}
          onClose={() => {
            setShowAudioCallModal(false);
            setCallInitiated(false);
          }}
          appointmentId={directSessionId}
          userId={(user?.id ?? userData?.id ?? 0).toString()}
          isDoctor={(user?.user_type || userData?.user_type) === 'doctor'}
          doctorId={appointment?.doctor_id ? Number(appointment.doctor_id) : undefined}
          doctorName={doctorName}
          patientName={user?.display_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
          isIncomingCall={false}
          onCallTimeout={() => {
            Alert.alert('Call Timeout', 'The doctor did not answer. Please try again later.');
            setShowAudioCallModal(false);
            setCallInitiated(false);
          }}
          onCallRejected={() => {
            Alert.alert('Call Declined', 'The doctor declined the call.');
            setShowAudioCallModal(false);
            setCallInitiated(false);
          }}
        />
      )}

      {directSessionId && showVideoCallModal && (
        <VideoCallModal
          appointmentId={directSessionId}
          userId={(user?.id ?? userData?.id ?? 0).toString()}
          isDoctor={(user?.user_type || userData?.user_type) === 'doctor'}
          doctorId={appointment?.doctor_id ? Number(appointment.doctor_id) : undefined}
          doctorName={doctorName}
          patientName={user?.display_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
          onEndCall={() => {
            setShowVideoCallModal(false);
            setCallInitiated(false);
          }}
          onCallTimeout={() => {
            Alert.alert('Call Timeout', 'The doctor did not answer. Please try again later.');
            setShowVideoCallModal(false);
            setCallInitiated(false);
          }}
          onCallRejected={() => {
            Alert.alert('Call Declined', 'The doctor declined the call.');
            setShowVideoCallModal(false);
            setCallInitiated(false);
          }}
          isIncomingCall={false}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 100,
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  mainCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 52,
    marginTop: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    marginLeft: 52,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF9E6',
  },
  typeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateTimeSection: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  dateTimeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 80,
  },
  dateTimeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeContent: {
    marginLeft: 12,
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  reasonCard: {
    marginLeft: 52,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
    marginTop: 4,
  },
  reasonText: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  notesCard: {
    marginLeft: 52,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#009688',
    marginTop: 4,
  },
  notesText: {
    fontSize: 16,
    color: '#222',
    lineHeight: 24,
  },
  // ── Session section ──────────────────────────────────────────
  sessionContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  expiredText: {
    fontSize: 14,
    color: '#D32F2F',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  countdownText: {
    fontSize: 14,
    color: '#F57C00',
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  pendingBannerText: {
    fontSize: 14,
    color: '#7A5A00',
    marginLeft: 10,
    flex: 1,
    fontWeight: '600',
    lineHeight: 20,
  },
  startSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startSessionButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  startSessionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startSessionButtonTextDisabled: {
    color: '#999',
  },
  // ── Existing action buttons ──────────────────────────────────
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppointmentDetails; 