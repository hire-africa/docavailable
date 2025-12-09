import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../app/services/apiService';
import { Icon } from '../components/Icon';
import ProfilePictureDisplay from '../components/ProfilePictureDisplay';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

export default function DoctorProfile() {
    const { user, userData, refreshUserData } = useAuth();
    const insets = useSafeAreaInsets();
    const [appointmentData, setAppointmentData] = useState<any[]>([]);
    const [weeklyData, setWeeklyData] = useState<any[]>([]);
    const [timeFrame, setTimeFrame] = useState<'monthly' | 'weekly'>('monthly');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAppointmentData();
    }, []);

    // Refresh user data when component mounts or when navigating back
    useEffect(() => {
        const refreshData = async () => {
            try {
                // console.log('DoctorProfile: Refreshing user data...');
                await refreshUserData();
            } catch (error) {
                console.error('DoctorProfile: Error refreshing user data:', error);
            }
        };
        
        refreshData();
    }, []);

    // Refresh when userData changes
    useEffect(() => {
        if (userData) {
            // console.log('DoctorProfile: User data updated:', userData.profile_picture_url);
        }
    }, [userData]);

    const fetchAppointmentData = async () => {
        try {
            setLoading(true);
            
            // Fetch monthly appointment data
            const monthlyResponse = await apiService.get('/appointments/statistics/monthly');
            if (monthlyResponse.success && Array.isArray(monthlyResponse.data)) {
                setAppointmentData(monthlyResponse.data);
            } else {
                setAppointmentData([]);
            }

            // Fetch weekly appointment data
            const weeklyResponse = await apiService.get('/appointments/statistics/weekly');
            if (weeklyResponse.success && Array.isArray(weeklyResponse.data)) {
                setWeeklyData(weeklyResponse.data);
            } else {
                setWeeklyData([]);
            }
        } catch (error) {
            console.error('Error fetching appointment data:', error);
            // Fallback to empty data if API fails
            setAppointmentData([]);
            setWeeklyData([]);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'Not specified';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'Invalid date';
        }
    };

    const getFullName = () => {
        if (userData?.first_name && userData?.last_name) {
            return `Dr. ${userData.first_name} ${userData.last_name}`;
        }
        return user.display_name || user.email?.split('@')[0] || 'Doctor';
    };

    const getStatusColor = () => {
        switch (user.status) {
            case 'approved':
                return '#4CAF50';
            case 'pending':
                return '#FF9800';
            case 'rejected':
                return '#F44336';
            default:
                return '#4CAF50';
        }
    };

    const getStatusText = () => {
        switch (user.status) {
            case 'approved':
                return 'Approved';
            case 'pending':
                return 'Pending Review';
            case 'rejected':
                return 'Rejected';
            default:
                return 'Unknown';
        }
    };

    const renderBarChart = (data: any[], isWeekly: boolean = false) => {
        if (!data || data.length === 0) {
            return (
                <View style={styles.noDataContainer}>
                    <Icon name="sort" size={48} color="#CCC" />
                    <Text style={styles.noDataText}>No appointment data available</Text>
                </View>
            );
        }

        const maxValue = Math.max(...data.map(item => item.appointments || 0));
        const labelKey = isWeekly ? 'week' : 'month';

        return (
            <View style={styles.chartContainer}>
                <View style={styles.chartBars}>
                    {data.map((item, index) => {
                        const height = maxValue > 0 ? ((item.appointments || 0) / maxValue) * 120 : 0;
                        return (
                            <View key={index} style={styles.barContainer}>
                                <View style={[styles.bar, { height }]} />
                                <Text style={styles.barLabel}>{item[labelKey]}</Text>
                                <Text style={styles.barValue}>{item.appointments || 0}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderStatsCards = (data: any[]) => {
        if (!data || data.length === 0) return null;

        const totalAppointments = data.reduce((sum, item) => sum + (item.appointments || 0), 0);
        const averageAppointments = totalAppointments / data.length;

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{totalAppointments}</Text>
                    <Text style={styles.statLabel}>Total Appointments</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{averageAppointments ? averageAppointments.toFixed(1) : '0.0'}</Text>
                    <Text style={styles.statLabel}>Average per Period</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top','bottom']}>
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
                <View style={[styles.content, { maxWidth }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Icon name="back" size={20} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Doctor Profile</Text>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => router.push('/edit-doctor-profile')}
                        >
                            <Icon name="edit" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <ProfilePictureDisplay
                            imageUri={user.profile_picture || null}
                            profilePictureUrl={user.profile_picture_url || null}
                            size={120}
                            name={getFullName()}
                        />
                        <View style={styles.profileInfo}>
                            <Text style={styles.name}>{getFullName()}</Text>
                            {Array.isArray((user as any).specializations) && (user as any).specializations.length > 0 ? (
                                <View style={styles.specializationChipsContainer}>
                                    {(user as any).specializations.map((spec: string, idx: number) => (
                                        <View key={`${spec}-${idx}`} style={styles.specializationChip}>
                                            <Text style={styles.specializationChipText}>{spec}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.specialization}>
                                    {user.specialization || 'General Practitioner'}
                                </Text>
                            )}
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                                <Text style={styles.statusText}>{getStatusText()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Contact Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Contact Information</Text>
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Icon name="user" size={16} color="#666" />
                                <Text style={styles.infoText}>{user.email}</Text>
                            </View>
                            {(user as any).phone && (
                                <View style={styles.infoItem}>
                                    <Icon name="phone" size={16} color="#666" />
                                    <Text style={styles.infoText}>{(user as any).phone}</Text>
                                </View>
                            )}
                            {user.country && (
                                <View style={styles.infoItem}>
                                    <Icon name="location" size={16} color="#666" />
                                    <Text style={styles.infoText}>
                                        {user.city && `${user.city}, `}{user.country}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Professional Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Professional Information</Text>
                        <View style={styles.infoGrid}>
                            {(user as any).license_number && (
                                <View style={styles.infoItem}>
                                    <Icon name="idCard" size={16} color="#666" />
                                    <Text style={styles.infoText}>License: {(user as any).license_number}</Text>
                                </View>
                            )}
                            {user.years_of_experience && (
                                <View style={styles.infoItem}>
                                    <Icon name="time" size={16} color="#666" />
                                    <Text style={styles.infoText}>
                                        {user.years_of_experience} years experience
                                    </Text>
                                </View>
                            )}
                            {(user as any).consultation_fee && (
                                <View style={styles.infoItem}>
                                    <Icon name="money" size={16} color="#666" />
                                    <Text style={styles.infoText}>
                                        ${(user as any).consultation_fee} per consultation
                                    </Text>
                                </View>
                            )}
                        </View>
                        {user.bio && (
                            <View style={styles.bioContainer}>
                                <Text style={styles.bioText}>{user.bio}</Text>
                            </View>
                        )}
                    </View>

                    {/* Statistics Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Consultation Statistics</Text>
                        
                        {/* Time Frame Toggle */}
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    timeFrame === 'monthly' && styles.toggleButtonActive
                                ]}
                                onPress={() => setTimeFrame('monthly')}
                            >
                                <Text style={[
                                    styles.toggleText,
                                    timeFrame === 'monthly' && styles.toggleTextActive
                                ]}>
                                    Monthly
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    timeFrame === 'weekly' && styles.toggleButtonActive
                                ]}
                                onPress={() => setTimeFrame('weekly')}
                            >
                                <Text style={[
                                    styles.toggleText,
                                    timeFrame === 'weekly' && styles.toggleTextActive
                                ]}>
                                    Weekly
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>Loading statistics...</Text>
                            </View>
                        ) : (
                            <>
                                {renderStatsCards(timeFrame === 'weekly' ? weeklyData : appointmentData)}
                                {renderBarChart(
                                    timeFrame === 'weekly' ? weeklyData : appointmentData,
                                    timeFrame === 'weekly'
                                )}
                            </>
                        )}
                    </View>

                    {/* Account Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account Information</Text>
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Icon name="calendar" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    Joined: {formatDate(user.created_at)}
                                </Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Icon name="time" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    Last updated: {formatDate(user.updated_at)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 20,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        marginTop: 20,
        paddingHorizontal: 10,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    editButton: {
        position: 'absolute',
        right: 0,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    profileInfo: {
        alignItems: 'center',
    },
    name: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
        textAlign: 'center',
    },
    specialization: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
        textAlign: 'center',
    },
    specializationChipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 10,
    },
    specializationChip: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        marginHorizontal: 4,
        marginVertical: 4,
    },
    specializationChipText: {
        color: '#2E7D32',
        fontSize: 14,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    section: {
        marginBottom: 25,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    infoGrid: {
        gap: 12,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoText: {
        fontSize: 16,
        color: '#666',
        flex: 1,
    },
    bioContainer: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    bioText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4,
        marginBottom: 20,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: '#4CAF50',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    toggleTextActive: {
        color: '#fff',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    chartContainer: {
        marginTop: 10,
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 160,
        paddingHorizontal: 10,
    },
    barContainer: {
        alignItems: 'center',
        flex: 1,
    },
    bar: {
        width: 20,
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        marginBottom: 8,
    },
    barLabel: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
    },
    barValue: {
        fontSize: 10,
        color: '#333',
        fontWeight: '600',
    },
    noDataContainer: {
        alignItems: 'center',
        padding: 40,
    },
    noDataText: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
    },
}); 