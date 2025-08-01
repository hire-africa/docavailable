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

// Extended user data interface for complete profile
interface CompleteUserData {
    uid: string;
    email: string;
    displayName: string;
    userType: 'patient' | 'doctor' | 'admin';
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    healthHistory?: string;
    allergies?: string;
    medications?: string;
    bloodType?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
    preferredLanguage?: string;
    notificationPreferences?: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
    status?: string;
}

export default function PatientProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<CompleteUserData | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/');
        }
    }, [user, loading]);

    // Fetch complete user data from Firestore
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                console.log('PatientProfile: Fetching user data for:', user.uid);
                const completeData = await firestoreService.getUserById(user.uid) as CompleteUserData;
                console.log('PatientProfile: User data fetched:', completeData);
                setUserData(completeData);
            } catch (error) {
                console.error('PatientProfile: Error fetching user data:', error);
                Alert.alert('Error', 'Failed to load profile data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
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

    const getNotificationStatus = () => {
        if (!userData?.notificationPreferences) return 'Not configured';
        const prefs = userData.notificationPreferences;
        const active = [];
        if (prefs.email) active.push('Email');
        if (prefs.sms) active.push('SMS');
        if (prefs.push) active.push('Push');
        return active.length > 0 ? active.join(', ') : 'None';
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
                    <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit-patient-profile')}>
                        <SimpleIcons.FontAwesome.edit />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <SimpleIcons.FontAwesome.user />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {userData?.firstName && userData?.lastName 
                                    ? `${userData.firstName} ${userData.lastName}`
                                    : userData?.displayName || user?.displayName || 'Patient'
                                }
                            </Text>
                            <Text style={styles.profileEmail}>{userData?.email || user?.email}</Text>
                            <Text style={styles.profileType}>Patient</Text>
                        </View>
                    </View>

                    {/* Basic Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <SimpleIcons.FontAwesome.user />
                            <Text style={styles.sectionTitle}>Basic Information</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>First Name</Text>
                                <Text style={styles.infoValue}>{userData?.firstName || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Last Name</Text>
                                <Text style={styles.infoValue}>{userData?.lastName || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Date of Birth</Text>
                                <Text style={styles.infoValue}>{formatDate(userData?.dateOfBirth || '')}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Gender</Text>
                                <Text style={styles.infoValue}>{userData?.gender || 'Not specified'}</Text>
                            </View>
                        </View>
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
                                <Text style={styles.infoValue}>{formatPhone(userData?.phoneNumber || '')}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{userData?.email || user?.email}</Text>
                            </View>
                        </View>

                        {(userData?.address || userData?.city || userData?.state || userData?.zipCode) && (
                            <View style={styles.addressContainer}>
                                <Text style={styles.infoLabel}>Address</Text>
                                <Text style={styles.infoValue}>
                                    {[
                                        userData?.address,
                                        userData?.city,
                                        userData?.state,
                                        userData?.zipCode
                                    ].filter(Boolean).join(', ') || 'Not provided'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Health Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <SimpleIcons.FontAwesome.heartbeat />
                            <Text style={styles.sectionTitle}>Health Information</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Blood Type</Text>
                                <Text style={styles.infoValue}>{userData?.bloodType || 'Not specified'}</Text>
                            </View>
                        </View>

                        {userData?.healthHistory && (
                            <View style={styles.textContainer}>
                                <Text style={styles.infoLabel}>Health History</Text>
                                <Text style={styles.infoValue}>{userData.healthHistory}</Text>
                            </View>
                        )}

                        {userData?.allergies && (
                            <View style={styles.textContainer}>
                                <Text style={styles.infoLabel}>Allergies</Text>
                                <Text style={styles.infoValue}>{userData.allergies}</Text>
                            </View>
                        )}

                        {userData?.medications && (
                            <View style={styles.textContainer}>
                                <Text style={styles.infoLabel}>Current Medications</Text>
                                <Text style={styles.infoValue}>{userData.medications}</Text>
                            </View>
                        )}
                    </View>

                    {/* Emergency Contact */}
                    {(userData?.emergencyContactName || userData?.emergencyContactPhone) && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <SimpleIcons.FontAwesome.exclamation-triangle />
                                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                            </View>
                            
                            <View style={styles.infoGrid}>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Contact Name</Text>
                                    <Text style={styles.infoValue}>{userData.emergencyContactName || 'Not provided'}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Contact Phone</Text>
                                    <Text style={styles.infoValue}>{formatPhone(userData.emergencyContactPhone || '')}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Relationship</Text>
                                    <Text style={styles.infoValue}>{userData.emergencyContactRelationship || 'Not specified'}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Preferences */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <SimpleIcons.FontAwesome.cog />
                            <Text style={styles.sectionTitle}>Preferences</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Preferred Language</Text>
                                <Text style={styles.infoValue}>{userData?.preferredLanguage || 'Not specified'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Notifications</Text>
                                <Text style={styles.infoValue}>{getNotificationStatus()}</Text>
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
                                <Text style={styles.infoValue}>Patient</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Member Since</Text>
                                <Text style={styles.infoValue}>
                                    {userData?.createdAt ? formatDate(userData.createdAt.toString()) : 'Not available'}
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Last Updated</Text>
                                <Text style={styles.infoValue}>
                                    {userData?.updatedAt ? formatDate(userData.updatedAt.toString()) : 'Not available'}
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
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editButtonText: {
        fontSize: 16,
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