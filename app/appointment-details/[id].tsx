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
        const response = await apiService.get(`/appointments/user/${user.id}`);

        if (response.success && response.data) {
          const appt = response.data.find((a: any) => String(a.id) === String(id));
          if (appt) {
            setAppointment(appt);
          } else {
            setError('Appointment not found.');
          }
        } else {
          setError('Failed to load appointments.');
        }
      } catch (e) {
        console.error('❌ [AppointmentDetails] Error fetching appointment:', e);
        setError('Failed to load appointment details.');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [id, user?.id]);


  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Appointment Details</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 32 }} />
      ) : error ? (
        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity
            style={{ marginTop: 20, padding: 12, backgroundColor: '#4CAF50', borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : appointment ? (
        <View style={styles.detailsCard}>
          <Text style={styles.label}>Doctor:</Text>
          <Text style={styles.value}>{appointment.doctorName || appointment.doctor_name || 'Dr. Unknown'}</Text>

          <Text style={styles.label}>Type:</Text>
          <Text style={[styles.value, { textTransform: 'capitalize' }]}>
            {appointment.appointment_type || appointment.type || 'Consultation'}
          </Text>

          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{appointment.appointment_date || appointment.date || 'N/A'}</Text>

          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{appointment.appointment_time || appointment.time || 'N/A'}</Text>

          <Text style={styles.label}>Status:</Text>
          <View style={{ alignSelf: 'flex-start', backgroundColor: '#E8F5E8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 }}>
            <Text style={[styles.value, { color: '#2E7D32', fontSize: 14, fontWeight: 'bold', marginTop: 0 }]}>
              {String(appointment.status).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.label}>Reason:</Text>
          <Text style={styles.value}>{appointment.reason || 'No reason provided'}</Text>
        </View>
      ) : null}
    </ScrollView>
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