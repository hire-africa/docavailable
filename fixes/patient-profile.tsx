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

export default function PatientProfile() {
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
            return `${userData.first_name} ${userData.last_name}`;
        }
        return user.display_name || user.email?.split('@')[0] || 'Patient';
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
                        onPress={() => router.push('/edit-patient-profile')}
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
                        <Text style={styles.profileEmail}>{user.email}</Text>
                        <View style={styles.statusBadge}>
                            <SimpleIcons.FontAwesome.check />
                            <Text style={styles.statusText}>Active Patient</Text>
                        </View>
                    </View>
                </View>

                {/* Personal Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoCard}>
                            <SimpleIcons.FontAwesome.calendar />
                            <Text style={styles.infoLabel}>Date of Birth</Text>
                            <Text style={styles.infoValue}>{formatDate(user.date_of_birth)}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <SimpleIcons.FontAwesome.user />
                            <Text style={styles.infoLabel}>Gender</Text>
                            <Text style={styles.infoValue}>{user.gender || 'Not specified'}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <SimpleIcons.FontAwesome.mapMarker />
                            <Text style={styles.infoLabel}>Location</Text>
                            <Text style={styles.infoValue}>
                                {user.city && user.country ? `${user.city}, ${user.country}` : 'Not specified'}
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
                            <SimpleIcons.FontAwesome.clock />
                            <Text style={styles.infoLabel}>Member Since</Text>
                            <Text style={styles.infoValue}>
                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Appointment Analytics Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appointment Analytics</Text>
                    
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

                {/* Account Status Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Status</Text>
                    <View style={styles.statusCard}>
                        <View style={styles.statusRow}>
                            <SimpleIcons.FontAwesome.shield />
                            <Text style={styles.statusLabel}>Account Status</Text>
                            <Text style={styles.statusValue}>Active</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <SimpleIcons.FontAwesome.star />
                            <Text style={styles.statusLabel}>Rating</Text>
                            <Text style={styles.statusValue}>
                                {user.rating ? `${user.rating.toFixed(1)}/5.0` : 'No ratings yet'}
                            </Text>
                        </View>
                        <View style={styles.statusRow}>
                            <SimpleIcons.FontAwesome.users />
                            <Text style={styles.statusLabel}>Total Reviews</Text>
                            <Text style={styles.statusValue}>{user.total_ratings || 0}</Text>
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
    profileEmail: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 14,
        color: '#4CAF50',
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
    healthCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    healthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    healthTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
        marginLeft: 8,
    },
    healthText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    statusCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    statusLabel: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        marginLeft: 8,
    },
    statusValue: {
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
        backgroundColor: '#E0E0E0',
        borderRadius: 20,
        marginBottom: 20,
        paddingVertical: 5,
    },
    toggleButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 15,
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
        color: '#FFFFFF',
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
        height: 120,
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
        color: '#999',
        marginTop: 10,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    statCard: {
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
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
}); 