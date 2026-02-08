import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DoctorProfilePicture from '../components/DoctorProfilePicture';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { formatAppointmentDate, formatAppointmentDateTime, formatAppointmentTime } from '../utils/appointmentDisplayUtils';
import { apiService } from './services/apiService';

const MyAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingAppointment, setCancellingAppointment] = useState<any>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    console.log('🔍 Modal state changed:', {
      showCancelConfirmModal,
      showCancelModal,
      cancellingAppointment: cancellingAppointment?.id
    });
  }, [showCancelConfirmModal, showCancelModal, cancellingAppointment]);

  useEffect(() => {
    if (selectedAppointment) {
      console.log('🔍 Appointment details modal opened:', {
        selectedAppointment: selectedAppointment?.id,
        canCancel: canCancelAppointment(selectedAppointment)
      });
    }
  }, [selectedAppointment]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response: any = await apiService.get('/appointments');
      if (response.success) {
        // Handle different response structures
        let appointmentsData = response.data;

        // Check if data is nested (Laravel pagination structure)
        if (response.data && (response.data as any).data) {
          appointmentsData = (response.data as any).data;
        }

        // Ensure we have an array
        if (Array.isArray(appointmentsData)) {
          // Sort appointments by most recent first
          const sortedAppointments = appointmentsData.sort((a: any, b: any) => {
            const dateA = new Date(`${a.appointment_date || a.date} ${a.appointment_time || a.time}`);
            const dateB = new Date(`${b.appointment_date || b.date} ${b.appointment_time || b.time}`);
            return dateB.getTime() - dateA.getTime();
          });
          setAppointments(sortedAppointments);
        } else {
          console.warn('Appointments data is not an array:', appointmentsData);
          setAppointments([]);
        }
      } else {
        console.warn('API response not successful:', response);
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Convert numeric status to string
  const getStatusString = (status: any): string => {
    if (typeof status === 'string') {
      const s = status.toLowerCase();
      // Normalize common variants
      if (s === 'inprogress') return 'in_progress';
      if (s === 'in-progress') return 'in_progress';
      if (s === 'active') return 'in_progress';
      return s;
    }

    // Convert numeric status to string
    switch (Number(status)) {
      case 0: return 'pending';
      case 1: return 'confirmed';
      case 2: return 'cancelled';
      case 3: return 'completed';
      case 4: return 'reschedule_proposed';
      case 5: return 'reschedule_accepted';
      case 6: return 'reschedule_rejected';
      case 7: return 'in_progress';
      default: return 'unknown';
    }
  };

  // Check if appointment can be cancelled
  const canCancelAppointment = (appt: any): boolean => {
    const status = getStatusString(appt.status);
    const appointmentDateTime = new Date(`${appt.appointment_date || appt.date} ${appt.appointment_time || appt.time}`);
    const now = new Date();

    const canCancel = (status === 'pending' || status === 'confirmed') && appointmentDateTime > now;
    console.log('🔍 canCancelAppointment check:', {
      appointmentId: appt.id,
      status,
      appointmentDateTime: appointmentDateTime.toISOString(),
      now: now.toISOString(),
      canCancel
    });

    // Can cancel if status is pending or confirmed AND appointment hasn't started yet
    return canCancel;
  };

  const handleCancelAppointment = (appt: any) => {
    console.log('🔍 Cancel button tapped for appointment:', appt.id);
    setCancellingAppointment(appt);
    setShowCancelConfirmModal(true);
    console.log('🔍 showCancelConfirmModal set to true');
  };

  const handleCancelConfirm = () => {
    console.log('🔍 Confirm button tapped');
    setShowCancelConfirmModal(false);
    setCancelReason('');
    setShowCancelModal(true);
    console.log('🔍 showCancelModal set to true');
  };

  const confirmCancelAppointment = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for cancellation.');
      return;
    }

    if (!cancellingAppointment) return;

    try {
      setLoading(true);
      const response = await apiService.patch(`/appointments/${cancellingAppointment.id}`, {
        status: 2, // STATUS_CANCELLED = 2
        cancellation_reason: cancelReason
      });

      if (response.success) {
        Alert.alert('Success', 'Appointment cancelled successfully.');
        setShowCancelModal(false);
        setShowCancelConfirmModal(false);
        setCancellingAppointment(null);
        setCancelReason('');
        // Refresh the list immediately
        await fetchAppointments();
      } else {
        Alert.alert('Error', response.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: any) => {
    const statusStr = getStatusString(status);
    switch (statusStr) {
      case 'pending': return '#FFC107';
      case 'confirmed': return '#4CAF50';
      case 'in_progress': return '#4CAF50';
      case 'cancelled': return '#F44336';
      case 'completed': return '#2196F3';
      case 'reschedule_proposed': return '#FFC107';
      case 'reschedule_accepted': return '#4CAF50';
      case 'reschedule_rejected': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: any) => {
    const statusStr = getStatusString(status);
    switch (statusStr) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle';
      case 'in_progress': return 'radio-button-on';
      case 'cancelled': return 'close-circle';
      case 'completed': return 'checkmark-done-circle';
      case 'reschedule_proposed': return 'time-outline';
      case 'reschedule_accepted': return 'checkmark-circle';
      case 'reschedule_rejected': return 'close-circle';
      default: return 'help-circle';
    }
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

  const getStatusLabel = (status: any): string => {
    const statusStr = getStatusString(status);
    switch (statusStr) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'in_progress': return 'In Progress';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      case 'reschedule_proposed': return 'Reschedule Proposed';
      case 'reschedule_accepted': return 'Reschedule Accepted';
      case 'reschedule_rejected': return 'Reschedule Rejected';
      default: return 'Unknown';
    }
  };

  const formatDate = (appointment: any) => {
    if (typeof appointment === 'string') {
      return formatAppointmentDate({ appointment_date: appointment });
    } else if (appointment && typeof appointment === 'object') {
      return formatAppointmentDate(appointment);
    }
    return 'No date provided';
  };

  const formatTime = (appointment: any) => {
    if (typeof appointment === 'string') {
      return formatAppointmentTime({ appointment_time: appointment });
    } else if (appointment && typeof appointment === 'object') {
      return formatAppointmentTime(appointment);
    }
    return 'No time provided';
  };

  const formatDateTime = (appointment: any) => {
    if (typeof appointment === 'string') {
      return `${formatDate(appointment)} • ${formatTime(appointment)}`;
    } else if (appointment && typeof appointment === 'object') {
      return formatAppointmentDateTime(appointment);
    }
    return 'No appointment data';
  };

  const renderAppointment = (appt: any, keyPrefix: string) => {
    const statusStr = getStatusString(appt.status);
    const statusLabel = getStatusLabel(statusStr);
    const appointmentType = appt.appointment_type || appt.type || '';

    return (
      <View
        key={`${keyPrefix}${appt.id}`}
        style={styles.appointmentCard}
      >
        {/* Doctor Avatar */}
        <View style={styles.avatarContainer}>
          <DoctorProfilePicture
            profilePictureUrl={appt.doctor?.profile_picture_url}
            profilePicture={appt.doctor?.profile_picture}
            size={56}
            name={appt.doctorName}
          />
        </View>

        {/* Main Content */}
        <View style={styles.appointmentContent}>
          <View style={styles.appointmentHeader}>
            <Text style={styles.doctorName} numberOfLines={1}>
              {appt.doctorName || 'Dr. Unknown'}
            </Text>
            {appt.session_id !== null && appt.session_id !== undefined && (
              <View style={styles.sessionBadge}>
                <Ionicons name="chatbubbles" size={12} color="#fff" />
                <Text style={styles.sessionBadgeText}>Active</Text>
              </View>
            )}
          </View>

          {/* Date & Time */}
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.dateTimeText}>
                {formatDate(appt)}
              </Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.dateTimeText}>
                {formatTime(appt)}
              </Text>
            </View>
          </View>

          {/* Appointment Type */}
          {appointmentType && (
            <View style={styles.typeRow}>
              <View style={[styles.typeIconContainer, { backgroundColor: getAppointmentTypeColor(appointmentType) + '20' }]}>
                <Ionicons
                  name={getAppointmentTypeIcon(appointmentType)}
                  size={14}
                  color={getAppointmentTypeColor(appointmentType)}
                />
              </View>
              <Text style={[styles.typeText, { color: getAppointmentTypeColor(appointmentType) }]}>
                {(appointmentType || 'Consultation').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appt.status) }]}>
            <Ionicons name={getStatusIcon(appt.status)} size={14} color="#fff" />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchAppointments}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={{ width: 40 }} />
      </View>

      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="calendar-outline" size={64} color="#4CAF50" />
          </View>
          <Text style={styles.emptyStateTitle}>No Appointments</Text>
          <Text style={styles.emptyStateText}>
            You haven't booked any appointments yet.{'\n'}Book your first appointment to get started.
          </Text>
        </View>
      ) : (
        <View style={styles.appointmentsList}>
          {appointments.map((appt) => renderAppointment(appt, 'appt-'))}
        </View>
      )}

      {/* Appointment Details Modal */}
      <Modal visible={!!selectedAppointment} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setSelectedAppointment(null)}
              style={styles.modalCloseButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalAvatarContainer}>
                    <DoctorProfilePicture
                      profilePictureUrl={selectedAppointment.doctor?.profile_picture_url}
                      profilePicture={selectedAppointment.doctor?.profile_picture}
                      size={80}
                      name={selectedAppointment.doctorName}
                    />
                  </View>
                  <Text style={styles.modalDoctorName} numberOfLines={1}>
                    {selectedAppointment.doctorName || 'Dr. Unknown'}
                  </Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedAppointment.status) }]}>
                    <Ionicons name={getStatusIcon(selectedAppointment.status)} size={16} color="#fff" />
                    <Text style={styles.modalStatusText}>
                      {getStatusLabel(selectedAppointment.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDetailsCard}>
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="calendar" size={20} color="#4CAF50" />
                      <Text style={styles.modalSectionTitle}>Date & Time</Text>
                    </View>
                    <Text style={styles.modalSectionValue}>
                      {formatDateTime(selectedAppointment)}
                    </Text>
                  </View>

                  {selectedAppointment.appointment_type && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons
                          name={getAppointmentTypeIcon(selectedAppointment.appointment_type)}
                          size={20}
                          color={getAppointmentTypeColor(selectedAppointment.appointment_type)}
                        />
                        <Text style={styles.modalSectionTitle}>Type</Text>
                      </View>
                      <View style={[styles.modalTypeBadge, { backgroundColor: getAppointmentTypeColor(selectedAppointment.appointment_type) + '20' }]}>
                        <Text style={[styles.modalTypeText, { color: getAppointmentTypeColor(selectedAppointment.appointment_type) }]}>
                          {(selectedAppointment.appointment_type || 'Consultation').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="document-text" size={20} color="#9C27B0" />
                      <Text style={styles.modalSectionTitle}>
                        {(() => {
                          const statusStr = getStatusString(selectedAppointment.status);
                          if (statusStr === 'pending' || statusStr === 'confirmed') {
                            return 'Instructions';
                          }
                          return 'Reason';
                        })()}
                      </Text>
                    </View>
                    <View style={styles.modalReasonCard}>
                      <Text style={styles.modalReasonText}>
                        {(() => {
                          const statusStr = getStatusString(selectedAppointment.status);
                          if (statusStr === 'pending' || statusStr === 'confirmed') {
                            return 'at appointment time go to doctor profile -> talk now then start your session';
                          }
                          return selectedAppointment.reason && selectedAppointment.reason.trim() !== ''
                            ? selectedAppointment.reason
                            : 'No reason provided';
                        })()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Cancel Button - Only show for cancellable appointments */}
                {canCancelAppointment(selectedAppointment) && (
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      console.log('🔍 Cancel button pressed for appointment:', selectedAppointment?.id);
                      handleCancelAppointment(selectedAppointment);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.modalCancelButtonText}>Cancel Appointment</Text>
                  </TouchableOpacity>
                )}

                {/* Cancellation Note */}
                <View style={styles.modalNoteCard}>
                  <Ionicons name="information-circle" size={16} color="#FFC107" />
                  <Text style={styles.modalNoteText}>
                    Note: Cancelling appointments at short notice may affect your account standing. Please provide a valid reason for cancellation.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="alert-circle" size={48} color="#FFC107" />
            </View>
            <Text style={styles.confirmModalTitle}>Confirm Cancellation</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to cancel this appointment?
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                onPress={() => setShowCancelConfirmModal(false)}
                style={[styles.modalButton, styles.modalButtonSecondary]}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonSecondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancelConfirm}
                style={[styles.modalButton, styles.modalButtonDanger]}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonDangerText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Reason Input Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.reasonModalContent}>
            <View style={styles.reasonModalHeader}>
              <Ionicons name="document-text" size={32} color="#F44336" />
              <Text style={styles.reasonModalTitle}>Cancel Appointment</Text>
            </View>
            <Text style={styles.reasonModalText}>
              Please provide a reason for cancellation:
            </Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Enter reason for cancellation..."
              placeholderTextColor="#999"
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
            />
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                onPress={() => setShowCancelModal(false)}
                style={[styles.modalButton, styles.modalButtonSecondary]}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonSecondaryText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmCancelAppointment}
                style={[styles.modalButton, styles.modalButtonDanger]}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.modalButtonDangerText}>Cancel Appointment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  appointmentsList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 100,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#E8F5E9',
    marginRight: 16,
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  sessionBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
    justifyContent: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  modalAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#E8F5E9',
    marginBottom: 12,
  },
  modalDoctorName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  modalStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  modalDetailsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalSectionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 28,
  },
  modalTypeBadge: {
    alignSelf: 'flex-start',
    marginLeft: 28,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modalTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalReasonCard: {
    marginLeft: 28,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#9C27B0',
  },
  modalReasonText: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  modalCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalNoteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
    alignItems: 'flex-start',
  },
  modalNoteText: {
    color: '#8D6E63',
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  // Confirm Modal
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  modalButtonSecondary: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  modalButtonSecondaryText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonDanger: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
  },
  modalButtonDangerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Reason Modal
  reasonModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  reasonModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  reasonModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 12,
    textAlign: 'center',
  },
  reasonModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  reasonInput: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#222',
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: '#F8F9FA',
  },
});

export default MyAppointments; 