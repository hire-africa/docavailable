import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../app/services/apiService';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

const MyAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelAppt, setCancelAppt] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  // Helper function to ensure appointments is always an array
  const getSafeAppointments = () => {
    return Array.isArray(appointments) ? appointments : [];
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    // Use Laravel API instead of Firestore
    apiService.get('/appointments')
      .then((response: any) => {
        // console.log('MyAppointments: Raw API response:', response);
        if (response.success && response.data) {
          // Handle paginated response from Laravel
          const appointmentsData = response.data.data || response.data;
          // console.log('MyAppointments: Fetched appointments:', appointmentsData);
          setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
        } else {
          setAppointments([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('MyAppointments: Error fetching appointments:', error);
        setAppointments([]);
        setLoading(false);
      });
  }, [user]);

  // Helper to parse date/time
  const parseDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return null;
    let year, month, day;
    if (dateStr.includes('/')) {
      // MM/DD/YYYY or similar
      const [m1, d1, y1] = dateStr.split('/');
      year = y1;
      month = m1;
      day = d1;
      if (Number(y1) < 1000) { year = d1; month = m1; day = y1; }
    } else if (dateStr.includes('-')) {
      // YYYY-M-D or YYYY-MM-DD
      const [y, m, d] = dateStr.split('-');
      year = y;
      month = m;
      day = d;
    } else {
      return null;
    }
    const [hour, min] = timeStr.split(':');
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
  };

  // Build a single recent list sorted by most recent first
  const recentAppointments = getSafeAppointments()
    .map((appt) => ({
      ...appt,
      __ts: (() => {
        const dt = parseDateTime(appt.date, appt.time);
        return dt ? dt.getTime() : 0;
      })()
    }))
    .sort((a, b) => (b.__ts || 0) - (a.__ts || 0));

  const handleAcceptReschedule = async (appt: any) => {
    if (!user) return;
    setLoading(true);
    try {
      // Update appointment via Laravel API
      await apiService.patch(`/appointments/${appt.id}`, { 
        status: 'confirmed', 
        reschedule_pending: false 
      });
      
      // Refresh appointments
      const response = await apiService.get('/appointments');
      if (response.success && response.data) {
        const appointmentsData = response.data.data || response.data;
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      }
    } catch (error) {
      console.error('Error accepting reschedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReschedule = async (appt: any) => {
    if (!user) return;
    setLoading(true);
    try {
      // Update appointment via Laravel API
      await apiService.patch(`/appointments/${appt.id}`, { 
        status: 'cancelled', 
        reschedule_pending: false 
      });
      
      // Refresh appointments
      const response = await apiService.get('/appointments');
      if (response.success && response.data) {
        const appointmentsData = response.data.data || response.data;
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      }
    } catch (error) {
      console.error('Error rejecting reschedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = (appt: any) => {
    setCancelAppt(appt);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const confirmCancelAppointment = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Reason required', 'Please provide a reason for cancellation.');
      return;
    }
    setShowCancelModal(false);
    setLoading(true);
    try {
      // Update appointment via Laravel API
      await apiService.patch(`/appointments/${cancelAppt.id}`, { 
        status: 'cancelled',
        cancellation_reason: cancelReason
      });
      
      // Refresh appointments
      if (user) {
        const response = await apiService.get('/appointments');
        if (response.success && response.data) {
          const appointmentsData = response.data.data || response.data;
          setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
        }
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return '#888';
    switch (status) {
      case 'pending': return '#FFA500';
      case 'confirmed': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#888';
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return 'question-circle';
    switch (status) {
      case 'pending': return 'clock-o';
      case 'confirmed': return 'check-circle';
      case 'completed': return 'check-square';
      case 'cancelled': return 'times-circle';
      default: return 'question-circle';
    }
  };

  const renderAppointment = (appt: any, keyPrefix: string) => {
    const statusStr = String(appt?.status ?? '').toLowerCase();
    const statusLabel = statusStr ? statusStr.charAt(0).toUpperCase() + statusStr.slice(1) : 'Unknown';
    return (
    <TouchableOpacity style={styles.card} key={`${keyPrefix}${appt.id}`} onPress={() => setSelectedAppointment(appt)}>
      <View style={styles.cardHeader}>
        <View style={styles.doctorInfo}>
          <View style={styles.doctorAvatar}>
            <FontAwesome name="user-md" size={16} color={Colors.light.tint} />
          </View>
          <View style={styles.doctorDetails}>
            <ThemedText style={styles.doctorName}>{appt.doctorName}</ThemedText>
            <View style={styles.statusContainer}>
              <FontAwesome 
                name={getStatusIcon(statusStr) as any} 
                size={12} 
                color={getStatusColor(statusStr)} 
                style={styles.statusIcon}
              />
              <ThemedText style={[styles.statusText, { color: getStatusColor(statusStr) }]}>
                {statusLabel}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.cardContent}>
         <View style={styles.detailRow}>
          <FontAwesome name="calendar" size={14} color={Colors.light.icon} style={styles.detailIcon} />
          <ThemedText style={styles.detailText}>{appt.date}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <FontAwesome name="clock-o" size={14} color={Colors.light.icon} style={styles.detailIcon} />
          <ThemedText style={styles.detailText}>{appt.time}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <FontAwesome name="comment" size={14} color={Colors.light.icon} style={styles.detailIcon} />
          <ThemedText style={styles.detailText} numberOfLines={2}>{appt.reason}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  ); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My Appointments</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <ThemedText style={styles.loadingText}>Loading appointments...</ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="calendar" size={18} color={Colors.light.tint} />
              <ThemedText style={styles.sectionTitle}>Recent Appointments</ThemedText>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{recentAppointments.length}</ThemedText>
              </View>
            </View>
            {recentAppointments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome name="calendar-o" size={48} color={Colors.light.icon} />
                <ThemedText style={styles.emptyTitle}>No Appointments</ThemedText>
                <ThemedText style={styles.emptyMessage}>Your appointments will appear here.</ThemedText>
              </View>
            ) : (
              recentAppointments.map(appt => renderAppointment(appt, 'recent-'))
            )}
          </View>
        </ScrollView>
      )}

      {/* Details Modal */}
      <Modal visible={!!selectedAppointment} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <FontAwesome name="calendar" size={24} color={Colors.light.tint} />
              <ThemedText style={styles.modalTitle}>Appointment Details</ThemedText>
            </View>
            {selectedAppointment && (
              <>
                <View style={{ marginBottom: 12 }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: '700', color: Colors.light.text }}>
                    {selectedAppointment.doctorName}
                  </ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="calendar" size={14} color={Colors.light.icon} style={styles.detailIcon} />
                  <ThemedText style={styles.detailText}>{selectedAppointment.date}</ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="clock-o" size={14} color={Colors.light.icon} style={styles.detailIcon} />
                  <ThemedText style={styles.detailText}>{selectedAppointment.time}</ThemedText>
                </View>
                {selectedAppointment.reason ? (
                  <View style={styles.detailRow}>
                    <FontAwesome name="comment" size={14} color={Colors.light.icon} style={styles.detailIcon} />
                    <ThemedText style={styles.detailText} numberOfLines={3}>{selectedAppointment.reason}</ThemedText>
                  </View>
                ) : null}
                <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ backgroundColor: getStatusColor(selectedAppointment.status), borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{selectedAppointment.status.toUpperCase()}</Text>
                  </View>
                </View>
              </>
            )}
            <View style={{ marginTop: 20 }}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setSelectedAppointment(null)}>
                <Text style={styles.modalSecondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginLeft: 16,
    flex: 1,
  },
  headerSpacer: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.icon,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 12,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  detailText: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginLeft: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.light.icon,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: '#F8F9FA',
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MyAppointments; 