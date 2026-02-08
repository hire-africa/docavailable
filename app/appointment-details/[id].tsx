import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../services/apiService';

const AppointmentDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const response = await apiService.get(`/appointments/${id}`);

        if (response.success && response.data) {
          // Map the response data to match expected format
          const appt = {
            id: response.data.id,
            doctorName: response.data.doctor_name || 'Unknown Doctor',
            doctor_name: response.data.doctor_name,
            patient_name: response.data.patient_name,
            appointment_date: response.data.date || response.data.appointment_date,
            appointment_time: response.data.time || response.data.appointment_time,
            date: response.data.date || response.data.appointment_date,
            time: response.data.time || response.data.appointment_time,
            status: response.data.status,
            appointment_type: response.data.appointment_type || response.data.consultation_type,
            type: response.data.appointment_type || response.data.consultation_type,
            reason: response.data.reason,
            consultation_type: response.data.consultation_type,
            notes: response.data.notes,
            created_at: response.data.created_at,
            updated_at: response.data.updated_at,
            actual_start_time: response.data.actual_start_time,
            actual_end_time: response.data.actual_end_time,
            sessions_deducted: response.data.sessions_deducted,
            no_show: response.data.no_show,
            completed_at: response.data.completed_at,
            earnings_awarded: response.data.earnings_awarded,
            session_id: response.data.session_id,
            patient_id: response.data.patient_id,
            doctor_id: response.data.doctor_id,
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

  const getAppointmentTypeIcon = (type: string) => {
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

  // Format time to show only hours and minutes (12:30 instead of 12:30:00)
  const formatTimeDisplay = (timeStr: string): string => {
    if (!timeStr) return 'N/A';
    // Remove seconds if present (12:30:00 -> 12:30)
    if (timeStr.includes(':') && timeStr.split(':').length === 3) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  // Format date to show only month and day (Jan 20 instead of full date)
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    try {
      // Try parsing different date formats
      let date: Date;
      if (dateStr.includes('-')) {
        // Format: YYYY-MM-DD
        date = new Date(dateStr + 'T00:00:00');
      } else if (dateStr.includes('/')) {
        // Format: MM/DD/YYYY
        const parts = dateStr.split('/');
        date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else {
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) {
        return dateStr; // Return original if parsing fails
      }

      // Format as "Jan 20"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateStr; // Return original if error
    }
  };

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
            {/* Doctor Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="person" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.sectionTitle}>Doctor</Text>
              </View>
              <Text style={styles.doctorName}>
                {appointment.doctorName || appointment.doctor_name || 'Dr. Unknown'}
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

            {/* Reason Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="document-text" size={24} color="#9C27B0" />
                </View>
                <Text style={styles.sectionTitle}>
                  {(() => {
                    const statusStr = String(appointment.status).toLowerCase();
                    if (statusStr === 'confirmed' || statusStr === '1' || statusStr === 'pending' || statusStr === '0') {
                      return 'Instructions';
                    }
                    return 'Reason';
                  })()}
                </Text>
              </View>
              <View style={styles.reasonCard}>
                <Text style={styles.reasonText}>
                  {(() => {
                    const statusStr = String(appointment.status).toLowerCase();
                    if (statusStr === 'confirmed' || statusStr === '1' || statusStr === 'pending' || statusStr === '0') {
                      return 'at appointment time go to doctor profile -> talk now then start your session';
                    }
                    return appointment.reason || 'No reason provided';
                  })()}
                </Text>
              </View>
            </View>

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

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
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
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#4CAF50" />
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}
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