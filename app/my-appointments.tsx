import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { ThemedText } from '../components/ThemedText';
import DoctorProfilePicture from '../components/DoctorProfilePicture';

const MyAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/appointments');
      if (response.success) {
        // Sort appointments by most recent first
        const sortedAppointments = response.data.sort((a: any, b: any) => {
          const dateA = new Date(`${a.appointment_date || a.date} ${a.appointment_time || a.time}`);
          const dateB = new Date(`${b.appointment_date || b.date} ${b.appointment_time || b.time}`);
          return dateB.getTime() - dateA.getTime();
        });
        setAppointments(sortedAppointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'confirmed': return '#4CAF50';
      case 'cancelled': return '#FF3B30';
      case 'completed': return '#007AFF';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-o';
      case 'confirmed': return 'check-circle';
      case 'cancelled': return 'times-circle';
      case 'completed': return 'check-square';
      default: return 'question-circle';
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
    const statusStr = String(appt?.status ?? '').toLowerCase();
    const statusLabel = statusStr ? statusStr.charAt(0).toUpperCase() + statusStr.slice(1) : 'Unknown';
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
          <View style={{backgroundColor: getStatusColor(statusStr), borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8}}>
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
        <Text style={styles.title}>My Appointments</Text>
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
                </View>
                <View style={{ backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <Text style={{ color: '#222', fontWeight: '600', marginBottom: 8 }}>Appointment Details</Text>
                  <Text style={{ color: '#4CAF50', marginBottom: 4 }}>
                    {formatDate(selectedAppointment.appointment_date || selectedAppointment.date)} • {formatTime(selectedAppointment.appointment_time || selectedAppointment.time)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ backgroundColor: getStatusColor(String(selectedAppointment.status || '').toLowerCase()), borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '600' }}>{String(selectedAppointment.status || '').toUpperCase() || 'UNKNOWN'}</Text>
                    </View>
                  </View>
                  {selectedAppointment.appointment_type && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ color: '#222', fontWeight: '600', marginBottom: 4 }}>Type</Text>
                      <Text style={{ color: '#666' }}>{selectedAppointment.appointment_type}</Text>
                    </View>
                  )}
                  {selectedAppointment.reason && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ color: '#222', fontWeight: '600', marginBottom: 4 }}>Reason</Text>
                      <Text style={{ color: '#666' }}>{selectedAppointment.reason}</Text>
                    </View>
                  )}
                </View>
              </>
            )}
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
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
});

export default MyAppointments; 