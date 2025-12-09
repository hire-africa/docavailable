import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SimpleIcons } from '../../components/SimpleIcons';
import { apiService } from '../app/services/apiService';
import ProfilePictureDisplay from '../components/ProfilePictureDisplay';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const maxWidth = isWeb ? 800 : width;
const isLargeScreen = width > 768;

export default function DoctorProfile() {
    const { user, userData } = useAuth();
    const [appointmentData, setAppointmentData] = useState<any[]>([]);
    const [weeklyData, setWeeklyData] = useState<any[]>([]);
    const [timeFrame, setTimeFrame] = useState<'monthly' | 'weekly'>('monthly');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAppointmentData();
    }, []);

    const fetchAppointmentData = async () => {
        try {
            setLoading(true);
            
            // Fetch monthly appointment data
            const monthlyResponse = await apiService.get('/appointments/statistics/monthly');
            if (monthlyResponse.success) {
                setAppointmentData(monthlyResponse.data || []);
            }

            // Fetch weekly appointment data
            const weeklyResponse = await apiService.get('/appointments/statistics/weekly');
            if (weeklyResponse.success) {
                setWeeklyData(weeklyResponse.data || []);
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
                return 'Active';
        }
    };

    const renderBarChart = (data: any[], isWeekly: boolean = false) => {
        if (!data || data.length === 0) {
            return (
                <View style={styles.noDataContainer}>
                    <SimpleIcons.FontAwesome.chart />
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
        if (!data || data.length === 0) {
            return (
                <View style={styles.noDataContainer}>
                    <SimpleIcons.FontAwesome.info />
                    <Text style={styles.noDataText}>No statistics available</Text>
                </View>
            );
        }

        const totalAppointments = data.reduce((sum, item) => sum + (item.appointments || 0), 0);
        const totalCompleted = data.reduce((sum, item) => sum + (item.completed || 0), 0);
        const totalCancelled = data.reduce((sum, item) => sum + (item.cancelled || 0), 0);
        const completionRate = totalAppointments > 0 ? ((totalCompleted / totalAppointments) * 100).toFixed(1) : '0';

        return (
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <SimpleIcons.FontAwesome.calendar />
                    <Text style={styles.statValue}>{totalAppointments}</Text>
                    <Text style={styles.statLabel}>Total Appointments</Text>
                </View>
                <View style={styles.statCard}>
                    <SimpleIcons.FontAwesome.check />
                    <Text style={styles.statValue}>{totalCompleted}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statCard}>
                                            <SimpleIcons.FontAwesome.times />
                    <Text style={styles.statValue}>{totalCancelled}</Text>
                    <Text style={styles.statLabel}>Cancelled</Text>
                </View>
                <View style={styles.statCard}>
                    <SimpleIcons.FontAwesome.percent />
                    <Text style={styles.statValue}>{completionRate}%</Text>
                    <Text style={styles.statLabel}>Completion Rate</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <SimpleIcons.FontAwesome.arrowLeft />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => router.push('/edit-doctor-profile')}
                    >
                        <SimpleIcons.FontAwesome.pencil />
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileImageContainer}>
                        <ProfilePictureDisplay
                            imageUri={user.profile_picture}
                            profilePictureUrl={user.profile_picture_url}
                            size={100}
                        />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{getFullName()}</Text>
                        <Text style={styles.profileSpecialization}>{user.specialization}</Text>
                        {user.sub_specialization && (
                            <Text style={styles.profileSubSpecialization}>{user.sub_specialization}</Text>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
                            <SimpleIcons.FontAwesome.check />
                            <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
                        </View>
                    </View>
                </View>

                {/* Professional Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Professional Information</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoCard}>
                            <SimpleIcons.FontAwesome.graduation />
                            <Text style={styles.infoLabel}>Specialization</Text>
                            <Text style={styles.infoValue}>{user.specialization || 'Not specified'}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <SimpleIcons.FontAwesome.clock />
                            <Text style={styles.infoLabel}>Experience</Text>
                            <Text style={styles.infoValue}>
                                {user.years_of_experience ? `${user.years_of_experience} years` : 'Not specified'}
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
                            <SimpleIcons.FontAwesome.mapMarker />
                            <Text style={styles.infoLabel}>Location</Text>
                            <Text style={styles.infoValue}>
                                {user.city && user.country ? `${user.city}, ${user.country}` : 'Not specified'}
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
                            <SimpleIcons.FontAwesome.calendar />
                            <Text style={styles.infoLabel}>Member Since</Text>
                            <Text style={styles.infoValue}>
                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Professional Bio Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Professional Bio</Text>
                    <View style={styles.bioCard}>
                        <View style={styles.bioHeader}>
                            <SimpleIcons.FontAwesome.user />
                            <Text style={styles.bioTitle}>About Me</Text>
                        </View>
                        <Text style={styles.bioText}>
                            {user.bio || 'No professional bio provided yet.'}
                        </Text>
                    </View>
                </View>

                {/* Appointment Statistics Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appointment Statistics</Text>
                    
                    {/* Time Frame Toggle */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity 
                            style={[styles.toggleButton, timeFrame === 'monthly' && styles.toggleButtonActive]}
                            onPress={() => setTimeFrame('monthly')}
                        >
                            <Text style={[styles.toggleText, timeFrame === 'monthly' && styles.toggleTextActive]}>
                                Monthly
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.toggleButton, timeFrame === 'weekly' && styles.toggleButtonActive]}
                            onPress={() => setTimeFrame('weekly')}
                        >
                            <Text style={[styles.toggleText, timeFrame === 'weekly' && styles.toggleTextActive]}>
                                Weekly
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Statistics Cards */}
                    {renderStatsCards(timeFrame === 'monthly' ? appointmentData : weeklyData)}

                    {/* Chart */}
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>
                            {timeFrame === 'monthly' ? 'Monthly Appointments' : 'Weekly Appointments'}
                        </Text>
                        {renderBarChart(timeFrame === 'monthly' ? appointmentData : weeklyData, timeFrame === 'weekly')}
                    </View>
                </View>

                {/* Performance Metrics Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Performance Metrics</Text>
                    <View style={styles.metricsCard}>
                        <View style={styles.metricRow}>
                            <SimpleIcons.FontAwesome.star />
                            <Text style={styles.metricLabel}>Rating</Text>
                            <Text style={styles.metricValue}>
                                {user.rating ? `${user.rating.toFixed(1)}/5.0` : 'No ratings yet'}
                            </Text>
                        </View>
                        <View style={styles.metricRow}>
                            <SimpleIcons.FontAwesome.users />
                            <Text style={styles.metricLabel}>Total Reviews</Text>
                            <Text style={styles.metricValue}>{user.total_ratings || 0}</Text>
                        </View>
                        <View style={styles.metricRow}>
                            <SimpleIcons.FontAwesome.calendar />
                            <Text style={styles.metricLabel}>Appointments</Text>
                            <Text style={styles.metricValue}>View Dashboard</Text>
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
        backgroundColor: '#F8F9FA',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#222',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2E9',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        margin: 20,
        padding: 24,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    profileInfo: {
        alignItems: 'center',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 4,
    },
    profileSpecialization: {
        fontSize: 18,
        color: '#4CAF50',
        fontWeight: '600',
        marginBottom: 2,
    },
    profileSubSpecialization: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    section: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 16,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        width: '48%',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        marginBottom: 4,
        textAlign: 'center',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#222',
        textAlign: 'center',
    },
    bioCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    bioHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    bioTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
        marginLeft: 8,
    },
    bioText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    credentialsCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    credentialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    credentialLabel: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        marginLeft: 8,
    },
    credentialValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#222',
    },
    metricsCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    metricLabel: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        marginLeft: 8,
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#222',
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionCard: {
        backgroundColor: '#FFFFFF',
        width: '48%',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#222',
        marginTop: 8,
        textAlign: 'center',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        backgroundColor: '#E0F2E9',
        padding: 8,
        borderRadius: 20,
    },
    toggleButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 15,
    },
    toggleButtonActive: {
        backgroundColor: '#4CAF50',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },
    toggleTextActive: {
        color: '#FFFFFF',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        width: '48%',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#222',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    chartCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 16,
        textAlign: 'center',
    },
    chartContainer: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        width: '100%',
        height: '100%',
    },
    barContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 40,
    },
    bar: {
        width: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 5,
    },
    barLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
    },
    barValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#222',
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    noDataText: {
        fontSize: 16,
        color: '#888',
        marginTop: 10,
    },
}); 