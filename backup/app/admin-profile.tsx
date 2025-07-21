import { FontAwesome } from '@expo/vector-icons';
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

// Extended admin data interface for complete profile
interface CompleteAdminData {
    uid: string;
    email: string;
    displayName: string;
    userType: 'patient' | 'doctor' | 'admin';
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    role?: string;
    permissions?: string[];
    createdAt: Date;
    updatedAt: Date;
    status?: string;
}

export default function AdminProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [adminData, setAdminData] = useState<CompleteAdminData | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/');
        }
    }, [user, loading]);

    // Fetch complete admin data from Firestore
    useEffect(() => {
        const fetchAdminData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                console.log('AdminProfile: Fetching admin data for:', user.uid);
                const completeData = await firestoreService.getUserById(user.uid) as CompleteAdminData;
                console.log('AdminProfile: Admin data fetched:', completeData);
                setAdminData(completeData);
            } catch (error) {
                console.error('AdminProfile: Error fetching admin data:', error);
                Alert.alert('Error', 'Failed to load profile data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
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

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'active': return '#4CAF50';
            case 'inactive': return '#F44336';
            default: return '#666';
        }
    };

    const getStatusText = (status?: string) => {
        switch (status) {
            case 'active': return 'Active';
            case 'inactive': return 'Inactive';
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
                        <FontAwesome name="arrow-left" size={20} color="#4CAF50" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile</Text>
                    <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit-admin-profile')}>
                        <FontAwesome name="edit" size={20} color="#4CAF50" />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <FontAwesome name="user-secret" size={60} color="#4CAF50" />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {adminData?.firstName && adminData?.lastName 
                                    ? `${adminData.firstName} ${adminData.lastName}`
                                    : adminData?.displayName || user?.displayName || 'Admin'
                                }
                            </Text>
                            <Text style={styles.profileEmail}>{adminData?.email || user?.email}</Text>
                            <Text style={styles.profileType}>Administrator</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(adminData?.status) }]}>
                                <Text style={styles.statusText}>{getStatusText(adminData?.status)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Basic Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <FontAwesome name="user" size={20} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>Basic Information</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>First Name</Text>
                                <Text style={styles.infoValue}>{adminData?.firstName || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Last Name</Text>
                                <Text style={styles.infoValue}>{adminData?.lastName || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Role</Text>
                                <Text style={styles.infoValue}>{adminData?.role || 'System Administrator'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Contact Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <FontAwesome name="phone" size={20} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>Contact Information</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Phone Number</Text>
                                <Text style={styles.infoValue}>{formatPhone(adminData?.phoneNumber || '')}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{adminData?.email || user?.email}</Text>
                            </View>
                        </View>

                        {(adminData?.address || adminData?.city || adminData?.state || adminData?.zipCode) && (
                            <View style={styles.addressContainer}>
                                <Text style={styles.infoLabel}>Address</Text>
                                <Text style={styles.infoValue}>
                                    {[
                                        adminData?.address,
                                        adminData?.city,
                                        adminData?.state,
                                        adminData?.zipCode
                                    ].filter(Boolean).join(', ') || 'Not provided'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Permissions */}
                    {adminData?.permissions && adminData.permissions.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <FontAwesome name="shield" size={20} color="#4CAF50" />
                                <Text style={styles.sectionTitle}>Permissions</Text>
                            </View>
                            
                            <View style={styles.permissionsContainer}>
                                {adminData.permissions.map((permission, index) => (
                                    <View key={index} style={styles.permissionItem}>
                                        <FontAwesome name="check-circle" size={16} color="#4CAF50" />
                                        <Text style={styles.permissionText}>{permission}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Account Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <FontAwesome name="info-circle" size={20} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>Account Information</Text>
                        </View>
                        
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Account Type</Text>
                                <Text style={styles.infoValue}>Administrator</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Member Since</Text>
                                <Text style={styles.infoValue}>
                                    {adminData?.createdAt ? formatDate(adminData.createdAt.toString()) : 'Not available'}
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Last Updated</Text>
                                <Text style={styles.infoValue}>
                                    {adminData?.updatedAt ? formatDate(adminData.updatedAt.toString()) : 'Not available'}
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
    permissionsContainer: {
        gap: 12,
    },
    permissionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    permissionText: {
        fontSize: 14,
        color: '#000',
        marginLeft: 12,
    },
}); 