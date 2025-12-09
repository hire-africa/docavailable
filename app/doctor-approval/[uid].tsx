import { adminService, DoctorDetails } from '@/services/adminService';
import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 1200 : width;
const isLargeScreen = width > 768;

export default function DoctorApprovalPage() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<DoctorDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    if (!uid) {
      Alert.alert('Error', 'Invalid doctor ID');
      router.back();
      return;
    }

    const fetchDoctor = async () => {
      try {
        setLoading(true);
        const doctorId = parseInt(uid);
        if (isNaN(doctorId)) {
          Alert.alert('Error', 'Invalid doctor ID format');
          router.back();
          return;
        }

        const response = await adminService.getDoctorDetails(doctorId);
        if (response.success && response.data) {
          if (response.data.status === 'pending') {
            setDoctor(response.data);
          } else {
            Alert.alert('Error', 'Doctor not found or already processed');
            router.back();
          }
        } else {
          Alert.alert('Error', 'Failed to load doctor information');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching doctor:', error);
        Alert.alert('Error', 'Failed to load doctor information');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [uid, user]);

  const handleApprove = async () => {
    if (!doctor) return;

    try {
      const response = await adminService.approveDoctor(doctor.id);
      if (response.success) {
      Alert.alert(
        'Success', 
        'Doctor approved successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      } else {
        Alert.alert('Error', response.message || 'Failed to approve doctor');
      }
    } catch (error) {
      console.error('Error approving doctor:', error);
      Alert.alert('Error', 'Failed to approve doctor. Please try again.');
    }
  };

  const handleReject = async () => {
    if (!doctor) return;

    try {
      const response = await adminService.rejectDoctor(doctor.id);
      if (response.success) {
      Alert.alert(
        'Success', 
        'Doctor rejected successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      } else {
        Alert.alert('Error', response.message || 'Failed to reject doctor');
      }
    } catch (error) {
      console.error('Error rejecting doctor:', error);
      Alert.alert('Error', 'Failed to reject doctor. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading doctor information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Doctor not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Doctor Verification</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Doctor Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              {doctor.profile_picture_url ? (
                <Image 
                  source={{ uri: doctor.profile_picture_url }} 
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatar}>
                  <FontAwesome name="user-md" size={40} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.doctorName}>{doctor.display_name || doctor.email}</Text>
                <Text style={styles.doctorEmail}>{doctor.email}</Text>
                <Text style={styles.doctorStatus}>Pending Verification</Text>
              </View>
            </View>
          </View>

          {/* Doctor Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Doctor Information</Text>
            
            <View style={styles.detailRow}>
              <FontAwesome name="envelope" size={16} color="#666" />
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{doctor.email}</Text>
            </View>

            <View style={styles.detailRow}>
              <FontAwesome name="user" size={16} color="#666" />
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{doctor.first_name} {doctor.last_name}</Text>
            </View>

            <View style={styles.detailRow}>
              <FontAwesome name="stethoscope" size={16} color="#666" />
              <Text style={styles.detailLabel}>Specialization:</Text>
              <Text style={styles.detailValue}>{doctor.specialization || 'Not specified'}</Text>
            </View>

            {doctor.sub_specialization && (
              <View style={styles.detailRow}>
                <FontAwesome name="plus-circle" size={16} color="#666" />
                <Text style={styles.detailLabel}>Sub-specialization:</Text>
                <Text style={styles.detailValue}>{doctor.sub_specialization}</Text>
              </View>
            )}

            {doctor.years_of_experience && (
              <View style={styles.detailRow}>
                <FontAwesome name="clock-o" size={16} color="#666" />
                <Text style={styles.detailLabel}>Experience:</Text>
                <Text style={styles.detailValue}>{doctor.years_of_experience} years</Text>
              </View>
            )}

            {doctor.date_of_birth && (
              <View style={styles.detailRow}>
                <FontAwesome name="calendar" size={16} color="#666" />
                <Text style={styles.detailLabel}>Date of Birth:</Text>
                <Text style={styles.detailValue}>{new Date(doctor.date_of_birth).toLocaleDateString()}</Text>
              </View>
            )}

            {doctor.gender && (
              <View style={styles.detailRow}>
                <FontAwesome name="venus-mars" size={16} color="#666" />
                <Text style={styles.detailLabel}>Gender:</Text>
                <Text style={styles.detailValue}>{doctor.gender}</Text>
              </View>
            )}

            {doctor.country && (
              <View style={styles.detailRow}>
                <FontAwesome name="globe" size={16} color="#666" />
                <Text style={styles.detailLabel}>Country:</Text>
                <Text style={styles.detailValue}>{doctor.country}</Text>
              </View>
            )}

            {doctor.city && (
              <View style={styles.detailRow}>
                <FontAwesome name="map-marker" size={16} color="#666" />
                <Text style={styles.detailLabel}>City:</Text>
                <Text style={styles.detailValue}>{doctor.city}</Text>
              </View>
            )}

            {(doctor.bio || doctor.professional_bio) && (
              <View style={styles.bioSection}>
                <Text style={styles.bioLabel}>Bio:</Text>
                <Text style={styles.bioText}>{doctor.bio || doctor.professional_bio}</Text>
              </View>
            )}

            {/* Document Images */}
            {(doctor.certificate_image || doctor.license_image || doctor.national_id) && (
              <View style={styles.documentsSection}>
                <Text style={styles.sectionTitle}>Documents</Text>
                
                {doctor.national_id && doctor.national_id_url && (
                  <View style={styles.documentItem}>
                    <Text style={styles.documentLabel}>National ID</Text>
                    <Image 
                      source={{ uri: doctor.national_id_url }} 
                      style={styles.documentImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {doctor.certificate_image && doctor.certificate_image_url && (
                  <View style={styles.documentItem}>
                    <Text style={styles.documentLabel}>Medical Degree</Text>
                    <Image 
                      source={{ uri: doctor.certificate_image_url }} 
                      style={styles.documentImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {doctor.license_image && doctor.license_image_url && (
                  <View style={styles.documentItem}>
                    <Text style={styles.documentLabel}>Medical License</Text>
                    <Image 
                      source={{ uri: doctor.license_image_url }} 
                      style={styles.documentImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionCard}>
            <Text style={styles.sectionTitle}>Verification Decision</Text>
            <Text style={styles.decisionText}>
              Review the doctor&apos;s information and make your decision
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]} 
                onPress={handleReject}
              >
                <FontAwesome name="times" size={20} color="#FFFFFF" />
                <Text style={styles.rejectButtonText}>Reject Application</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.approveButton]} 
                onPress={handleApprove}
              >
                <FontAwesome name="check" size={20} color="#FFFFFF" />
                <Text style={styles.approveButtonText}>Approve Application</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
    maxWidth: maxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  content: {
    flex: 1,
    paddingHorizontal: isWeb ? 40 : 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  doctorEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  doctorStatus: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  bioSection: {
    marginTop: 16,
  },
  bioLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  decisionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  documentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  documentItem: {
    flexDirection: 'column', // Changed to column for image preview
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  documentImage: {
    width: '100%', // Make image take full width of container
    height: 150, // Fixed height for image preview
    borderRadius: 4,
  },
  documentValue: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  documentUrl: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  documentHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginLeft: 8,
  },
}); 