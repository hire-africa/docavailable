import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DoctorProfilePicture from '../components/DoctorProfilePicture';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

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
        canCancel: canCancelAppointment(selectedAppointment),
        fullAppointmentData: selectedAppointment
      });
    }
  }, [selectedAppointment]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/appointments');
      if (response.success) {
        // Handle different response structures
        let appointmentsData = response.data;
        
        // Check if data is nested (Laravel pagination structure)
        if (response.data && response.data.data) {
          appointmentsData = response.data.data;
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
      return status.toLowerCase();
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

  // Step 1: Show confirmation modal
  const handleCancelAppointment = (appt: any) => {
    console.log('🔍 Cancel button tapped for appointment:', appt.id);
    setCancellingAppointment(appt);
    setShowCancelConfirmModal(true);
    console.log('🔍 showCancelConfirmModal set to true');
    Alert.alert('Debug', 'Confirmation modal should be visible now! 🔴');
  };

  const handleCancelConfirm = () => {
    console.log('🔍 Confirm button tapped');
    setShowCancelConfirmModal(false);
    setCancelReason('');
    setShowCancelModal(true);
    console.log('🔍 showCancelModal set to true');
    Alert.alert('Debug', 'Reason input modal should be visible now! 📝');
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
        fetchAppointments(); // Refresh the list
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
      case 'pending': return '#FF9500';
      case 'confirmed': return '#4CAF50';
      case 'cancelled': return '#FF3B30';
      case 'completed': return '#007AFF';
      case 'reschedule_proposed': return '#FF9500';
      case 'reschedule_accepted': return '#4CAF50';
      case 'reschedule_rejected': return '#FF3B30';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: any) => {
    const statusStr = getStatusString(status);
    switch (statusStr) {
      case 'pending': return 'clock-o';
      case 'confirmed': return 'check-circle';
      case 'cancelled': return 'times-circle';
      case 'completed': return 'check-square';
      case 'reschedule_proposed': return 'clock-o';
      case 'reschedule_accepted': return 'check-circle';
      case 'reschedule_rejected': return 'times-circle';
      default: return 'question-circle';
    }
  };

  const getStatusLabel = (status: any): string => {
    const statusStr = getStatusString(status);
    switch (statusStr) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      case 'reschedule_proposed': return 'Reschedule Proposed';
      case 'reschedule_accepted': return 'Reschedule Accepted';
      case 'reschedule_rejected': return 'Reschedule Rejected';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr;
  };

  const renderAppointment = (appt: any, keyPrefix: string) => {
    const statusStr = getStatusString(appt.status);
    const statusLabel = getStatusLabel(appt.status);
    const canCancel = canCancelAppointment(appt);
    
    return (
      <TouchableOpacity
        key={`${keyPrefix}${appt.id}`}
        style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 20, minHeight: 56, shadowColor: 'rgba(0,0,0,0.02)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1}}
        onPress={() => setSelectedAppointment(appt)}
        activeOpacity={0.8}
      >
        <View style={{width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: '#E0F2E9', alignItems: 'center', justifyContent: 'center', marginRight: 16}}>
          <DoctorProfilePicture
            profilePictureUrl={appt.doctor?.profile_picture_url}
            profilePicture={appt.doctor?.profile_picture}
            size={48}
            name={appt.doctorName}
          />
        </View>
        <View style={{flex: 1}}>
          <Text style={{fontWeight: 'bold', fontSize: 16, color: '#222', marginBottom: 2}} numberOfLines={1}>{appt.doctorName}</Text>
          <Text style={{color: '#7CB18F', fontSize: 14}} numberOfLines={1}>
            {formatDate(appt.appointment_date || appt.date)} • {formatTime(appt.appointment_time || appt.time)}
          </Text>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <View style={{backgroundColor: getStatusColor(appt.status), borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8}}>
            <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>{statusLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={24} color="#222" />
          </TouchableOpacity>
          <Text style={styles.title}>My Appointments</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.subtitle}>Recent appointments with your doctors</Text>
      </View>

      {appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome name="calendar-o" size={48} color={Colors.light.icon} />
          <Text style={styles.emptyStateTitle}>No Appointments</Text>
          <Text style={styles.emptyStateText}>
            You haven't booked any appointments yet. Book your first appointment to get started.
          </Text>
        </View>
      ) : (
        <View style={{backgroundColor: 'transparent', marginBottom: 8, paddingHorizontal: 2}}>
          {appointments.map((appt) => renderAppointment(appt, 'appt-'))}
        </View>
      )}

      {/* Appointment Details Modal */}
      <Modal visible={!!selectedAppointment} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxWidth: 420, position: 'relative' }}>
            <TouchableOpacity onPress={() => setSelectedAppointment(null)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
              <Text style={{ color: '#555', fontWeight: 'bold', fontSize: 16 }}>×</Text>
            </TouchableOpacity>
            {selectedAppointment && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <DoctorProfilePicture
                    profilePictureUrl={selectedAppointment.doctor?.profile_picture_url}
                    profilePicture={selectedAppointment.doctor?.profile_picture}
                    size={72}
                    name={selectedAppointment.doctorName}
                  />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginTop: 10 }} numberOfLines={1}>{selectedAppointment.doctorName}</Text>
                  <View style={{ marginTop: 8 }}>
                    <View style={{ backgroundColor: getStatusColor(selectedAppointment.status), borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '600' }}>{getStatusLabel(selectedAppointment.status)}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <Text style={{ color: '#222', fontWeight: '600', marginBottom: 8 }}>Appointment Details</Text>
                  <Text style={{ color: '#4CAF50', marginBottom: 4 }}>
                    {formatDate(selectedAppointment.appointment_date || selectedAppointment.date)} • {formatTime(selectedAppointment.appointment_time || selectedAppointment.time)}
                  </Text>
                  {selectedAppointment.appointment_type && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ color: '#222', fontWeight: '600', marginBottom: 4 }}>Type</Text>
                      <Text style={{ color: '#666' }}>{selectedAppointment.appointment_type}</Text>
                    </View>
                  )}
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#222', fontWeight: '600', marginBottom: 4 }}>Reason</Text>
                    <Text style={{ color: '#666' }}>{selectedAppointment.reason || 'No reason provided'}</Text>
                  </View>
                </View>
                
                {/* Cancel Button - Only show for cancellable appointments */}
                {(() => {
                  const canCancel = canCancelAppointment(selectedAppointment);
                  console.log('🔍 Cancel button render check:', {
                    selectedAppointment: selectedAppointment?.id,
                    status: selectedAppointment?.status,
                    appointmentDate: selectedAppointment?.appointment_date || selectedAppointment?.date,
                    appointmentTime: selectedAppointment?.appointment_time || selectedAppointment?.time,
                    canCancel,
                    hasSelectedAppointment: !!selectedAppointment
                  });
                  return canCancel ? (
                    <TouchableOpacity
                      style={{ backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 12 }}
                      onPress={() => {
                        console.log('🔍 Cancel button pressed for appointment:', selectedAppointment?.id);
                        handleCancelAppointment(selectedAppointment);
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel Appointment</Text>
                    </TouchableOpacity>
                  ) : null;
                })()}
                
                {/* Test Button - Always visible for debugging */}
                <TouchableOpacity
                  style={{ backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 12 }}
                  onPress={() => {
                    console.log('🔍 Test button pressed!');
                    Alert.alert('Test', 'Test button is working!');
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Test Button (Debug)</Text>
                </TouchableOpacity>
                
                {console.log('🔍 Rendering cancel button section, canCancel:', canCancelAppointment(selectedAppointment), 'selectedAppointment:', selectedAppointment?.id)}
                
                {/* Cancellation Note */}
                <View style={{ backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FFE082' }}>
                  <Text style={{ color: '#8D6E63', fontSize: 12 }}>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(255,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320, borderWidth: 3, borderColor: '#FF0000' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 12, color: '#FF0000' }}>🔴 CONFIRM CANCELLATION 🔴</Text>
            <Text style={{ marginBottom: 8, fontSize: 16 }}>Are you sure you want to cancel this appointment?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowCancelConfirmModal(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: '#888', fontWeight: 'bold' }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                console.log('🔍 Confirm button pressed directly!');
                Alert.alert('Debug', 'Confirm button was pressed! 🎯');
                handleCancelConfirm();
              }} style={{ backgroundColor: '#FF3B30', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Reason Input Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,255,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320, borderWidth: 3, borderColor: '#0000FF' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 12, color: '#0000FF' }}>🔵 ENTER REASON 🔵</Text>
            <Text style={{ marginBottom: 8, fontSize: 16 }}>Please provide a reason for cancellation:</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason..."
              style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, marginBottom: 16 }}
              multiline
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowCancelModal(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: '#888', fontWeight: 'bold' }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmCancelAppointment} style={{ backgroundColor: '#FF3B30', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel Appointment</Text>
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
    padding: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    marginTop: 70, // Added margin to move title down
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  headerSpacer: {
    width: 48, // Adjust as needed to balance back button and title
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 0,
    marginLeft: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#7CB18F',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
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
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
});

export default MyAppointments; 