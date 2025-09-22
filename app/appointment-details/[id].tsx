import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { apiService } from '../services/apiService';

const AppointmentDetails = () => {
  const router = router;
  const { id } = useLocalSearchParams();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try to fetch the appointment from Firestore (mock logic: get all and find by id)
        // In a real app, you should have a getAppointmentById method
        const userId = null; // TODO: get current user id from context if needed
        let appt = null;
        if (userId) {
          const all = await apiService.get(`/appointments/user/${userId}`);
          appt = all.data.find((a: any) => a.id === id);
        }
        // Fallback: mock data
        if (!appt) {
          appt = {
            id,
            doctorName: 'Unknown',
            date: 'N/A',
            time: 'N/A',
            status: 'N/A',
            reason: 'N/A',
          };
        }
        setAppointment(appt);
      } catch (e) {
        setError('Failed to load appointment.');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [id]);

  // Example: Call this when you receive a push notification with a callId
  const handleIncomingCallNotification = (callId: string) => {
    setIncomingCallId(callId);
    setModalVisible(true);
  };

  // Accept handler
  const handleAccept = (callId: string, callData: any) => {
    setModalVisible(false);
    // Call your answerWebRTCCall logic here, e.g.:
    // answerWebRTCCall(doctorId, callId);
  };

  // Reject handler
  const handleReject = async (callId: string) => {
    setModalVisible(false);
    // Optionally update Firestore call status to 'rejected'
    try {
      await apiService.post(`/calls/${callId}/reject`);
    } catch (e) {
      // Handle error (optional)
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Appointment Details</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={styles.detailsCard}>
          <Text style={styles.label}>Doctor:</Text>
          <Text style={styles.value}>{appointment.doctorName}</Text>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{appointment.date}</Text>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{appointment.time}</Text>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{appointment.status}</Text>
          <Text style={styles.label}>Reason:</Text>
          <Text style={styles.value}>{appointment.reason}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { color: '#4CAF50', fontSize: 16, marginLeft: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 24 },
  detailsCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 20, elevation: 2 },
  label: { fontSize: 16, color: '#666', marginTop: 12, fontWeight: '600' },
  value: { fontSize: 18, color: '#222', marginTop: 2, fontWeight: '400' },
  error: { color: 'red', fontSize: 16, marginTop: 32 },
});

export default AppointmentDetails; 