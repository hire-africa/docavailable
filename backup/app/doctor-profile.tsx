import { SimpleIcons } from '../components/SimpleIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

// Extended doctor data interface for complete profile
interface CompleteDoctorData {
    uid: string;
    email: string;
    displayName: string;
    userType: 'patient' | 'doctor' | 'admin';
    firstName?: string;
    lastName?: string;
    specialization?: string;
    licenseNumber?: string;
    experience?: number;
    education?: string;
    certifications?: string[];
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    bio?: string;
    languages?: string[];
    consultationFee?: number;
    availability?: {
        monday?: { start: string; end: string };
        tuesday?: { start: string; end: string };
        wednesday?: { start: string; end: string };
        thursday?: { start: string; end: string };
        friday?: { start: string; end: string };
        saturday?: { start: string; end: string };
        sunday?: { start: string; end: string };
    };
    rating?: number;
    totalReviews?: number;
    status?: string;
    createdAt: Date;
    updatedAt: Date;
}

export default function DoctorProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [doctorData, setDoctorData] = useState<CompleteDoctorData | null>(null);
    const [earnings, setEarnings] = useState(150000); // Mock earnings - same as withdrawals page

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/');
        }
    }, [user, loading]);

    // Fetch complete doctor data from Firestore
    useEffect(() => {
        const fetchDoctorData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                console.log('DoctorProfile: Fetching doctor data for:', user.uid);
                const completeData = await firestoreService.getUserById(user.uid) as CompleteDoctorData;
                console.log('DoctorProfile: Doctor data fetched:', completeData);
                setDoctorData(completeData);
            } catch (error) {
                console.error('DoctorProfile: Error fetching doctor data:', error);
                Alert.alert('Error', 'Failed to load profile data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchDoctorData();
    }, [user]);

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Not provided';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const formatPhone = (phone: string) => {
        if (!phone) return 'Not provided';
        // Remove all non-digits and format
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
        }
        return phone;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-MW', {
            style: 'currency',
            currency: 'MWK'
        }).format(amount);
    };

    const getAvailabilityText = () => {
        if (!doctorData?.availability) return 'Not specified';
        
        const days = Object.keys(doctorData.availability).filter(day => 
            doctorData.availability![day as keyof typeof doctorData.availability]
        );
        
        if (days.length === 0) return 'Not specified';
        if (days.length === 7) return 'Available daily';
        if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) {
            return 'Weekdays only';
        }
        return `${days.length} days per week`;
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'approved': return '#4CAF50';
            case 'pending': return '#FF9800';
            case 'rejected': return '#F44336';
            default: return '#666';
        }
    };

    const getStatusText = (status?: string) => {
        switch (status) {
            case 'approved': return 'Approved';
            case 'pending': return 'Pending Approval';
            case 'rejected': return 'Rejected';
            default: return 'Unknown';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.mainContent}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4CAF50" />
                        <Text style={styles.loadingText}>Loading profile...</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (!user) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContent}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <SimpleIcons.FontAwesome.arrow-left />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.balanceContainer} onPress={() => router.push('/doctor-withdrawals')}>
                            <SimpleIcons.FontAwesome.money />
                            <Text style={styles.balanceText}>{formatCurrency(earnings)}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <SimpleIcons.FontAwesome.user-md />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {doctorData?.firstName && doctorData?.lastName 
                                    ? `Dr. ${doctorData.firstName} ${doctorData.lastName}`
                                    : doctorData?.displayName || user?.displayName || 'Doctor'
                                }
                            </Text>
                            <Text style={styles.profileEmail}>{doctorData?.email || user?.email}</Text>
                            <Text style={styles.profileType}>Doctor</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(doctorData?.status) }]}>
                                <Text style={styles.statusText}>{getStatusText(doctorData?.status)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Professional Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <SimpleIcons.FontAwesome.stethoscope />
                            <Text style={styles.sectionTitle}>Professional Information</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Specialization</Text>
                                <Text style={styles.infoValue}>{doctorData?.specialization || 'Not specified'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>License Number</Text>
                                <Text style={styles.infoValue}>{doctorData?.licenseNumber || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Years of Experience</Text>
                                <Text style={styles.infoValue}>{doctorData?.experience || 'Not specified'} years</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Consultation Fee</Text>
                                <Text style={styles.infoValue}>
                                    {doctorData?.consultationFee ? formatCurrency(doctorData.consultationFee) : 'Not specified'}
                                </Text>
                            </View>
                        </View>

                        {doctorData?.education && (
                            <View style={styles.textContainer}>
                                <Text style={styles.infoLabel}>Education</Text>
                                <Text style={styles.infoValue}>{doctorData.education}</Text>
                            </View>
                        )}

                        {doctorData?.bio && (
                            <View style={styles.textContainer}>
                                <Text style={styles.infoLabel}>Bio</Text>
                                <Text style={styles.infoValue}>{doctorData.bio}</Text>
                            </View>
                        )}

                        {doctorData?.certifications && doctorData.certifications.length > 0 && (
                            <View style={styles.textContainer}>
                                <Text style={styles.infoLabel}>Certifications</Text>
                                <Text style={styles.infoValue}>{doctorData.certifications.join(', ')}</Text>
                            </View>
                        )}

                        {doctorData?.languages && doctorData.languages.length > 0 && (
                            <View style={styles.textContainer}>
                                <Text style={styles.infoLabel}>Languages</Text>
                                <Text style={styles.infoValue}>{doctorData.languages.join(', ')}</Text>
                            </View>
                        )}
                    </View>

                    {/* Contact Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <SimpleIcons.FontAwesome.phone />
                            <Text style={styles.sectionTitle}>Contact Information</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Phone Number</Text>
                                <Text style={styles.infoValue}>{formatPhone(doctorData?.phoneNumber || '')}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{doctorData?.email || user?.email}</Text>
                            </View>
                        </View>

                        {(doctorData?.address || doctorData?.city || doctorData?.state || doctorData?.zipCode) && (
                            <View style={styles.addressContainer}>
                                <Text style={styles.infoLabel}>Practice Address</Text>
                                <Text style={styles.infoValue}>
                                    {[
                                        doctorData?.address,
                                        doctorData?.city,
                                        doctorData?.state,
                                        doctorData?.zipCode
                                    ].filter(Boolean).join(', ') || 'Not provided'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Availability */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <SimpleIcons.FontAwesome.calendar />
                            <Text style={styles.sectionTitle}>Availability</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Schedule</Text>
                                <Text style={styles.infoValue}>{getAvailabilityText()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Performance */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <SimpleIcons.FontAwesome.star />
                            <Text style={styles.sectionTitle}>Performance</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Rating</Text>
                                <Text style={styles.infoValue}>
                                    {doctorData?.rating ? `${doctorData.rating}/5` : 'No ratings yet'}
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Total Reviews</Text>
                                <Text style={styles.infoValue}>{doctorData?.totalReviews || 0}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Account Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <SimpleIcons.FontAwesome.info-circle />
                            <Text style={styles.sectionTitle}>Account Information</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Account Type</Text>
                                <Text style={styles.infoValue}>Doctor</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Member Since</Text>
                                <Text style={styles.infoValue}>
                                    {doctorData?.createdAt ? formatDate(doctorData.createdAt.toString()) : 'Not available'}
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Last Updated</Text>
                                <Text style={styles.infoValue}>
                                    {doctorData?.updatedAt ? formatDate(doctorData.updatedAt.toString()) : 'Not available'}
                                </Text>
                            </View>
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 16,
        color: '#4CAF50',
        marginLeft: 8,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F0F8FF',
    },
    balanceText: {
        fontSize: 14,
        color: '#4CAF50',
        marginLeft: 8,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#4CAF50',
        marginTop: 16,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0F8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 16,
        color: '#666',
        marginBottom: 4,
    },
    profileType: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 12,
    },
    infoGrid: {
        gap: 16,
    },
    infoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        color: '#000',
        flex: 2,
        textAlign: 'right',
    },
    addressContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    textContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
}); 